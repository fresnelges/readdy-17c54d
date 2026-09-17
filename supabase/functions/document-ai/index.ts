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
        "X-Title": "Zifek Document Assistant",
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
      headers: () => ({
        "Content-Type": "application/json",
      }),
    },
  ];
}

const BASE_RULES =
  "Tu es l'assistant IA intégré à l'éditeur de documents Word de la plateforme. Tu réponds toujours en français, de manière professionnelle. Tu ne renvoies JAMAIS de bloc de code markdown (pas de ```). Tu ne fais aucun commentaire sur ta propre réponse : tu renvoies uniquement le contenu demandé.";

const ACTION_PROMPTS: Record<string, string> = {
  write:
    "Rédige un texte clair, bien structuré et professionnel sur le sujet fourni. Utilise des paragraphes et, si pertinent, des listes. Renvoie uniquement le texte.",
  continue:
    "Continue le texte fourni de manière naturelle et cohérente, dans le même style et le même ton. Renvoie uniquement la suite du texte, sans le répéter.",
  summarize:
    "Résume le texte fourni en un court paragraphe de synthèse, suivi d'une liste à puces des points clés. Renvoie uniquement le résumé.",
  improve:
    "Réécris le texte fourni pour améliorer le style, la clarté, la fluidité et la précision, tout en conservant le sens et les informations. Renvoie uniquement le texte amélioré.",
  proofread:
    "Corrige l'orthographe, la grammaire, la ponctuation et les accords du texte fourni. Conserve le style d'origine. Renvoie uniquement le texte corrigé.",
  shorten:
    "Raccourcis le texte fourni en conservant l'essentiel du sens, en le rendant plus concis et percutant. Renvoie uniquement le texte raccourci.",
  expand:
    "Développe le texte fourni en ajoutant des détails pertinents, des exemples et des précisions, sans inventer de faits faux. Renvoie uniquement le texte développé.",
  outline:
    "Génère un plan structuré et détaillé sur le sujet fourni, avec des titres principaux et des sous-parties. Renvoie uniquement le plan.",
  tone:
    "Réécris le texte fourni en adoptant le ton demandé, en conservant le sens. Renvoie uniquement le texte réécrit.",
  translate:
    "Traduis le texte fourni dans la langue demandée, de manière naturelle et fidèle. Renvoie uniquement la traduction.",
  html:
    "Transforme le texte fourni en HTML propre et sémantique : utilise des balises <h2> pour les titres, <p> pour les paragraphes et <ul>/<li> pour les listes. Renvoie UNIQUEMENT le HTML, sans texte autour.",
};

function buildSystemPrompt(action: string, instruction?: string): string {
  const base = ACTION_PROMPTS[action] || ACTION_PROMPTS.improve;
  const extra = instruction && instruction.trim()
    ? `\n\nConsigne supplémentaire de l'utilisateur à respecter : ${instruction.trim()}`
    : "";
  return `${BASE_RULES}\n\n${base}${extra}`;
}

interface ProviderResult {
  text: string;
  provider: string;
}

function extractText(data: Record<string, unknown>): string | null {
  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  if (choices && choices.length > 0 && choices[0].message?.content) {
    return choices[0].message.content;
  }
  const message = data.message as { content?: string } | undefined;
  if (message?.content) return message.content;
  return null;
}

function stripFences(text: string): string {
  let c = text.trim();
  const fence = c.match(/^```[a-zA-Z]*\s*\n?([\s\S]*?)\n?```$/);
  if (fence) return fence[1].trim();
  c = c.replace(/^```[a-zA-Z]*\s*\n?/, "").replace(/\n?```$/, "");
  return c.trim();
}

async function callProvider(
  provider: AiProvider,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const isOllama = provider.name === "Ollama";
  const body: Record<string, unknown> = {
    model: provider.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.6,
    max_tokens: 4000,
  };
  if (isOllama) body.stream = false;

  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: provider.headers(provider.apiKey || ""),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur API ${provider.name} ${response.status}: ${errText.slice(0, 200)}`);
  }
  const data = await response.json() as Record<string, unknown>;
  const text = extractText(data);
  if (!text) throw new Error("Réponse vide de l'assistant IA");
  return text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const action: string = payload?.action || "improve";
    const text: string = (payload?.text || "").toString();
    const instruction: string = (payload?.instruction || "").toString();
    const targetLang: string = (payload?.targetLang || "anglais").toString();
    const targetTone: string = (payload?.targetTone || "professionnel").toString();

    if (action !== "write" && action !== "outline" && !text.trim()) {
      return new Response(
        JSON.stringify({ error: "Le document est vide. Écrivez du texte avant d'utiliser l'assistant." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: config } = await supabase
      .from("zifek")
      .select("xai_api_key, openrouter_api_key, openai_api_key, ollama_api_key, ollama_endpoint")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    const providers = getProviders();
    let active: AiProvider | null = null;

    if (config) {
      if (config.xai_api_key && String(config.xai_api_key).trim() !== "") {
        const p = providers.find((x) => x.name === "xAI")!;
        p.apiKey = config.xai_api_key;
        active = p;
      } else if (config.openrouter_api_key && String(config.openrouter_api_key).trim() !== "") {
        const p = providers.find((x) => x.name === "OpenRouter")!;
        p.apiKey = config.openrouter_api_key;
        active = p;
      } else if (config.openai_api_key && String(config.openai_api_key).trim() !== "") {
        const p = providers.find((x) => x.name === "OpenAI")!;
        p.apiKey = config.openai_api_key;
        active = p;
      } else if (config.ollama_api_key !== null && config.ollama_endpoint) {
        const p = providers.find((x) => x.name === "Ollama")!;
        p.apiKey = config.ollama_api_key || "";
        p.endpoint = `${config.ollama_endpoint}/api/chat`;
        active = p;
      }
    }

    if (!active) {
      return new Response(
        JSON.stringify({
          error:
            "Aucune clé API IA n'est configurée. Ajoutez une clé xAI (Grok) dans les paramètres du superadmin pour activer l'assistant.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let userMessage = text;
    if (action === "translate") {
      userMessage = `Traduis le texte suivant en ${targetLang} :\n\n${text}`;
    } else if (action === "tone") {
      userMessage = `Réécris le texte suivant avec un ton ${targetTone} :\n\n${text}`;
    } else if (action === "write" || action === "outline") {
      userMessage = text || instruction || "Rédige un document professionnel.";
    }

    const systemPrompt = buildSystemPrompt(action, action === "translate" || action === "tone" ? undefined : instruction);
    const result = await callProvider(active, systemPrompt, userMessage);

    return new Response(
      JSON.stringify({ result: stripFences(result), provider: active.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[document-ai] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
