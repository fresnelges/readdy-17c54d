import "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── AI Provider configurations ──
interface AiProvider {
  name: string;
  apiKey: string | null;
  endpoint: string;
  model: string;
  headers: (apiKey: string) => Record<string, string>;
  bodyBuilder: (model: string, systemPrompt: string, userMessage: string) => Record<string, unknown>;
}

function getProviders(): AiProvider[] {
  return [
    {
      name: "xAI",
      apiKey: null,
      endpoint: "https://api.x.ai/v1/chat/completions",
      model: "grok-4.6",
      headers: (key: string) => ({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      }),
      bodyBuilder: (model, system, user) => ({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    },
    {
      name: "OpenRouter",
      apiKey: null,
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: "openai/gpt-4o-mini",
      headers: (key: string) => ({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer": "https://zifek.fr",
        "X-Title": "Zifek Client Assistant",
      }),
      bodyBuilder: (model, system, user) => ({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    },
    {
      name: "OpenAI",
      apiKey: null,
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
      headers: (key: string) => ({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      }),
      bodyBuilder: (model, system, user) => ({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    },
    {
      name: "Ollama",
      apiKey: null,
      endpoint: "",
      model: "llama3.2",
      headers: (_key: string) => ({
        "Content-Type": "application/json",
      }),
      bodyBuilder: (model, system, user) => ({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: false,
      }),
    },
  ];
}

const SYSTEM_PROMPT = `Tu es l'assistant IA de Zifek, une plateforme marocaine qui connecte des professionnels (commerçants, prestataires de services, artisans) avec des clients. Tu aides les utilisateurs à trouver ce qu'ils cherchent sur la plateforme.

Tu as accès à ces informations dans la base de données Zifek :
- **Services de réservation** (booking_services) : coiffure, beauté, spa, santé, formation, etc. avec durée, prix, localisation
- **Services généraux** (services) : prestations proposées par les boutiques Zifek avec titre, description, prix, ville
- **Produits** (product_items) : articles en vente sur les boutiques Zifek avec nom, prix, catégorie
- **Boutiques** (users avec typecompte professionnel) : chaque boutique a un nom, une ville, un sous-domaine (xxx.zifek.fr)

Quand un utilisateur te parle, analyse sa demande et identifie :
1. Ce qu'il cherche (service, réservation, produit, boutique)
2. La catégorie (coiffure, restaurant, beauté, vêtement, etc.)
3. La localisation si mentionnée (Fès, Casablanca, Marrakech, etc.)

Réponds de façon naturelle et chaleureuse en français. Sois concis mais complet. Si tu ne trouves rien, propose des alternatives.

Ajoute à la fin de ta réponse une ligne spéciale au format exact suivant (c'est pour le système, elle sera invisible) :
---INTENT:type|catégorie|localisation---

Où :
- type = services, bookings, products, boutiques, ou general
- catégorie = le nom de la catégorie détectée, ou "none"
- localisation = la ville détectée, ou "none"

Exemple : ---INTENT:bookings|coiffure|fès---`;

// ── Keyword-based fallback (quand aucune API IA n'est configurée) ──
function detectIntentFallback(message: string): {
  intent: "search_services" | "search_products" | "search_boutiques" | "search_bookings" | "general";
  keywords: string[];
  location?: string;
  category?: string;
} {
  const lower = message.toLowerCase();

  const villes = ["fès", "fes", "casablanca", "casa", "marrakech", "rabat", "tanger", "agadir", "meknès", "meknes", "oujda", "tétouan", "tetouan"];
  let location: string | undefined;
  for (const v of villes) {
    if (lower.includes(v)) { location = v; break; }
  }

  const categories: Record<string, string[]> = {
    "coiffure": ["coiffure", "coiffeur", "cheveux", "coupe", "tresse", "brushing"],
    "beauté": ["beauté", "beaute", "maquillage", "estheticienne", "soin visage", "spa", "massage", "ongles", "manucure"],
    "restaurant": ["restaurant", "manger", "repas", "cuisine", "traiteur", "food"],
    "santé": ["santé", "sante", "médecin", "medecin", "docteur", "dentiste", "clinique", "pharmacie", "infirmier"],
    "formation": ["formation", "cours", "apprendre", "école", "ecole", "professeur", "coaching"],
    "vêtement": ["vêtement", "vetement", "habit", "mode", "tenue", "robe", "costume"],
    "photographie": ["photo", "photographe", "shooting", "vidéo", "video"],
    "informatique": ["informatique", "développeur", "developpeur", "site web", "application", "tech"],
    "transport": ["transport", "taxi", "chauffeur", "livraison", "déménagement", "demenagement"],
    "construction": ["construction", "bâtiment", "batiment", "architecte", "rénovation", "renovation"],
  };

  let category: string | undefined;
  for (const [cat, keywords] of Object.entries(categories)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) { category = cat; break; }
    }
    if (category) break;
  }

  const bookingWords = ["reservation", "réservation", "réserver", "reserver", "rendez-vous", "rdv", "booking", "prendre rdv"];
  const productWords = ["acheter", "produit", "article", "prix", "commander"];
  const boutiqueWords = ["boutique", "magasin", "commerce", "vendeur", "site"];
  const serviceWords = ["service", "prestation", "cherche", "trouve", "besoin", "veux", "recherche"];

  if (bookingWords.some(w => lower.includes(w))) return { intent: "search_bookings", keywords: [message], location, category };
  if (productWords.some(w => lower.includes(w))) return { intent: "search_products", keywords: [message], location, category };
  if (boutiqueWords.some(w => lower.includes(w))) return { intent: "search_boutiques", keywords: [message], location, category };
  if (serviceWords.some(w => lower.includes(w))) return { intent: "search_services", keywords: [message], location, category };

  return { intent: "search_services", keywords: [message], location, category };
}

// ── Search functions ──
async function searchBookingServices(supabase: SupabaseClient, category?: string, location?: string): Promise<Record<string, unknown>[]> {
  let query = supabase.from("booking_services").select("*").eq("statut", 1);
  if (category) query = query.ilike("service_name", `%${category}%`);
  const { data } = await query.limit(10);
  if (!data || data.length === 0) return [];

  const results: Record<string, unknown>[] = [];
  for (const bs of data) {
    const { data: ownerData } = await supabase
      .from("users")
      .select("id, name, nomcommerce, user_name, telephone, Ville, Pays, image")
      .eq("id", bs.owner)
      .maybeSingle();

    if (location && ownerData && ownerData.Ville) {
      const ownerVille = String(ownerData.Ville).toLowerCase();
      if (!ownerVille.includes(location)) continue;
    }

    results.push({
      type: "service_réservation",
      id: bs.id,
      name: bs.service_name,
      description: bs.description,
      duration: bs.duration,
      location: bs.location,
      image: bs.image,
      boutique: ownerData ? {
        id: ownerData.id,
        name: ownerData.nomcommerce || ownerData.name,
        user_name: ownerData.user_name,
        telephone: ownerData.telephone,
        ville: ownerData.Ville,
        pays: ownerData.Pays,
        image: ownerData.image,
        url: `https://${ownerData.user_name}.zifek.fr`,
      } : null,
    });
  }
  return results;
}

async function searchServices(supabase: SupabaseClient, category?: string, location?: string): Promise<Record<string, unknown>[]> {
  let servicesQuery = supabase.from("services").select("*").limit(10);
  if (category) servicesQuery = servicesQuery.ilike("titre", `%${category}%`);
  const { data: services } = await servicesQuery;
  if (!services || services.length === 0) return [];

  const results: Record<string, unknown>[] = [];
  for (const svc of services) {
    if (location) {
      const svcVille = (svc.ville || "").toLowerCase();
      const svcPays = (svc.pays || "").toLowerCase();
      if (!svcVille.includes(location) && !svcPays.includes(location)) continue;
    }

    const { data: ownerData } = await supabase
      .from("users")
      .select("id, name, nomcommerce, user_name, telephone, Ville, Pays, image")
      .eq("id", svc.owner || svc.idvendeur)
      .maybeSingle();

    results.push({
      type: "service",
      id: svc.id,
      name: svc.titre,
      description: svc.description,
      price: svc.prix,
      image: svc.product_image,
      ville: svc.ville,
      pays: svc.pays,
      boutique: ownerData ? {
        id: ownerData.id,
        name: ownerData.nomcommerce || ownerData.name,
        user_name: ownerData.user_name,
        telephone: ownerData.telephone,
        ville: ownerData.Ville,
        pays: ownerData.Pays,
        image: ownerData.image,
        url: `https://${ownerData.user_name}.zifek.fr`,
      } : null,
    });
  }
  return results;
}

async function searchProducts(supabase: SupabaseClient, category?: string): Promise<Record<string, unknown>[]> {
  let query = supabase.from("product_items").select("*, product_categories(id, name)").eq("status", "active");
  if (category) query = query.ilike("name", `%${category}%`);
  const { data: products } = await query.limit(10);
  if (!products || products.length === 0) return [];

  return products.map((p: Record<string, unknown>) => {
    const cat = p.product_categories as Record<string, unknown> | null;
    return {
      type: "produit",
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      discount_price: p.discount_price,
      discount_enabled: p.discount_enabled,
      media: p.media,
      category: cat?.name || null,
    };
  });
}

async function searchBoutiques(supabase: SupabaseClient, category?: string, location?: string): Promise<Record<string, unknown>[]> {
  let query = supabase.from("users").select("id, name, nomcommerce, user_name, telephone, Ville, Pays, image, description")
    .not("typecompte", "eq", "6")
    .eq("active", 1)
    .limit(10);

  if (location) query = query.ilike("Ville", `%${location}%`);
  const { data: boutiques } = await query;
  if (!boutiques || boutiques.length === 0) return [];

  return boutiques.map((b: Record<string, unknown>) => ({
    type: "boutique",
    id: b.id,
    name: b.nomcommerce || b.name,
    description: b.description,
    ville: b.Ville,
    pays: b.Pays,
    telephone: b.telephone,
    image: b.image,
    boutique: {
      id: b.id,
      name: b.nomcommerce || b.name,
      user_name: b.user_name,
      telephone: b.telephone,
      ville: b.Ville,
      pays: b.Pays,
      image: b.image,
      url: `https://${b.user_name}.zifek.fr`,
    },
  }));
}

// ── Parse AI intent from response ──
function parseAiIntent(aiText: string): {
  intent: "search_services" | "search_products" | "search_boutiques" | "search_bookings" | "general";
  category?: string;
  location?: string;
  cleanReply: string;
} {
  const intentMatch = aiText.match(/---INTENT:(\w+)\|([^|]*)\|([^-]*?)---/);
  let intent: "search_services" | "search_products" | "search_boutiques" | "search_bookings" | "general" = "general";
  let category: string | undefined;
  let location: string | undefined;

  if (intentMatch) {
    const rawIntent = intentMatch[1].trim();
    const rawCat = intentMatch[2].trim();
    const rawLoc = intentMatch[3].trim();

    if (["services", "bookings", "products", "boutiques"].includes(rawIntent)) {
      intent = `search_${rawIntent}` as typeof intent;
    }
    if (rawCat && rawCat !== "none") category = rawCat;
    if (rawLoc && rawLoc !== "none") location = rawLoc;

    return {
      intent,
      category,
      location,
      cleanReply: aiText.replace(/---INTENT:[\s\S]*?---/, "").trim(),
    };
  }

  return { intent: "general", cleanReply: aiText };
}

// ── Main serve handler ──
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();

    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: "message and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const supabase = createClient(supabaseClient, supabaseKey);

    const { data: zifekConfig } = await supabase
      .from("zifek")
      .select("xai_api_key, openrouter_api_key, ollama_api_key, openai_api_key, ollama_endpoint")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    const providers = getProviders();
    let activeProvider: AiProvider | null = null;

    if (zifekConfig) {
      if (zifekConfig.xai_api_key && zifekConfig.xai_api_key.trim() !== "") {
        const p = providers.find(pr => pr.name === "xAI")!;
        p.apiKey = zifekConfig.xai_api_key;
        activeProvider = p;
      } else if (zifekConfig.openrouter_api_key && zifekConfig.openrouter_api_key.trim() !== "") {
        const p = providers.find(pr => pr.name === "OpenRouter")!;
        p.apiKey = zifekConfig.openrouter_api_key;
        activeProvider = p;
      } else if (zifekConfig.openai_api_key && zifekConfig.openai_api_key.trim() !== "") {
        const p = providers.find(pr => pr.name === "OpenAI")!;
        p.apiKey = zifekConfig.openai_api_key;
        activeProvider = p;
      } else if (zifekConfig.ollama_api_key !== null && zifekConfig.ollama_endpoint) {
        const p = providers.find(pr => pr.name === "Ollama")!;
        p.apiKey = zifekConfig.ollama_api_key || "";
        p.endpoint = zifekConfig.ollama_endpoint + "/api/chat";
        activeProvider = p;
      }
    }

    let replyText: string;
    let searchIntent: "search_services" | "search_products" | "search_boutiques" | "search_bookings" | "general" = "general";
    let category: string | undefined;
    let location: string | undefined;

    if (activeProvider && activeProvider.apiKey !== null && activeProvider.apiKey !== "") {
      try {
        const body = activeProvider.bodyBuilder(activeProvider.model, SYSTEM_PROMPT, message);
        const headers = activeProvider.headers(activeProvider.apiKey);

        const aiResponse = await fetch(activeProvider.endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json() as Record<string, unknown>;
          const aiText = extractResponseText(aiData, activeProvider.name);

          if (aiText) {
            const parsed = parseAiIntent(aiText);
            replyText = parsed.cleanReply;
            searchIntent = parsed.intent;
            category = parsed.category;
            location = parsed.location;

            console.log(`[AI] Provider: ${activeProvider.name}, Intent: ${searchIntent}, Category: ${category}, Location: ${location}`);
          } else {
            const fallback = detectIntentFallback(message);
            searchIntent = fallback.intent;
            category = fallback.category;
            location = fallback.location;
            replyText = "✅ Je recherche ce que vous demandez...";
          }
        } else {
          console.error(`[AI] ${activeProvider.name} API error: ${aiResponse.status}`);
          const fallback = detectIntentFallback(message);
          searchIntent = fallback.intent;
          category = fallback.category;
          location = fallback.location;
          replyText = "✅ Je recherche ce que vous demandez...";
        }
      } catch (aiErr) {
        console.error(`[AI] ${activeProvider.name} error:`, aiErr);
        const fallback = detectIntentFallback(message);
        searchIntent = fallback.intent;
        category = fallback.category;
        location = fallback.location;
        replyText = "✅ Je recherche ce que vous demandez...";
      }
    } else {
      const fallback = detectIntentFallback(message);
      searchIntent = fallback.intent;
      category = fallback.category;
      location = fallback.location;
      replyText = "✅ Je recherche ce que vous demandez...";
    }

    const results: Record<string, unknown>[] = [];
    const resultType: string[] = [];

    if (searchIntent === "search_bookings" || searchIntent === "search_services") {
      const bookingResults = await searchBookingServices(supabase, category, location);
      if (bookingResults.length > 0) {
        resultType.push("services_réservation");
        results.push(...bookingResults);
      }

      const serviceResults = await searchServices(supabase, category, location);
      if (serviceResults.length > 0) {
        resultType.push("services_généraux");
        results.push(...serviceResults);
      }
    }

    if (searchIntent === "search_products") {
      const productResults = await searchProducts(supabase, category);
      if (productResults.length > 0) {
        resultType.push("produits");
        results.push(...productResults);
      }
    }

    if (searchIntent === "search_boutiques") {
      const boutiqueResults = await searchBoutiques(supabase, category, location);
      if (boutiqueResults.length > 0) {
        resultType.push("boutiques");
        results.push(...boutiqueResults);
      }
    }

    if (searchIntent === "general") {
      const [bookingResults, serviceResults, productResults] = await Promise.all([
        searchBookingServices(supabase, category, location),
        searchServices(supabase, category, location),
        searchProducts(supabase, category),
      ]);

      if (bookingResults.length > 0) { resultType.push("services_réservation"); results.push(...bookingResults); }
      if (serviceResults.length > 0) { resultType.push("services_généraux"); results.push(...serviceResults); }
      if (productResults.length > 0) { resultType.push("produits"); results.push(...productResults); }
    }

    if (results.length === 0 && activeProvider && replyText && replyText !== "✅ Je recherche ce que vous demandez...") {
      return new Response(
        JSON.stringify({
          reply: replyText,
          results: [],
          resultTypes: [],
          intent: searchIntent,
          provider: activeProvider.name,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!activeProvider || replyText === "✅ Je recherche ce que vous demandez...") {
      const total = results.length;
      if (total === 0) {
        replyText = `🔍 Aucun résultat trouvé${location ? ` à ${location}` : ""}${category ? ` pour "${category}"` : ""}. Essayez avec d'autres mots-clés ou élargissez votre recherche.`;
      } else {
        replyText = `✅ J'ai trouvé **${total} résultat${total > 1 ? 's' : ''}** pour vous${location ? ` à **${location.charAt(0).toUpperCase() + location.slice(1)}**` : ""}.`;
      }
    }

    return new Response(
      JSON.stringify({
        reply: replyText,
        results,
        resultTypes: resultType,
        intent: searchIntent,
        provider: activeProvider?.name || "keyword",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[zifek-client-chat] Error:", errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg, reply: "❌ Désolé, une erreur est survenue. Veuillez réessayer." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Helper: extract text from various AI API response formats ──
function extractResponseText(data: Record<string, unknown>, provider: string): string | null {
  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  if (choices && choices.length > 0 && choices[0].message?.content) {
    return choices[0].message.content;
  }

  const ollamaMessage = data.message as { content?: string } | undefined;
  if (ollamaMessage?.content) {
    return ollamaMessage.content;
  }

  return null;
}

// Type helper for Supabase client (not exported, just used internally)
type SupabaseClient = ReturnType<typeof import("jsr:@supabase/supabase-js@2").createClient>;
