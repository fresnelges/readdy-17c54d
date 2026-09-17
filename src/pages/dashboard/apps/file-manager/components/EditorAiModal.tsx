import { useEffect, useRef, useState } from 'react';
import { runDocumentAi, type DocumentAiAction } from '@/lib/documentAi';

interface EditorAiModalProps {
  open: boolean;
  action: DocumentAiAction | null;
  title?: string;
  getText: () => string;
  onInsert: (text: string) => void;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  write: 'Rédaction assistée',
  continue: 'Continuer',
  summarize: 'Résumé',
  improve: 'Amélioration',
  proofread: 'Correction',
  shorten: 'Raccourcir',
  expand: 'Développer',
  outline: 'Plan',
  tone: 'Changement de ton',
  translate: 'Traduction',
  html: 'Mise en forme HTML',
};

export default function EditorAiModal({
  open,
  action,
  title,
  getText,
  onInsert,
  onClose,
}: EditorAiModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState('');
  const [instruction, setInstruction] = useState('');
  const [copied, setCopied] = useState(false);
  const runIdRef = useRef(0);

  const needsSubject = action === 'write' || action === 'outline';

  const run = async () => {
    if (!action) return;
    const currentRun = runIdRef.current + 1;
    runIdRef.current = currentRun;
    setLoading(true);
    setError(null);
    setResult('');
    try {
      const text = needsSubject ? instruction : getText();
      const res = await runDocumentAi({
        action,
        text,
        instruction: instruction || undefined,
      });
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
    if (needsSubject) setLoading(false);
    else void run();
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
            {title || ACTION_LABELS[action] || 'Assistant IA'}
          </p>
          <p className="text-[11px] text-foreground-400">
            {provider ? `Propulsé par ${provider}` : 'Assistant IA'}
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
            <label className="text-xs font-medium text-foreground-600">Sujet ou consigne</label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Décrivez ce que vous souhaitez générer..."
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
              placeholder="Ex : garder un ton professionnel..."
              className="w-full px-3 py-2 text-sm rounded-md border border-background-200/70 bg-white focus:outline-none focus:border-accent-300"
            />
          </div>
        )}

        <button
          onClick={() => void run()}
          disabled={loading || (needsSubject && !instruction.trim())}
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
                onClick={() => onInsert(result.trim())}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-accent-500 text-white text-xs font-medium hover:bg-accent-600 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-insert-row-bottom"></i>
                Insérer
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