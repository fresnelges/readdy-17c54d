import { useEffect, useMemo, useRef, useState } from 'react';

interface WordFindReplaceProps {
  open: boolean;
  onClose: () => void;
  getEditor: () => HTMLDivElement | null;
  notify: (message: string) => void;
}

interface FindWindow {
  find: (
    searchString: string,
    caseSensitive?: boolean,
    backwards?: boolean,
    wrapAround?: boolean,
    wholeWord?: boolean,
    searchInFrames?: boolean,
    showDialog?: boolean,
  ) => boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function WordFindReplace({ open, onClose, getEditor, notify }: WordFindReplaceProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matchCount = useMemo(() => {
    const editor = getEditor();
    if (!editor || !query.trim()) return 0;
    const text = editor.textContent || '';
    const flags = caseSensitive ? 'g' : 'gi';
    const matches = text.match(new RegExp(escapeRegExp(query), flags));
    return matches ? matches.length : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, caseSensitive, open, replacement]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Surlignage de toutes les occurrences dans l'éditeur
  useEffect(() => {
    const editor = getEditor();
    const highlights = (CSS as unknown as { highlights?: { set: (k: string, v: unknown) => void; delete: (k: string) => void } }).highlights;
    const HighlightCtor = (window as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
    if (!editor || !highlights || !HighlightCtor) return;
    highlights.delete('word-find');
    if (!open || !query.trim()) return;
    const ranges: Range[] = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    const needle = caseSensitive ? query : query.toLowerCase();
    let node = walker.nextNode();
    while (node) {
      const raw = node.textContent || '';
      const hay = caseSensitive ? raw : raw.toLowerCase();
      let idx = hay.indexOf(needle);
      while (idx !== -1) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + needle.length);
        ranges.push(range);
        idx = hay.indexOf(needle, idx + needle.length);
      }
      node = walker.nextNode();
    }
    if (ranges.length) highlights.set('word-find', new HighlightCtor(...ranges));
    return () => {
      highlights.delete('word-find');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, caseSensitive, open]);

  if (!open) return null;

  const findNext = (message = 'Aucune correspondance trouvée') => {
    const editor = getEditor();
    if (!editor || !query) return false;
    editor.focus();
    const finder = window as unknown as FindWindow;
    const found = finder.find(query, caseSensitive, false, true, false, false, false);
    if (!found) notify(message);
    return found;
  };

  const replaceCurrent = () => {
    const editor = getEditor();
    if (!editor || !query) return;
    editor.focus();
    const finder = window as unknown as FindWindow;
    const found = finder.find(query, caseSensitive, false, true, false, false, false);
    if (!found) {
      notify('Aucune correspondance trouvée');
      return;
    }
    document.execCommand('insertText', false, replacement);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const replaceAll = () => {
    const editor = getEditor();
    if (!editor || !query) return;
    editor.focus();
    const finder = window as unknown as FindWindow;
    let count = 0;
    for (let i = 0; i < 500; i += 1) {
      const found = finder.find(query, caseSensitive, false, false, false, false, false);
      if (!found) break;
      document.execCommand('insertText', false, replacement);
      count += 1;
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    notify(count > 0 ? `${count} remplacement(s) effectué(s)` : 'Aucune correspondance trouvée');
    onClose();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-background-200/70 bg-background-100">
      <div className="flex items-center gap-1.5 px-2 h-9 rounded-md bg-white border border-background-200/70">
        <i className="ri-search-line text-foreground-400 text-sm"></i>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') findNext();
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Rechercher"
          className="w-40 text-sm bg-transparent focus:outline-none"
        />
        <span className="text-[11px] text-foreground-400">{matchCount} résultat(s)</span>
      </div>

      <div className="flex items-center gap-1.5 px-2 h-9 rounded-md bg-white border border-background-200/70">
        <i className="ri-reply-line text-foreground-400 text-sm rotate-180"></i>
        <input
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') replaceCurrent();
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Remplacer par"
          className="w-40 text-sm bg-transparent focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={() => setCaseSensitive((v) => !v)}
        className={`h-9 px-3 rounded-md text-xs font-medium border cursor-pointer whitespace-nowrap ${
          caseSensitive
            ? 'bg-primary-100 border-primary-200 text-primary-800'
            : 'bg-white border-background-200/70 text-foreground-600 hover:bg-background-50'
        }`}
        title="Respecter la casse"
      >
        Aa
      </button>

      <button
        type="button"
        onClick={() => findNext()}
        className="h-9 px-3 rounded-md text-xs font-medium bg-white border border-background-200/70 text-foreground-700 hover:bg-background-50 cursor-pointer whitespace-nowrap"
      >
        Suivant
      </button>
      <button
        type="button"
        onClick={replaceCurrent}
        disabled={!query}
        className="h-9 px-3 rounded-md text-xs font-medium bg-white border border-background-200/70 text-foreground-700 hover:bg-background-50 disabled:opacity-50 cursor-pointer whitespace-nowrap"
      >
        Remplacer
      </button>
      <button
        type="button"
        onClick={replaceAll}
        disabled={!query}
        className="h-9 px-3 rounded-md text-xs font-medium bg-primary-500 text-background-50 hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap"
      >
        Tout remplacer
      </button>

      <button
        type="button"
        onClick={onClose}
        className="w-9 h-9 rounded-md flex items-center justify-center text-foreground-500 hover:bg-background-200/70 cursor-pointer ml-auto"
        title="Fermer"
      >
        <i className="ri-close-line"></i>
      </button>
    </div>
  );
}