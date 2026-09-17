import "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AiProvider {
  name: string;
  apiKey: string | null;
  endpoint: string;
  model: string;
  headers: (apiKey: string) => Record<string, string>;
}

type Row = Record<string, unknown>;

function getProviders(): AiProvider[] {
  return [
    {
      name: "xAI",
      apiKey: null,
      endpoint: "https://api.x.ai/v1/chat/completions",
      model: "grok-4.6",
      headers: (key: string) => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      }),
    },
    {
      name: "OpenRouter",
      apiKey: null,
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: "openai/gpt-4o-mini",
      headers: (key: string) => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://zifek.fr",
        "X-Title": "Zifek Mon Assistant",
      }),
    },
    {
      name: "OpenAI",
      apiKey: null,
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
      headers: (key: string) => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      }),
    },
    {
      name: "Ollama",
      apiKey: null,
      endpoint: "",
      model: "llama3.2",
      headers: () => ({ "Content-Type": "application/json" }),
    },
  ];
}

function extractText(data: Row): string | null {
  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  if (choices && choices.length > 0 && choices[0].message?.content) {
    return choices[0].message.content;
  }
  const message = data.message as { content?: string } | undefined;
  if (message?.content) return message.content;
  return null;
}

function stripFences(text: string): string {
  let c = (text || "").trim();
  const fence = c.match(/^```[a-zA-Z]*\s*\n?([\s\S]*?)\n?```$/);
  if (fence) return fence[1].trim();
  c = c.replace(/^```[a-zA-Z]*\s*\n?/, "").replace(/\n?```$/, "");
  return c.trim();
}

