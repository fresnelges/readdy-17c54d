import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Tu es un générateur d'applications no-code. À partir d'une description en français, tu produis UNIQUEMENT un objet JSON valide (sans texte autour, sans markdown) décrivant la structure complète de l'application.

Le JSON doit respecter EXACTEMENT ce schéma :

{
  "name": "nom de l'app",
  "pages": [
    {
      "title": "Titre de la page",
      "slug": "slug-de-la-page",
      "icon": "ri-home-line",
      "visibility": "visible",
      "blocks": [
        { "type": "heading", "content": { "text": "Titre de section" } },
        { "type": "text", "content": { "text": "Paragraphe de texte..." } },
        { "type": "image", "content": { "url": "https://...", "caption": "légende" } },
        { "type": "list", "content": { "title": "Titre liste", "items": ["item 1", "item 2"] } },
        { "type": "form", "content": { "form": "nom_du_formulaire" } },
        { "type": "table", "content": { "table": "slug_de_la_table" } },
        { "type": "spacer", "content": { "height": 32 } }
      ]
    }
  ],
  "forms": [
    {
      "name": "nom_du_formulaire",
      "title": "Titre affiché",
      "description": "Description du formulaire",
      "fields": [
        { "label": "Nom", "type": "text", "required": true, "options": [] },
        { "label": "Email", "type": "email", "required": true, "options": [] },
        { "label": "Message", "type": "textarea", "required": false, "options": [] }
      ]
    }
  ],
  "tables": [
    {
      "name": "Nom de la table",
      "slug": "slug-de-la-table",
      "fields": [
        { "label": "Nom", "type": "text" },
        { "label": "Prix", "type": "number" }
      ],
      "rows": [
        { "Nom": "Produit A", "Prix": "100" }
      ]
    }
  ],
  "settings": [
    { "key": "cle_reference", "label": "Libellé visible", "type": "toggle", "value": "0", "options": [] }
  ]
}

Règles strictes :
- Les types de blocs autorisés sont UNIQUEMENT : heading, text, image, list, form, table, spacer.
- Les types de champs de formulaire autorisés sont : text, textarea, email, number, tel, date, select, radio, checkbox. Pour select/radio/checkbox, fournis un tableau "options".
- Les types de champs de table autorisés sont : text, number, date, select, boolean.
- Les types de réglage autorisés sont : text, number, toggle, select.
- Un bloc "form" référence un formulaire par son champ "name". Un bloc "table" référence une table par son "slug".
- Les "rows" des tables utilisent les libellés de champs ("label") comme clés.
- Les slugs et clés sont en minuscules, sans accents, séparés par des tirets.
- Produis un contenu réaliste, riche et en français. Si la description mentionne des éléments précis (produits, services, menu, équipe, contact, réservation), intègre-les.
- Chaque app doit avoir au moins une page, et une page "Accueil" (slug "accueil") de préférence en premier.
- Réponds UNIQUEMENT avec le JSON, sans aucun texte additionnel.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) {
      return new Response(
        JSON.stringify({
          error: 'no_api_key',
          message: 'Aucune clé IA configurée. Ajoutez votre clé OpenAI pour activer la génération automatique.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const description = (body?.description || '').trim();
    const appName = (body?.appName || '').trim();
    if (!description) {
      return new Response(
        JSON.stringify({ error: 'missing_description', message: 'Veuillez fournir une description.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Description de l'application : ${description}\nNom de l'application : ${appName || 'Mon App'}` },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return new Response(
        JSON.stringify({ error: 'openai_error', message: `Erreur OpenAI (${openaiRes.status}) : ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const openaiData = await openaiRes.json();
    const raw = openaiData?.choices?.[0]?.message?.content;
    if (!raw) {
      return new Response(
        JSON.stringify({ error: 'empty_response', message: 'Réponse IA vide.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let blueprint;
    try {
      blueprint = JSON.parse(raw);
    } catch {
      return new Response(
        JSON.stringify({ error: 'parse_error', message: 'La réponse IA n est pas un JSON valide.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify(blueprint), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'unexpected', message: err instanceof Error ? err.message : 'Erreur inattendue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
