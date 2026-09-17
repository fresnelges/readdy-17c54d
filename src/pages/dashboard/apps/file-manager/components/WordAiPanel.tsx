import { useEffect, useRef, useState } from 'react';
import { runDocumentAi, type DocumentAiAction } from '@/lib/documentAi';

interface WordAiPanelProps {
  open: boolean;
  action: DocumentAiAction | null;
  targetLang?: string;
  targetTone?: string;
  getText: () => string;
  onInsert: (html: string) => void;
  onReplace: (html: string) => void;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  write: 'Rédaction assistée',
  continue: 'Continuer le texte',
  summarize: 'Résumé du document',
  improve: 'Amélioration de la rédaction',
  proofread: 'Correction orthographique',
  shorten: 'Raccourcir le texte',
  expand: 'Développer le texte',
  outline: 'Génération d\u2019un plan',
  tone: 'Changement de ton',
  translate: 'Traduction',
  html: 'Mise en forme HTML',
};

function textToHtml(text: string): string {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  if (/<(p|h[1-6]|ul|ol|li|div|table|blockquote)\b/i.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export default function WordAiPanel({
  open,
  action,
  targetLang,
  targetTone,
  getText,
  onInsert,
  onReplace,
  onClose,
}: WordAiPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState('');
  const [subject, setSubject] = useState('');
  const [instruction, setInstruction] = useState('');
  const [copied, setCopied] = useState(false);
  const runIdRef = useRef(0);

  const needsSubject = action === 'write' || action === 'outline';

  const run = async (overrideSubject?: string) => {
    if (!action) return;
    const currentRun = runIdRef.current + 1;
    runIdRef.current = currentRun;
    setLoading(true);
    setError(null);
    setResult('');
    try {
      const text = needsSubject ? (overrideSubject ?? subject) : getText();
      const res = await runDocumentAi({ action, text, targetLang, targetTone, instruction: instruction || undefined });
      if (runIdRef.current !== currentRun) return;
      setResult(res.result);
      setProvider(res.provider);
    } catch (err) {
      if (runIdRef.current !== currentRun) return;
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      if (runIdRef.current === currentRun) setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !action) return;
    setInstruction('');
    setResult('');
    setError(null);
    if (action === 'write' || action === 'outline') {
      setSubject('');
      setLoading(false);
    } else {
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, action]);

  if (!open || !action) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 z-40 w-full sm:w-[400px] bg-background-50 border-l border-background-200/70 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-background-200/70">
        <span className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center">
          <i className="ri-sparkling-line"></i>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground-950 truncate">
            {ACTION_LABELS[action] || 'Assistant IA'}
          </p>
          <p className="text-[11px] text-foreground-400">
            {provider ? `Propulsé par ${provider}` : 'Assistant IA'}
            {targetLang ? ` · ${targetLang}` : ''}
            {targetTone ? ` · ton ${targetTone}` : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
          title="Fermer"
        >
          <i className="ri-close-line"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {needsSubject && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-foreground-600">
              {action === 'write' ? 'Sujet ou consigne de rédaction' : 'Thème du plan'}
            </label>
            <textarea
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ex : une lettre de motivation pour un poste de chef de projet..."
              className="w-full px-3 py-2 text-sm rounded-md border border-background-200/70 bg-white focus:outline-none focus:border-accent-300 resize-none"
            />
          </div>
        )}

        {!needsSubject && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-foreground-600">Consigne supplémentaire (optionnel)</label>
            <input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              maxLength={300}
              placeholder="Ex : garder un ton professionnel, 200 mots..."
              className="w-full px-3 py-2 text-sm rounded-md border border-background-200/70 bg-white focus:outline-none focus:border-accent-300"
            />
          </div>
        )}

        <button
          onClick={() => void run()}
          disabled={loading || (needsSubject && !subject.trim())}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap"
        >
          <i className={`ri-${loading ? 'loader-4-line animate-spin' : 'magic-line'}`}></i>
          {loading ? 'Génération en cours...' : 'Générer'}
        </button>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-red-50 text-red-700 text-xs">
            <i className="ri-error-warning-line mt-0.5"></i>
            <span className="flex-1">{error}</span>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-2">
            <div
              dir="auto"
              className="px-3 py-3 rounded-md border border-background-200/70 bg-white text-sm text-foreground-800 whitespace-pre-wrap max-h-[45vh] overflow-y-auto"
            >
              {result}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onInsert(textToHtml(result))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-accent-500 text-white text-xs font-medium hover:bg-accent-600 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-insert-row-bottom"></i>
                Insérer
              </button>
              <button
                onClick={() => onReplace(textToHtml(result))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-background-200/70 bg-white text-foreground-700 text-xs font-medium hover:bg-background-100 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line"></i>
                Remplacer le document
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-background-200/70 bg-white text-foreground-700 text-xs font-medium hover:bg-background-100 cursor-pointer whitespace-nowrap"
              >
                <i className={`ri-${copied ? 'check-line' : 'file-copy-line'}`}></i>
                {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}