function num(v: unknown): string {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return isNaN(n) ? "0" : n.toFixed(2);
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gatherShopContext(supabase: any, idcommerce: number): Promise<string> {
  const parts: string[] = [];

  try {
    const { data } = await supabase
      .from("users")
      .select("name, nomcommerce, user_name, telephone, Ville, Pays, description")
      .eq("id", idcommerce)
      .maybeSingle();
    const shop = data as Row | null;
    if (shop) {
      parts.push(
        `Boutique : ${shop.nomcommerce || shop.name} (${shop.user_name}). Ville: ${shop.Ville || "—"}. Téléphone: ${shop.telephone || "—"}.`,
      );
    }
  } catch { /* ignore */ }

  try {
    const { data } = await supabase
      .from("product_items")
      .select("id, name, price, stock, status, discount_enabled, discount_price, category_id")
      .eq("idcommerce", idcommerce)
      .order("id", { ascending: false })
      .limit(100);
    const products = (data || []) as Row[];
    if (products.length > 0) {
      const total = products.length;
      const active = products.filter((p) => p.status === "active").length;
      const lowStock = products.filter((p) => (Number(p.stock ?? 0)) <= 3);
      const top = [...products].sort((a, b) => Number(b.stock ?? 0) - Number(a.stock ?? 0)).slice(0, 5);
      parts.push(
        `Produits : ${total} au total (${active} actifs). Stock bas (<=3) : ${lowStock.length}. ` +
        `Top produits (stock) : ${top.map((p) => `${p.name} (stock ${p.stock ?? 0})`).join(", ") || "aucun"}.`,
      );
      if (lowStock.length > 0) {
        parts.push(`Produits à réapprovisionner : ${lowStock.map((p) => `${p.name} (stock ${p.stock ?? 0})`).join(", ")}.`);
      }
    } else {
      parts.push("Produits : aucun produit pour le moment.");
    }
  } catch { parts.push("Produits : données indisponibles."); }

  try {
    const { data } = await supabase
      .from("commande")
      .select("id, titre, sp, monaie, date_time, statut_com_vendeur, totalttc, totalht, quantite")
      .eq("owner", idcommerce)
      .order("id", { ascending: false })
      .limit(100);
    const orders = (data || []) as Row[];
    if (orders.length > 0) {
      let revenue = 0;
      for (const o of orders) {
        const v = parseFloat(str(o.totalttc ?? o.sp ?? "0"));
        if (!isNaN(v)) revenue += v;
      }
      const recent = orders.slice(0, 5);
      parts.push(
        `Commandes : ${orders.length} au total. Chiffre d'affaires cumulé ≈ ${revenue.toFixed(2)} ${orders[0]?.monaie || "MAD"}. ` +
        `Dernières commandes : ${recent.map((o) => `${o.titre || o.id} (${num(o.sp)} ${o.monaie || ""})`.trim()).join(", ") || "aucune"}.`,
      );
    } else {
      parts.push("Commandes : aucune commande enregistrée.");
    }
  } catch { parts.push("Commandes : données indisponibles."); }

  try {
    const { data } = await supabase.from("mesclients").select("id").eq("idshop", idcommerce);
    const clients = (data || []) as Row[];
    parts.push(`Clients : ${clients.length} client(s) enregistré(s).`);
  } catch { parts.push("Clients : données indisponibles."); }

  try {
    const { data } = await supabase
      .from("transactions")
      .select("id, montant, date, provenance")
      .eq("id_receiver", idcommerce)
      .order("id", { ascending: false })
      .limit(50);
    const tx = (data || []) as Row[];
    if (tx.length > 0) {
      let sum = 0;
      for (const t of tx) {
        const v = parseFloat(str(t.montant ?? "0"));
        if (!isNaN(v)) sum += v;
      }
      parts.push(`Transactions reçues : ${tx.length}, total ≈ ${sum.toFixed(2)}.`);
    } else {
      parts.push("Transactions : aucune transaction reçue.");
    }
  } catch { parts.push("Transactions : données indisponibles."); }

  try {
    const { data } = await supabase.from("visiteboutique").select("id, date").eq("boutique_id", idcommerce);
    parts.push(`Visites boutique : ${(data || []).length} au total.`);
  } catch { /* ignore */ }

  try {
    const { data } = await supabase.from("visitesiteweb").select("id, date").eq("boutique_id", idcommerce);
    parts.push(`Visites site web : ${(data || []).length} au total.`);
  } catch { /* ignore */ }

  return parts.join("\n");
}

const PROJET_STATUS: Record<number, string> = { 1: "En cours", 2: "Terminé", 3: "Annulé", 4: "En attente" };
const TASK_STATUS: Record<string, string> = { a_faire: "À faire", en_cours: "En cours", en_revision: "En révision", termine: "Terminé" };
const APPT_STATUS: Record<string, string> = { confirmed: "Confirmé", pending: "En attente", cancelled: "Annulé", completed: "Terminé" };
const MEETING_STATUS: Record<string, string> = { scheduled: "Programmée", active: "En cours", ended: "Terminée", cancelled: "Annulée" };

async function gatherInstalledApps(supabase: any, userId: number): Promise<{ pages: Set<string>; labels: string[] }> {
  try {
    const { data } = await supabase
      .from("appvendeur")
      .select("nompage, nomapp, status")
      .eq("idcommerce", userId);
    const rows = (data || []) as Row[];
    const active = rows.filter((r) => Number(r.status) === 1);
    return {
      pages: new Set(active.map((r) => str(r.nompage).toLowerCase()).filter(Boolean)),
      labels: active.map((r) => str(r.nomapp || r.nompage)).filter(Boolean),
    };
  } catch {
    return { pages: new Set<string>(), labels: [] };
  }
}

async function gatherAppContext(supabase: any, userId: number, pages: Set<string>): Promise<string> {
  const parts: string[] = [];

  // GESTIONPRO : projets + tâches
  if (pages.has("gestionpro")) {
    try {
      const { data: projets } = await supabase
        .from("projet")
        .select("id, titre, status, datedebut, datedefin")
        .eq("owner", userId)
        .order("id", { ascending: false })
        .limit(50);
      const ps = (projets || []) as Row[];
      if (ps.length > 0) {
        const counts: Record<string, number> = {};
        ps.forEach((p) => {
          const label = PROJET_STATUS[Number(p.status)] || "Inconnu";
          counts[label] = (counts[label] || 0) + 1;
        });
        const breakdown = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ");
        const recent = ps.slice(0, 8).map((p) => `${p.titre} (${PROJET_STATUS[Number(p.status)] || "Inconnu"})`).join(", ");
        parts.push(`Projets (GESTIONPRO) : ${ps.length} au total — ${breakdown}. Derniers projets : ${recent || "—"}.`);
      } else {
        parts.push("Projets (GESTIONPRO) : aucun projet pour le moment.");
      }

      const { data: taches } = await supabase
        .from("projettache")
        .select("id, titre, statut, priorite")
        .eq("owner", userId)
        .order("id", { ascending: false })
        .limit(100);
      const ts = (taches || []) as Row[];
      if (ts.length > 0) {
        const tcounts: Record<string, number> = {};
        ts.forEach((t) => {
          const label = TASK_STATUS[str(t.statut)] || str(t.statut) || "Inconnu";
          tcounts[label] = (tcounts[label] || 0) + 1;
        });
        const tbreakdown = Object.entries(tcounts).map(([k, v]) => `${v} ${k}`).join(", ");
        parts.push(`Tâches (GESTIONPRO) : ${ts.length} au total — ${tbreakdown}.`);
      } else {
        parts.push("Tâches (GESTIONPRO) : aucune tâche.");
      }
    } catch { parts.push("Projets (GESTIONPRO) : données indisponibles."); }
  }

  // SERVICE CLIENT
  if (pages.has("customer-support")) {
    try {
      const { data } = await supabase
        .from("support_tickets")
        .select("id, subject, status")
        .eq("idcommerce", userId)
        .order("id", { ascending: false })
        .limit(100);
      const tk = (data || []) as Row[];
      if (tk.length > 0) {
        const open = tk.filter((t) => ["new", "open", "pending", "en_attente", "en_cours"].includes(str(t.status).toLowerCase())).length;
        parts.push(`Tickets support : ${tk.length} au total (dont ${open} ouverts ou en attente).`);
      } else {
        parts.push("Tickets support : aucun ticket.");
      }
    } catch { parts.push("Tickets support : données indisponibles."); }
  }

  // FORMULAIRES
  if (pages.has("forms")) {
    try {
      const { data } = await supabase
        .from("forms")
        .select("id, title")
        .eq("commerceid", userId)
        .order("id", { ascending: false })
        .limit(50);
      const fms = (data || []) as Row[];
      if (fms.length > 0) {
        parts.push(`Formulaires : ${fms.length} créé(s) — ${fms.slice(0, 6).map((f) => f.title).join(", ")}.`);
      } else {
        parts.push("Formulaires : aucun formulaire.");
      }
    } catch { parts.push("Formulaires : données indisponibles."); }
  }

  // FILE MANAGER / DOCUMENTS
  if (pages.has("file-manager")) {
    try {
      const { data } = await supabase
        .from("documents")
        .select("id, name")
        .eq("user_id", String(userId))
        .order("id", { ascending: false })
        .limit(100);
      const docs = (data || []) as Row[];
      parts.push(`Documents (File Manager) : ${docs.length} fichier(s).`);
    } catch { parts.push("Documents : données indisponibles."); }
  }

  // FIDÉLITÉ
  if (pages.has("fidelite-recompenses") || pages.has("ma-fidelite")) {
    try {
      const { data } = await supabase
        .from("pointfidelite")
        .select("id, nombre, typepoint")
        .eq("idcommerce", userId)
        .limit(200);
      const pts = (data || []) as Row[];
      parts.push(`Fidélité : ${pts.length} opération(s) de points enregistrée(s).`);
    } catch { parts.push("Fidélité : données indisponibles."); }
  }

  // ZCALENDAR : services + rendez-vous
  if (pages.has("zcalendar")) {
    try {
      const { data: services } = await supabase
        .from("booking_services")
        .select("id, service_name, duration")
        .eq("owner", userId)
        .eq("statut", 1)
        .order("id", { ascending: true });
      const svcs = (services || []) as Row[];
      const serviceIds = svcs.map((s) => Number(s.id)).filter((n) => !isNaN(n));

      if (svcs.length === 0) {
        parts.push("Rendez-vous (ZCalendar) : aucun service de réservation actif.");
      } else {
        let appts: Row[] = [];
        if (serviceIds.length > 0) {
          const { data } = await supabase
            .from("booking_appointments")
            .select("id, service_id, fullname, email, phone, date, time, status")
            .in("service_id", serviceIds)
            .order("date", { ascending: true })
            .limit(200);
          appts = (data || []) as Row[];
        }
        if (appts.length > 0) {
          const acounts: Record<string, number> = {};
          appts.forEach((a) => {
            const label = APPT_STATUS[str(a.status)] || str(a.status) || "Inconnu";
            acounts[label] = (acounts[label] || 0) + 1;
          });
          const abreakdown = Object.entries(acounts).map(([k, v]) => `${v} ${k}`).join(", ");
          const today = new Date().toISOString().split("T")[0];
          const upcoming = appts
            .filter((a) => str(a.date) >= today && str(a.status) !== "cancelled")
            .slice(0, 8)
            .map((a) => `${a.fullname}${a.email ? ` (${a.email})` : ""} le ${str(a.date)} à ${str(a.time).slice(0, 5)}`)
            .join(", ");
          parts.push(
            `Rendez-vous (ZCalendar) : ${appts.length} au total — ${abreakdown}. ` +
            `Prochains rendez-vous : ${upcoming || "aucun"}.`,
          );
        } else {
          parts.push(`Rendez-vous (ZCalendar) : ${svcs.length} service(s) actif(s), mais aucun rendez-vous réservé pour le moment.`);
        }
      }
    } catch { parts.push("Rendez-vous (ZCalendar) : données indisponibles."); }
  }

  // ZCALL : réunions / visioconférences
  if (pages.has("zcall")) {
    try {
      const { data } = await supabase
        .from("zcall_meetings")
        .select("id, title, scheduled_at, status")
        .eq("user_id", userId)
        .order("id", { ascending: false })
        .limit(200);
      const meetings = (data || []) as Row[];
      if (meetings.length > 0) {
        const mcounts: Record<string, number> = {};
        meetings.forEach((m) => {
          const label = MEETING_STATUS[str(m.status)] || str(m.status) || "Inconnu";
          mcounts[label] = (mcounts[label] || 0) + 1;
        });
        const mbreakdown = Object.entries(mcounts).map(([k, v]) => `${v} ${k}`).join(", ");
        const upcoming = meetings
          .filter((m) => m.status === "scheduled")
          .slice(0, 6)
          .map((m) => `${m.title}${m.scheduled_at ? ` (${str(m.scheduled_at).slice(0, 16).replace("T", " à ")})` : ""}`)
          .join(", ");
        parts.push(
          `Réunions (ZCall) : ${meetings.length} au total — ${mbreakdown}. ` +
          `Prochaines réunions programmées : ${upcoming || "aucune"}.`,
        );
      } else {
        parts.push("Réunions (ZCall) : aucune réunion créée.");
      }
    } catch { parts.push("Réunions (ZCall) : données indisponibles."); }
  }

  // FORMATION : formations + leçons + chapitres
  if (pages.has("formation")) {
    try {
      const { data: formations } = await supabase
        .from("formations")
        .select("id, titre, status, prix, duree")
        .eq("id_formateur", userId)
        .order("id", { ascending: false })
        .limit(100);
      const fms = (formations || []) as Row[];
      if (fms.length > 0) {
        const fcounts: Record<string, number> = {};
        fms.forEach((f) => {
          const label = str(f.status) === "published" ? "Publiée" : str(f.status) || "Brouillon";
          fcounts[label] = (fcounts[label] || 0) + 1;
        });
        const fbreakdown = Object.entries(fcounts).map(([k, v]) => `${v} ${k}`).join(", ");
        const recent = fms.slice(0, 6).map((f) => `${f.titre} (${Number(f.prix) > 0 ? `${f.prix} MAD` : "Gratuit"})`).join(", ");

        const formationIds = fms.map((f) => Number(f.id)).filter((n) => !isNaN(n));
        let lecons = 0;
        let chapitres = 0;
        if (formationIds.length > 0) {
          const [lres, cres] = await Promise.all([
            supabase.from("lecons").select("id").in("cours_id", formationIds),
            supabase.from("chapitres").select("id").in("cours_id", formationIds),
          ]);
          lecons = ((lres?.data || []) as Row[]).length;
          chapitres = ((cres?.data || []) as Row[]).length;
        }
        parts.push(
          `Formations : ${fms.length} au total — ${fbreakdown}. ` +
          `Contenu : ${chapitres} chapitre(s) et ${lecons} leçon(s). ` +
          `Dernières formations : ${recent || "—"}.`,
        );
      } else {
        parts.push("Formations : aucune formation créée.");
      }
    } catch { parts.push("Formations : données indisponibles."); }
  }

  // APPS DESCRIPTIVES (sans données chiffrables) : Bouton WhatsApp, AI Shopper, IA Reporting
  const descriptiveApps: Record<string, string> = {
    "whatsapp-button":
      "Bouton WhatsApp : ajoute un bouton de contact WhatsApp sur votre site public pour que les visiteurs puissent vous écrire directement (numéro et message de bienvenue configurables, position et visibilité réglables).",
    "ai-shopper":
      "AI Shopper : assistant IA intégré à votre site public qui répond automatiquement aux questions des visiteurs sur vos produits et les guide dans leur shopping (message d'accueil et position configurables).",
    "ia-reporting":
      "IA Reporting : génère des rapports d'analyse IA (chiffre d'affaires, panier moyen, produits en stock faible, recommandations) à partir de vos commandes et de vos produits.",
  };
  for (const [page, desc] of Object.entries(descriptiveApps)) {
    if (pages.has(page)) {
      parts.push(`${desc} — application installée et active.`);
    }
  }

  return parts.join("\n");
}

// Analyses croisées : relier les données entre elles pour des conseils plus malins
async function gatherCrossInsights(supabase: any, userId: number): Promise<string> {
  const parts: string[] = [];

  // 1. Clients les plus fidèles (points de fidélité cumulés)
  try {
    const { data } = await supabase
      .from("pointfidelite")
      .select("iduser, nombre")
      .eq("idcommerce", userId)
      .limit(1000);
    const rows = (data || []) as Row[];
    const byUser = new Map<number, number>();
    for (const r of rows) {
      const uid = Number(r.iduser);
      if (!uid) continue;
      const pts = parseFloat(str(r.nombre));
      if (isNaN(pts)) continue;
      byUser.set(uid, (byUser.get(uid) || 0) + pts);
    }
    const topIds = [...byUser.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([uid]) => uid);
    if (topIds.length > 0) {
      const { data: us } = await supabase
        .from("users")
        .select("id, name, email, telephone")
        .in("id", topIds);
      const umap = new Map<number, Row>((us || []).map((u: Row) => [Number(u.id), u]));
      const top = topIds.map((uid) => {
        const u = umap.get(uid);
        const name = str(u?.name || u?.email || u?.telephone || `Client #${uid}`);
        return `${name} (${byUser.get(uid)} pts)`;
      });
      parts.push(`Clients les plus fidèles (points) : ${top.join(", ")}.`);
    } else {
      parts.push("Clients les plus fidèles : aucune donnée de points de fidélité pour le moment.");
    }
  } catch { parts.push("Clients les plus fidèles : données indisponibles."); }

  // 2. Clients récurrents (plusieurs commandes)
  try {
    const { data } = await supabase
      .from("commande")
      .select("nomclient, email, tel, sp")
      .eq("owner", userId)
      .limit(500);
    const orders = (data || []) as Row[];
    const byEmail = new Map<string, { name: string; count: number; total: number }>();
    for (const o of orders) {
      const email = str(o.email).toLowerCase().trim();
      if (!email) continue;
      const entry = byEmail.get(email) || { name: str(o.nomclient || o.tel || email), count: 0, total: 0 };
      entry.count += 1;
      const v = parseFloat(str(o.sp));
      if (!isNaN(v)) entry.total += v;
      byEmail.set(email, entry);
    }
    const repeat = [...byEmail.values()]
      .filter((e) => e.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    if (repeat.length > 0) {
      parts.push(
        `Clients récurrents (plusieurs commandes) : ${repeat
          .map((e) => `${e.name} (${e.count} commandes, ≈${e.total.toFixed(0)})`)
          .join(", ")}.`,
      );
    } else {
      parts.push("Clients récurrents : aucun client avec plusieurs commandes détecté.");
    }
  } catch { parts.push("Clients récurrents : données indisponibles."); }

  // 3. Rendez-vous à venir (noms + emails) pour recoupement avec clients
  try {
    const { data: services } = await supabase
      .from("booking_services")
      .select("id")
      .eq("owner", userId)
      .eq("statut", 1);
    const svcs = (services || []) as Row[];
    const serviceIds = svcs.map((s) => Number(s.id)).filter((n) => !isNaN(n));
    if (serviceIds.length > 0) {
      const { data } = await supabase
        .from("booking_appointments")
        .select("fullname, email, phone, date, time, status")
        .in("service_id", serviceIds)
        .order("date", { ascending: true })
        .limit(50);
      const appts = (data || []) as Row[];
      const today = new Date().toISOString().split("T")[0];
      const upcoming = appts.filter((a) => str(a.date) >= today && str(a.status) !== "cancelled");
      if (upcoming.length > 0) {
        const list = upcoming.slice(0, 8).map((a) => `${a.fullname}${a.email ? ` (${a.email})` : a.phone ? ` (${a.phone})` : ""}`).join(", ");
        parts.push(`Rendez-vous à venir : ${list}.`);
      }
    }
  } catch { /* ignore */ }

  // 4. Tickets support ↔ clients fidèles (prioriser les plus fidèles)
  try {
    const { data: pts } = await supabase
      .from("pointfidelite")
      .select("iduser, nombre")
      .eq("idcommerce", userId)
      .limit(1000);
    const rows = (pts || []) as Row[];
    const byUser = new Map<number, number>();
    for (const r of rows) {
      const uid = Number(r.iduser);
      if (!uid) continue;
      const p = parseFloat(str(r.nombre));
      if (isNaN(p)) continue;
      byUser.set(uid, (byUser.get(uid) || 0) + p);
    }
    const loyalIds = [...byUser.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([uid]) => uid);
    if (loyalIds.length > 0) {
      const { data: us } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", loyalIds);
      const loyal: { id: number; name: string; email: string; points: number }[] = ((us || []) as Row[]).map((u: Row) => ({
        id: Number(u.id),
        name: str(u.name || u.email || `Client #${u.id}`),
        email: str(u.email).toLowerCase().trim(),
        points: byUser.get(Number(u.id)) || 0,
      }));
      const { data: tks } = await supabase
        .from("support_tickets")
        .select("customer_id, customer_email, customer_name, subject, status")
        .eq("idcommerce", userId)
        .limit(300);
      const tickets = (tks || []) as Row[];
      const openSet = new Set(["new", "open", "pending", "en_attente", "en_cours"]);
      const loyalWithOpen: string[] = [];
      const loyalTicketCount = new Map<number, number>();
      for (const c of loyal) {
        const matching = tickets.filter((t) => {
          const tid = Number(t.customer_id);
          const temail = str(t.customer_email).toLowerCase().trim();
          return (tid && tid === c.id) || (temail && temail === c.email);
        });
        if (matching.length > 0) loyalTicketCount.set(c.id, matching.length);
        if (matching.some((t) => openSet.has(str(t.status).toLowerCase()))) {
          loyalWithOpen.push(c.name);
        }
      }
      if (loyalWithOpen.length > 0) {
        parts.push(`Clients fidèles avec ticket support ouvert (à traiter en priorité) : ${loyalWithOpen.join(", ")}.`);
      } else {
        parts.push("Clients fidèles avec ticket support ouvert : aucun.");
      }
      if (loyalTicketCount.size > 0) {
        const detail = loyal
          .filter((c) => loyalTicketCount.has(c.id))
          .map((c) => `${c.name} (${loyalTicketCount.get(c.id)} ticket(s))`)
          .join(", ");
        parts.push(`Clients fidèles ayant déjà ouvert un ticket : ${detail}.`);
      }
    }
  } catch { /* ignore */ }

  // 5. Ventes par période (saisonnalité)
  try {
    const { data } = await supabase
      .from("commande")
      .select("date_time, totalttc, sp, monaie")
      .eq("owner", userId)
      .limit(500);
    const orders = (data || []) as Row[];
    if (orders.length > 0) {
      const byMonth = new Map<string, { count: number; total: number }>();
      for (const o of orders) {
        const dt = o.date_time ? new Date(str(o.date_time)) : null;
        if (!dt || isNaN(dt.getTime())) continue;
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        const entry = byMonth.get(key) || { count: 0, total: 0 };
        entry.count += 1;
        const v = parseFloat(str(o.totalttc ?? o.sp ?? "0"));
        if (!isNaN(v)) entry.total += v;
        byMonth.set(key, entry);
      }
      const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      if (months.length > 0) {
        const monaie = orders[0]?.monaie || "MAD";
        const best = months.reduce((a, b) => (b[1].total >= a[1].total ? b : a));
        const last = months
          .slice(-6)
          .map(([k, v]) => `${k} (${v.count} com., ≈${v.total.toFixed(0)} ${monaie})`)
          .join(", ");
        parts.push(`Ventes par mois : ${last}.`);
        parts.push(`Meilleur mois de vente : ${best[0]} (≈${best[1].total.toFixed(0)} ${monaie}, ${best[1].count} commandes).`);
      }
    }
  } catch { /* ignore */ }

  // 6. Stock faible ↔ produits les plus vendus (prioriser les réassorts)
  try {
    const { data: prods } = await supabase
      .from("product_items")
      .select("id, name, stock")
      .eq("idcommerce", userId)
      .limit(500);
    const products = (prods || []) as Row[];
    if (products.length === 0) {
      parts.push("Stock / ventes croisés : aucun produit en catalogue.");
    } else {
      const productIds = products.map((p) => String(p.id)).filter(Boolean);
      let items: Row[] = [];
      if (productIds.length > 0) {
        const { data } = await supabase
          .from("order_items")
          .select("product_id, product_name, quantity")
          .in("product_id", productIds)
          .limit(1000);
        items = (data || []) as Row[];
      }
      const soldByProduct = new Map<string, { name: string; qty: number }>();
      for (const it of items) {
        const pid = str(it.product_id);
        const qty = Number(it.quantity ?? 0);
        if (!pid || isNaN(qty) || qty <= 0) continue;
        const existing = soldByProduct.get(pid) || { name: str(it.product_name || ""), qty: 0 };
        existing.qty += qty;
        if (!existing.name) existing.name = str(it.product_name);
        soldByProduct.set(pid, existing);
      }
      const lowStock = products.filter((p) => Number(p.stock ?? 0) <= 3);
      const ranked = lowStock
        .map((p) => {
          const pid = String(p.id);
          const sold = soldByProduct.get(pid);
          return { name: str(p.name), stock: Number(p.stock ?? 0), sold: sold ? sold.qty : 0 };
        })
        .sort((a, b) => b.sold - a.sold);
      if (ranked.length > 0) {
        const top = ranked.filter((r) => r.sold > 0).slice(0, 6);
        const others = ranked.filter((r) => r.sold === 0);
        if (top.length > 0) {
          parts.push(
            `Réassort prioritaire (stock faible ET déjà vendus) : ${top
              .map((r) => `${r.name} (stock ${r.stock}, ${r.sold} vendu(s))`)
              .join(", ")}.`,
          );
        } else {
          parts.push("Réassort prioritaire : aucun produit à stock faible n'a encore été vendu.");
        }
        if (others.length > 0) {
          parts.push(
            `Produits à stock faible sans vente enregistrée : ${others
              .slice(0, 5)
              .map((r) => `${r.name} (stock ${r.stock})`)
              .join(", ")}.`,
          );
        }
      } else {
        parts.push("Stock / ventes croisés : aucun produit en stock faible.");
      }
    }
  } catch { parts.push("Stock / ventes croisés : données indisponibles."); }

  // 7. Rentabilité : dépenses + dettes ↔ ventes du mois
  try {
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Ventes du mois courant
    const { data: orders } = await supabase
      .from("commande")
      .select("date_time, totalttc, sp, monaie")
      .eq("owner", userId)
      .limit(500);
    const cmds = (orders || []) as Row[];
    let monthSales = 0;
    let monaie = "MAD";
    for (const o of cmds) {
      const dt = o.date_time ? new Date(str(o.date_time)) : null;
      if (!dt || isNaN(dt.getTime())) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (key === curKey) {
        const v = parseFloat(str(o.totalttc ?? o.sp ?? "0"));
        if (!isNaN(v)) monthSales += v;
      }
      if (o.monaie) monaie = str(o.monaie);
    }

    // Dépenses du mois courant
    const { data: deps } = await supabase
      .from("depenses")
      .select("montant, date_depense, created_at, categorie")
      .eq("idcommerce", userId)
      .limit(500);
    const expenses = (deps || []) as Row[];
    let monthExpenses = 0;
    for (const d of expenses) {
      const raw = d.date_depense ? str(d.date_depense) : d.created_at ? str(d.created_at) : "";
      const dt = raw ? new Date(raw) : null;
      if (!dt || isNaN(dt.getTime())) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (key === curKey) {
        const v = parseFloat(str(d.montant));
        if (!isNaN(v)) monthExpenses += v;
      }
    }

    // Dettes restantes (montant - montant_paye)
    const { data: debts } = await supabase
      .from("dettes")
      .select("fournisseur, montant, montant_paye, statut")
      .eq("idcommerce", userId)
      .limit(500);
    const debtsRows = (debts || []) as Row[];
    let remainingDebts = 0;
    const openDebts: { name: string; rest: number }[] = [];
    for (const d of debtsRows) {
      const total = parseFloat(str(d.montant));
      const paid = parseFloat(str(d.montant_paye ?? "0"));
      if (isNaN(total)) continue;
      const rest = total - (isNaN(paid) ? 0 : paid);
      if (rest > 0) {
        remainingDebts += rest;
        openDebts.push({ name: str(d.fournisseur || "Fournisseur"), rest });
      }
    }
    openDebts.sort((a, b) => b.rest - a.rest);

    if (monthSales === 0 && monthExpenses === 0 && openDebts.length === 0) {
      parts.push("Rentabilité : aucune donnée de vente, dépense ou dette pour le moment.");
    } else {
      const net = monthSales - monthExpenses - remainingDebts;
      parts.push(
        `Rentabilité du mois (${curKey}) : ventes ≈ ${monthSales.toFixed(2)} ${monaie}, dépenses ≈ ${monthExpenses.toFixed(2)} ${monaie}. ` +
        `Dettes restantes ≈ ${remainingDebts.toFixed(2)} ${monaie}. ` +
        `Bénéfice net estimé ≈ ${net.toFixed(2)} ${monaie} (${net >= 0 ? "positif" : "négatif"}).`,
      );
      if (openDebts.length > 0) {
        parts.push(
          `Dettes en cours (les plus lourdes) : ${openDebts
            .slice(0, 5)
            .map((d) => `${d.name} (reste ≈ ${d.rest.toFixed(2)})`)
            .join(", ")}.`,
        );
      }
      if (net < 0) {
        parts.push(
          `Alerte rentabilité : les dépenses et dettes dépassent les ventes du mois. Priorité à l'encaissement des ventes et à la maîtrise des sorties.`,
        );
      }
    }
  } catch { parts.push("Rentabilité : données indisponibles."); }

  return parts.join("\n");
}

const SYSTEM_PROMPT = `Tu es l'assistant IA personnel d'un commerçant sur la plateforme Zifek. Tu es SON assistant : tu analyses SES données de boutique, SES statistiques et SES applications installées, et tu l'aides à gérer et développer son commerce.

Règles :
- Réponds TOUJOURS en français, de façon chaleureuse, concise et actionnable.
- Ne renvoie JAMAIS de bloc de code markdown (pas de \`\`\`).
- Utilise des listes à puces (• ou -) et des sauts de ligne pour la lisibilité.
- Appuie tes réponses sur les données fournies (produits, commandes, clients, transactions, visites, projets, tâches, tickets, formulaires, documents, fidélité, rendez-vous, réunions, formations). Ne cite pas de chiffres si tu n'as pas la donnée.
- Les applications installées et leurs données te sont fournies : réponds aux questions sur les projets et tâches (GESTIONPRO), les tickets support, les formulaires, les documents, la fidélité, les rendez-vous (ZCalendar), les réunions et appels vidéo (ZCall) et les formations.
- Pour les applications Bouton WhatsApp, AI Shopper et IA Reporting, explique leur rôle, comment s'en servir et leur état (installée/active) — elles n'ont pas de chiffres à remonter.
- Fais des analyses croisées : relie les données entre elles pour donner des conseils plus malins. Par exemple, croise les rendez-vous (ZCalendar) avec les clients fidèles ou récurrents pour suggérer des relances ou des offres ciblées ; croise les tickets support avec les clients fidèles et récurrents pour prioriser les demandes ; croise le stock faible avec les produits les plus vendus pour prioriser les réassorts ; analyse la saisonnalité des ventes par mois pour anticiper les périodes fortes ; croise les dépenses et les dettes avec les ventes du mois pour donner un aperçu de rentabilité (bénéfice net estimé, dettes les plus lourdes, alerte si négatif). Quand tu fais un recoupement, cite les noms des clients ou produits concernés.
- Si la donnée n'est pas disponible, dis-le honnêtement et propose une action pour l'obtenir.
- Donne des conseils concrets et personnalisés (réassort, promos, fidélisation, gestion de projet, etc.) basés sur SES chiffres.
- Reste sur les sujets liés à sa boutique et à son activité.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as Row;
    const message: string = str(payload?.message).trim();
    const weeklySummary: boolean = payload?.weeklySummary === true;
    const userId: number = parseInt(str(payload?.userId || "0"), 10);

    if (!message && !weeklySummary) {
      return new Response(JSON.stringify({ error: "Message vide." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "Utilisateur requis." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: configData } = await supabase
      .from("zifek")
      .select("xai_api_key, openrouter_api_key, openai_api_key, ollama_api_key, ollama_endpoint")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();
    const config = configData as Row | null;

    const providers = getProviders();
    let active: AiProvider | null = null;
    if (config) {
      const xaiKey = str(config.xai_api_key);
      const openrouterKey = str(config.openrouter_api_key);
      const openaiKey = str(config.openai_api_key);
      const ollamaEndpoint = str(config.ollama_endpoint);
      const ollamaKey = str(config.ollama_api_key);

      if (xaiKey.trim() !== "") {
        const p = providers.find((x) => x.name === "xAI")!;
        p.apiKey = xaiKey;
        active = p;
      } else if (openrouterKey.trim() !== "") {
        const p = providers.find((x) => x.name === "OpenRouter")!;
        p.apiKey = openrouterKey;
        active = p;
      } else if (openaiKey.trim() !== "") {
        const p = providers.find((x) => x.name === "OpenAI")!;
        p.apiKey = openaiKey;
        active = p;
      } else if (ollamaEndpoint.trim() !== "") {
        const p = providers.find((x) => x.name === "Ollama")!;
        p.apiKey = ollamaKey;
        p.endpoint = `${ollamaEndpoint}/api/chat`;
        active = p;
      }
    }

    if (!active) {
      return new Response(
        JSON.stringify({ error: "Aucune clé API IA n'est configurée. Contactez le support pour activer l'assistant." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const shopContext = await gatherShopContext(supabase, userId);
    const installed = await gatherInstalledApps(supabase, userId);
    const appContext = await gatherAppContext(supabase, userId, installed.pages);
    const crossInsights = await gatherCrossInsights(supabase, userId);

    const weeklyInstruction = weeklySummary
      ? `\n\nTÂCHE SPÉCIALE — RÉSUMÉ HEBDOMADAIRE : génère le résumé de la semaine de la boutique. Structure ta réponse en deux sections claires : « TOPS » (top produits les plus vendus, meilleure période de vente, top clients récurrents) et « ALERTES » (stock faible / réassort prioritaire, rentabilité négative, dettes en retard ou lourdes, tickets support ouverts, rendez-vous à venir à relancer). Termine par 1 à 3 recommandations concrètes. Utilise des listes à puces, sois concis et actionnable.`
      : "";

    const effectiveMessage = weeklySummary
      ? "Génère mon résumé hebdomadaire avec les tops et les alertes."
      : message;

    const systemPrompt = `${SYSTEM_PROMPT}${weeklyInstruction}\n\nVoici les données actuelles de la boutique :\n${shopContext}\n\nApplications installées : ${installed.labels.length > 0 ? installed.labels.join(", ") : "aucune application active"}\n\nDonnées des applications :\n${appContext || "—"}\n\nAnalyses croisées :\n${crossInsights || "—"}`;

    const isOllama = active.name === "Ollama";
    const body: Row = {
      model: active.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: effectiveMessage },
      ],
      temperature: 0.6,
      max_tokens: 1200,
    };
    if (isOllama) body.stream = false;

    const aiResponse = await fetch(active.endpoint, {
      method: "POST",
      headers: active.headers(active.apiKey || ""),
      body: JSON.stringify(body),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[mon-assistant] ${active.name} error ${aiResponse.status}:`, errText.slice(0, 200));
      return new Response(
        JSON.stringify({ error: `Erreur API IA ${active.name} (${aiResponse.status}).` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = (await aiResponse.json()) as Row;
    const text = extractText(aiData);
    if (!text) {
      return new Response(JSON.stringify({ error: "Réponse vide de l'assistant." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    try {
      await supabase.from("monassistantshop").insert({
        iduser: userId,
        messageshop: weeklySummary ? "Résumé hebdomadaire (tops + alertes)" : message,
        reponseai: text,
        date: new Date().toISOString(),
      });
    } catch { /* l'historique est optionnel */ }

    return new Response(
      JSON.stringify({ reply: stripFences(text), provider: active.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[mon-assistant] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
