import { useMemo } from 'react';
import { diffWords, htmlToText, diffStats } from '@/lib/diff';

interface WordTrackChangesProps {
  baselineHtml: string;
  currentHtml: string;
  pagination: boolean;
  fontSize: number;
  fontFamily?: string;
  onAcceptAll: () => void;
  onResume: () => void;
}

export default function WordTrackChanges({
  baselineHtml,
  currentHtml,
  pagination,
  fontSize,
  fontFamily,
  onAcceptAll,
  onResume,
}: WordTrackChangesProps) {
  const tokens = useMemo(
    () => diffWords(htmlToText(baselineHtml), htmlToText(currentHtml)),
    [baselineHtml, currentHtml],
  );
  const stats = useMemo(() => diffStats(tokens), [tokens]);
  const hasChanges = stats.added > 0 || stats.removed > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 flex-wrap px-4 py-2 border-b border-background-200/70 bg-background-100">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground-800 whitespace-nowrap">
          <i className="ri-edit-circle-line text-sm text-accent-600"></i>
          Suivi des modifications
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-accent-700 whitespace-nowrap">
          <i className="ri-add-circle-line"></i>
          {stats.added} ajout{stats.added > 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-red-600 whitespace-nowrap">
          <i className="ri-subtract-line"></i>
          {stats.removed} suppression{stats.removed > 1 ? 's' : ''}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onAcceptAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-foreground-700 hover:bg-background-200/70 cursor-pointer whitespace-nowrap transition-colors"
            title="Considérer le contenu actuel comme la nouvelle référence"
          >
            <i className="ri-check-double-line"></i>
            Accepter tout
          </button>
          <button
            onClick={onResume}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500 text-background-50 text-xs font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap transition-colors"
            title="Revenir à l'édition du document"
          >
            <i className="ri-pencil-line"></i>
            Reprendre l'édition
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-background-100">
        <div
          className={
            pagination
              ? 'mx-auto my-6 w-[820px] min-h-[1060px] bg-white border border-background-200/70 rounded-lg px-14 py-14'
              : 'px-10 py-8'
          }
        >
          <div
            className="word-editor text-foreground-900"
            style={{ whiteSpace: 'pre-wrap', fontSize: `${fontSize}px`, lineHeight: 1.7, fontFamily }}
          >
            {!hasChanges ? (
              <p className="text-foreground-400 italic">
                Aucune modification depuis la dernière version enregistrée.
              </p>
            ) : (
              tokens.map((t, idx) =>
                t.type === 'add' ? (
                  <span key={idx} className="track-add">
                    {t.value}
                  </span>
                ) : t.type === 'remove' ? (
                  <span key={idx} className="track-del">
                    {t.value}
                  </span>
                ) : (
                  <span key={idx}>{t.value}</span>
                ),
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}