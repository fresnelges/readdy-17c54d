import { supabase } from '@/lib/supabase';

export type DocumentAiAction =
  | 'write'
  | 'continue'
  | 'summarize'
  | 'improve'
  | 'proofread'
  | 'shorten'
  | 'expand'
  | 'outline'
  | 'tone'
  | 'translate'
  | 'html';

export interface DocumentAiParams {
  action: DocumentAiAction;
  text?: string;
  instruction?: string;
  targetLang?: string;
  targetTone?: string;
}

export interface DocumentAiResult {
  result: string;
  provider: string;
}

/**
 * Appelle l'assistant IA via la fonction Backend `document-ai`.
 * La clé API (Grok/xAI) reste stockée côté serveur, jamais exposée au navigateur.
 */
export async function runDocumentAi(params: DocumentAiParams): Promise<DocumentAiResult> {
  const { data, error } = await supabase.functions.invoke('document-ai', { body: params });
  if (error) {
    // Récupère le vrai message d'erreur renvoyé par le backend (ex. clé manquante,
    // document vide, erreur API xAI) plutôt qu'un message générique du client.
    let message = error.message || "Impossible de contacter l'assistant IA";
    try {
      const context = (error as unknown as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { error?: string };
        if (body?.error) message = body.error;
      }
    } catch {
      // on conserve le message générique
    }
    throw new Error(message);
  }
  const payload = data as { result?: string; provider?: string; error?: string } | null;
  if (!payload) throw new Error("Réponse vide de l'assistant IA");
  if (payload.error) throw new Error(payload.error);
  return { result: payload.result || '', provider: payload.provider || 'IA' };
}

/** Convertit du HTML (contenu de l'éditeur) en texte brut lisible par l'IA. */
export function htmlToPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  div.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  const blocks = Array.from(div.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,blockquote'));
  blocks.forEach((b) => b.append('\n'));
  return (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

/** Convertit du texte brut (retour IA) en HTML propre pour l'éditeur. */
export function plainTextToHtml(text: string): string {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  if (/<(p|h[1-6]|ul|ol|li|div|table|blockquote)\b/i.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}