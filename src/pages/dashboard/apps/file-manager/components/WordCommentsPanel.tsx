import { useEffect, useRef, useState } from 'react';
import type { WordComment } from '@/lib/documents';

interface WordCommentsPanelProps {
  open: boolean;
  comments: WordComment[];
  draftId: string | null;
  readOnly: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onConfirm: (id: string, text: string) => void;
  onCancelDraft: (id: string) => void;
  onDelete: (id: string) => void;
  onResolve: (id: string) => void;
}

function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'à l\u2019instant';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function CommentComposer({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const submit = () => {
    if (value.trim()) onSubmit(value.trim());
  };

  return (
    <div className="mt-2">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ajouter un commentaire..."
        rows={3}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit();
        }}
        className="w-full resize-none rounded-md border border-background-200/70 bg-background-50 px-3 py-2 text-sm text-foreground-900 focus:border-primary-300 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-full text-xs font-medium text-foreground-600 hover:bg-background-200/70 cursor-pointer whitespace-nowrap transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="px-3 py-1.5 rounded-full bg-primary-500 text-background-50 text-xs font-medium hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap transition-colors"
        >
          Commenter
        </button>
      </div>
    </div>
  );
}

export default function WordCommentsPanel({
  open,
  comments,
  draftId,
  readOnly,
  onClose,
  onSelect,
  onConfirm,
  onCancelDraft,
  onDelete,
  onResolve,
}: WordCommentsPanelProps) {
  if (!open) return null;

  const activeCount = comments.filter((c) => !c.resolved && c.text).length;

  return (
    <div className="absolute top-0 right-0 bottom-0 z-30 flex w-[340px] flex-col border-l border-background-200/70 bg-background-50 animate-fade-in">
      <div className="flex items-center justify-between gap-2 border-b border-background-200/70 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 flex items-center justify-center text-foreground-600">
            <i className="ri-chat-1-line"></i>
          </span>
          <h4 className="text-sm font-semibold text-foreground-900">Commentaires</h4>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 text-[11px] font-semibold">
              {activeCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 hover:text-foreground-800 cursor-pointer transition-colors"
          title="Fermer le volet"
        >
          <i className="ri-close-line"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto sidebar-scroll px-4 py-4 space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-background-100 flex items-center justify-center text-foreground-400">
              <i className="ri-chat-smile-3-line text-xl"></i>
            </div>
            <p className="mt-3 text-sm text-foreground-600">
              Sélectionnez un passage dans le document, puis cliquez sur « Commenter ».
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const isDraft = comment.id === draftId || !comment.text;
            const isResolved = comment.resolved;
            return (
              <div
                key={comment.id}
                className={`group rounded-lg border p-3 transition-colors ${
                  isDraft
                    ? 'border-primary-300 bg-primary-50/60'
                    : isResolved
                      ? 'border-background-200/70 bg-background-50 opacity-70'
                      : 'border-background-200/70 bg-white'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-secondary-500 text-background-50 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground-900 whitespace-nowrap">
                        {comment.authorName}
                      </span>
                      <span className="text-[11px] text-foreground-400">{relativeTime(comment.createdAt)}</span>
                      {isResolved && (
                        <span className="px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-700 text-[10px] font-medium">
                          Résolu
                        </span>
                      )}
                    </div>

                    {comment.quote && (
                      <button
                        onClick={() => onSelect(comment.id)}
                        title="Voir dans le document"
                        className="mt-1.5 w-full text-left block border-l-2 border-secondary-300 pl-2.5 pr-1 text-[13px] italic text-foreground-500 cursor-pointer hover:text-foreground-700 transition-colors"
                      >
                        « {comment.quote.length > 90 ? `${comment.quote.slice(0, 90)}…` : comment.quote} »
                      </button>
                    )}

                    {isDraft ? (
                      <CommentComposer
                        initial={comment.text}
                        onSubmit={(text) => onConfirm(comment.id, text)}
                        onCancel={() => onCancelDraft(comment.id)}
                      />
                    ) : (
                      <p className="mt-1.5 text-sm text-foreground-700 whitespace-pre-wrap">{comment.text}</p>
                    )}

                    {!isDraft && !readOnly && (
                      <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onResolve(comment.id)}
                          className="px-2 py-1 rounded-md text-[11px] text-foreground-500 hover:bg-background-100 cursor-pointer whitespace-nowrap transition-colors"
                        >
                          {isResolved ? 'Rouvrir' : 'Résoudre'}
                        </button>
                        <button
                          onClick={() => onDelete(comment.id)}
                          className="px-2 py-1 rounded-md text-[11px] text-foreground-500 hover:bg-red-50 hover:text-red-600 cursor-pointer whitespace-nowrap transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}