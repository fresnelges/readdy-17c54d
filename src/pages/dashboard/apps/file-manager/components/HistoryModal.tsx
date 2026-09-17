import { useState, useEffect } from 'react';
import { fetchVersions, type DocVersion } from '@/lib/documents';
import type { DocDocument } from '@/lib/documents';

interface HistoryModalProps {
  document: DocDocument;
  canEdit: boolean;
  onClose: () => void;
  onRestore: (content: Record<string, unknown>) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(sameDay ? {} : { year: 'numeric' }),
  }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryModal({ document, canEdit, onClose, onRestore }: HistoryModalProps) {
  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const v = await fetchVersions(document.id);
        setVersions(v);
      } catch {
        setError('Erreur lors du chargement de l\'historique.');
      }
      setLoading(false);
    };
    load();
  }, [document.id]);

  const handleRestore = async (v: DocVersion) => {
    if (!v.content) return;
    setRestoringId(v.id);
    await onRestore(v.content);
    setRestoringId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-background-50 rounded-xl animate-scale-in overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-background-200/70">
          <div>
            <h3 className="text-lg font-semibold font-heading text-foreground-950">Historique des modifications</h3>
            <p className="text-sm text-foreground-500 truncate">{document.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg mb-3">
              <i className="ri-error-warning-line"></i>
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <i className="ri-history-line text-3xl text-foreground-300 mb-3"></i>
              <p className="text-foreground-500 text-sm">Aucune modification enregistrée pour le moment.</p>
              <p className="text-foreground-400 text-xs mt-1">
                Chaque sauvegarde sera consignée ici avec le nom de son auteur.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((v, i) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 p-3 border border-background-200/70 rounded-lg"
                >
                  <div className="w-9 h-9 rounded-full bg-background-100 text-foreground-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {(v.user_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground-800 truncate">
                      {v.user_name || 'Utilisateur'}
                      {i === 0 && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-primary-600">
                          Dernière
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-foreground-400">{formatDate(v.created_at)}</p>
                  </div>
                  {canEdit && v.content && (
                    <button
                      onClick={() => handleRestore(v)}
                      disabled={restoringId === v.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-background-100 hover:bg-accent-100 text-xs font-medium text-foreground-700 hover:text-accent-700 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <i className={`ri-${restoringId === v.id ? 'loader-4-line animate-spin' : 'restart-line'}`}></i>
                      Restaurer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}