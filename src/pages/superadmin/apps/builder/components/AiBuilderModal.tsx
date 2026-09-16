import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { buildAppFromBlueprint, clearAppContent, type AppBlueprint, type BuildResult } from '../blueprint';

interface AiBuilderModalProps {
  appId: number;
  appName: string;
  onClose: () => void;
  onBuilt: () => void;
}

type Step = 'idle' | 'generating' | 'preview' | 'building' | 'done' | 'error';

export default function AiBuilderModal({ appId, appName, onClose, onBuilt }: AiBuilderModalProps) {
  const [description, setDescription] = useState('');
  const [replace, setReplace] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [blueprint, setBlueprint] = useState<AppBlueprint | null>(null);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);

  const generate = async () => {
    if (!description.trim()) return;
    setStep('generating');
    setError(null);
    setBlueprint(null);
    setBuildResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-app-structure', {
        body: { description: description.trim(), appName },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        if (data.error === 'no_api_key') {
          setError(
            'La génération IA nécessite une clé OpenAI. Vous pouvez me demander de l ajouter, ou générer l app directement depuis le chat (je m en charge moi-même).',
          );
        } else {
          setError(data.message || 'Erreur lors de la génération.');
        }
        setStep('error');
        return;
      }
      setBlueprint(data as AppBlueprint);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération.');
      setStep('error');
    }
  };

  const build = async () => {
    if (!blueprint) return;
    setStep('building');
    setError(null);
    try {
      if (replace) {
        await clearAppContent(appId);
      }
      const result = await buildAppFromBlueprint(appId, blueprint);
      setBuildResult(result);
      setStep('done');
      onBuilt();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la construction.');
      setStep('error');
    }
  };

  const countSummary = (bp: AppBlueprint) => {
    const blocks = (bp.pages || []).reduce((n, p) => n + (p.blocks?.length || 0), 0);
    return `${bp.pages?.length || 0} page(s) · ${blocks} bloc(s) · ${bp.forms?.length || 0} formulaire(s) · ${bp.tables?.length || 0} table(s) · ${bp.settings?.length || 0} réglage(s)`;
  };

  const resultSummary = (r: BuildResult) =>
    `${r.pages} pages, ${r.blocks} blocs, ${r.forms} formulaires, ${r.tables} tables, ${r.tableRows} lignes de données, ${r.settings} réglages`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-background-50 rounded-lg border border-background-200/70 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-background-200/70">
          <div className="flex items-center gap-2">
            <i className="ri-sparkling-2-line text-primary-500 text-lg"></i>
            <h3 className="font-semibold font-heading text-foreground-950">Générer l'app avec l'IA</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-800">
              Décrivez l'app que vous voulez construire
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Ex : une app de menu digital pour un restaurant, avec une page d'accueil, une page menu (plats avec prix), un formulaire de réservation, et un réglage pour activer les livraisons..."
              className="w-full px-3 py-2.5 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300 resize-y"
              maxLength={2000}
            />
            <p className="text-xs text-foreground-400 text-right">{description.length}/2000</p>
          </div>

          {/* Replace toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
              className="w-4 h-4 accent-primary-500 cursor-pointer"
            />
            <span className="text-sm text-foreground-700">Remplacer le contenu existant (pages, formulaires, données, réglages)</span>
          </label>

          {/* Error */}
          {error && step === 'error' && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 text-red-700 text-sm rounded-lg">
              <i className="ri-error-warning-line mt-0.5"></i>
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* Preview */}
          {step === 'preview' && blueprint && (
            <div className="bg-background-100/60 border border-background-200/70 rounded-lg p-4">
              <p className="text-sm font-medium text-foreground-800 mb-2">Structure générée :</p>
              <p className="text-sm text-foreground-600">{countSummary(blueprint)}</p>
              <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                {(blueprint.pages || []).map((p) => (
                  <div key={p.slug} className="flex items-center gap-2 text-sm text-foreground-700">
                    <i className={p.icon || 'ri-file-text-line'}></i>
                    <span>{p.title}</span>
                    <span className="text-xs text-foreground-400">/{p.slug}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {step === 'done' && buildResult && (
            <div className="flex items-start gap-2 px-4 py-3 bg-green-50 text-green-700 text-sm rounded-lg">
              <i className="ri-checkbox-circle-line mt-0.5"></i>
              <div>
                <p className="font-medium">App construite avec succès !</p>
                <p className="text-green-600">{resultSummary(buildResult)}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            {step === 'idle' || step === 'error' ? (
              <button
                onClick={generate}
                disabled={!description.trim() || step === 'generating'}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {step === 'generating' ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Génération...
                  </>
                ) : (
                  <>
                    <i className="ri-sparkling-2-line"></i>
                    Générer la structure
                  </>
                )}
              </button>
            ) : step === 'preview' ? (
              <>
                <button
                  onClick={() => { setStep('idle'); setBlueprint(null); }}
                  className="px-4 py-2.5 text-sm text-foreground-600 hover:bg-background-100 rounded-full cursor-pointer whitespace-nowrap"
                >
                  Régénérer
                </button>
                <button
                  onClick={build}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap"
                >
                  <i className="ri-hammer-line"></i>
                  Construire l'app
                </button>
              </>
            ) : step === 'building' ? (
              <button disabled className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium opacity-60 cursor-not-allowed whitespace-nowrap">
                <i className="ri-loader-4-line animate-spin"></i>
                Construction...
              </button>
            ) : step === 'done' ? (
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap"
              >
                Fermer
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}