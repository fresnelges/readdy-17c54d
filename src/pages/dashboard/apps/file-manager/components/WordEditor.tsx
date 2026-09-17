import { useEffect, useMemo, useRef, useState } from 'react';
import type { WordContent, WordComment } from '@/lib/documents';
import { htmlToPlainText, type DocumentAiAction } from '@/lib/documentAi';
import WordMenuBar from './WordMenuBar';
import WordToolbar from './WordToolbar';
import WordFindReplace from './WordFindReplace';
import WordAiPanel from './WordAiPanel';
import WordStatusBar from './WordStatusBar';
import WordCommentsPanel from './WordCommentsPanel';
import WordTrackChanges from './WordTrackChanges';
import {
  WordStatsDialog,
  WordShortcutsDialog,
  WordAboutDialog,
  WordPreferencesDialog,
  WordPromptDialog,
  type WordStats,
  type WordPrefs,
} from './WordDialogs';
import { buildWordMenus, type WordMenuHandlers } from './wordMenus';

interface WordEditorProps {
  content: WordContent;
  onChange: (content: WordContent) => void;
  readOnly?: boolean;
  docName?: string;
  canManage?: boolean;
  currentUser?: { id: number; name: string };
  onSave?: () => void;
  onRename?: (name: string) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  onShare?: () => void;
  onHistory?: () => void;
  onExport?: (format: 'docx' | 'pdf' | 'html' | 'txt') => void;
}

interface PromptState {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
}

const BLOCK_TAGS = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'];

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default function WordEditor({
  content,
  onChange,
  readOnly = false,
  docName = 'Document',
  canManage = false,
  currentUser,
  onSave,
  onRename,
  onDuplicate,
  onDelete,
  onClose,
  onShare,
  onHistory,
  onExport,
}: WordEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const aiRangeRef = useRef<Range | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const toastTimer = useRef<number | null>(null);
  const baselineRef = useRef<string>(content.html || '');

  const [findOpen, setFindOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [ruler, setRuler] = useState(false);
  const [toolbar, setToolbar] = useState(true);
  const [marks, setMarks] = useState(false);
  const [spellcheck, setSpellcheck] = useState(true);
  const [pagination, setPagination] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [prefs, setPrefs] = useState<WordPrefs>({ font: 'sans', fontSize: 14, paragraphSpacing: false });
  const [toast, setToast] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [trackChanges, setTrackChanges] = useState(false);
  const [comments, setComments] = useState<WordComment[]>(content.comments || []);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const commentsRef = useRef<WordComment[]>(content.comments || []);
  const [ai, setAi] = useState<{
    open: boolean;
    action: DocumentAiAction | null;
    targetLang?: string;
    targetTone?: string;
  }>({ open: false, action: null });
  const [promptState, setPromptState] = useState<PromptState>({
    open: false,
    title: '',
    label: '',
    onConfirm: () => undefined,
  });

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content.html) {
      editorRef.current.innerHTML = content.html || '';
      commentsRef.current = content.comments || [];
      setComments(content.comments || []);
      setDraftId(null);
    }
  }, [content.html]);

  useEffect(() => {
    if (headerRef.current && headerRef.current.innerHTML !== (content.header || '')) {
      headerRef.current.innerHTML = content.header || '';
    }
    if (footerRef.current && footerRef.current.innerHTML !== (content.footer || '')) {
      footerRef.current.innerHTML = content.footer || '';
    }
  }, [content.header, content.footer]);

  // Restaure l'état visuel des surlignages résolus après chargement du HTML
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    commentsRef.current.forEach((c) => {
      editor.querySelectorAll(`[data-comment-id="${c.id}"]`).forEach((el) => {
        el.classList.toggle('doc-comment-resolved', c.resolved);
      });
    });
  }, [content.html]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Le zoom est appliqué via la propriété CSS `zoom` (mise à l'échelle réelle du contenu)
  useEffect(() => {
    const el = editorRef.current?.parentElement;
    if (el) el.style.setProperty('zoom', String(zoom / 100));
  }, [zoom, pagination]);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const sync = (nextComments?: WordComment[]) => {
    if (!editorRef.current) return;
    const next: WordContent = {
      html: editorRef.current.innerHTML,
      comments: nextComments ?? commentsRef.current,
    };
    if (headerRef.current) next.header = headerRef.current.innerHTML;
    if (footerRef.current) next.footer = footerRef.current.innerHTML;
    onChange(next);
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const exec = (command: string, value?: string) => {
    if (readOnly) return;
    const saved = savedRangeRef.current;
    if (saved && editorRef.current?.contains(saved.commonAncestorContainer)) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(saved);
    }
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    savedRangeRef.current = null;
    sync();
  };

  const insertHtml = (html: string) => {
    if (readOnly) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const ok = document.execCommand('insertHTML', false, html);
    if (!ok) editor.insertAdjacentHTML('beforeend', html);
    sync();
  };

  const insertText = (value: string) => {
    if (readOnly) return;
    editorRef.current?.focus();
    document.execCommand('insertText', false, value);
    sync();
  };

  const insertTable = (rows: number, cols: number) => {
    let html = '<table style="border-collapse:collapse;width:100%;margin:12px 0;"><tbody>';
    for (let r = 0; r < rows; r += 1) {
      html += '<tr>';
      for (let c = 0; c < cols; c += 1) {
        html += '<td style="border:1px solid #cbd5e1;padding:6px 8px;min-width:64px;"><br></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    insertHtml(html);
    notify(`Tableau ${rows} × ${cols} inséré.`);
  };

  const insertTableOfContents = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const headings = Array.from(editor.querySelectorAll('h1, h2, h3, h4'));
    if (headings.length === 0) {
      notify('Ajoutez des titres (Titre 1, 2 ou 3) pour générer un sommaire.');
      return;
    }
    const items = headings
      .map((heading, index) => {
        const tag = heading.tagName.toLowerCase();
        const indent = tag === 'h2' ? 'padding-left:16px;' : tag === 'h3' ? 'padding-left:32px;' : tag === 'h4' ? 'padding-left:48px;' : '';
        return `<li style="${indent}">${escapeHtml(heading.textContent || `Titre ${index + 1}`)}</li>`;
      })
      .join('');
    insertHtml(
      `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:12px 0;"><p style="margin:0 0 8px;font-weight:600;">Table des matières</p><ul style="margin:0;">${items}</ul></div><p><br></p>`,
    );
    notify('Table des matières générée.');
  };

  const setLineHeight = (value: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    let node: HTMLElement | null = selection.anchorNode as HTMLElement | null;
    while (node && node !== editorRef.current) {
      if (node.nodeType === 1 && BLOCK_TAGS.includes(node.tagName)) {
        node.style.lineHeight = value;
        sync();
        return;
      }
      node = node.parentElement;
    }
    notify('Placez le curseur dans un paragraphe.');
  };

  const insertColumns = (count: number) => {
    const cols = Array.from({ length: count })
      .map((_, i) => `<p>Colonne ${i + 1}</p>`)
      .join('');
    insertHtml(`<div style="column-count:${count};column-gap:24px;">${cols}</div><p><br></p>`);
    notify(`${count} colonne${count > 1 ? 's' : ''} insérée${count > 1 ? 's' : ''}.`);
  };

  const printDocument = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);
    const frameDoc = frame.contentWindow?.document;
    if (!frameDoc) {
      document.body.removeChild(frame);
      return;
    }
    frameDoc.open();
    frameDoc.write(
      `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(docName)}</title><style>body{font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111;padding:28px;}h1{font-size:24px}h2{font-size:20px}h3{font-size:16px}table{border-collapse:collapse;width:100%}td{border:1px solid #ccc;padding:6px 8px;vertical-align:top}img{max-width:100%}blockquote{border-left:3px solid #ccc;padding-left:12px;color:#555;margin-left:0}ul,ol{padding-left:24px}</style></head><body>${editor.innerHTML}</body></html>`,
    );
    frameDoc.close();
    window.setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => {
        if (frame.parentNode) document.body.removeChild(frame);
      }, 1500);
    }, 350);
  };

  const readClipboardText = async (): Promise<string | null> => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      notify("Autorisez l'accès au presse-papiers pour coller du contenu.");
      return null;
    }
  };

  const cutSelection = () => {
    if (readOnly) return;
    editorRef.current?.focus();
    document.execCommand('cut');
  };

  const copySelection = () => {
    editorRef.current?.focus();
    document.execCommand('copy');
  };

  const pasteSelection = async () => {
    if (readOnly) return;
    const clipboardAny = navigator.clipboard as unknown as { read?: () => Promise<{ types: string[]; getType: (t: string) => Promise<Blob> }[]> };
    if (clipboardAny.read) {
      try {
        const items = await clipboardAny.read();
        for (const item of items) {
          if (item.types.includes('text/html')) {
            const blob = await item.getType('text/html');
            insertHtml(await blob.text());
            return;
          }
        }
      } catch {
        // on retombe sur le texte brut
      }
    }
    const text = await readClipboardText();
    if (text !== null) insertText(text);
  };

  const pastePlainSelection = async () => {
    if (readOnly) return;
    const text = await readClipboardText();
    if (text !== null) insertText(text);
  };

  const openPrompt = (config: Omit<PromptState, 'open'>) => setPromptState({ ...config, open: true });

  const openLinkDialog = () => {
    const selection = window.getSelection();
    const hasSelection = !!selection && !selection.isCollapsed;
    openPrompt({
      title: 'Insérer un lien',
      label: 'Adresse du lien (URL)',
      placeholder: 'https://exemple.com',
      confirmLabel: 'Insérer',
      onConfirm: (url) => {
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        if (hasSelection) exec('createLink', href);
        else insertHtml(`<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`);
        notify('Lien inséré.');
      },
    });
  };

  const openImageUrlDialog = () => {
    openPrompt({
      title: 'Insérer une image depuis une URL',
      label: "Adresse de l'image",
      placeholder: 'https://.../image.jpg',
      confirmLabel: 'Insérer',
      onConfirm: (url) => {
        insertHtml(`<img src="${escapeHtml(url)}" alt="Image" style="max-width:100%;height:auto;border-radius:6px;margin:8px 0;" />`);
        notify('Image insérée.');
      },
    });
  };

  const openRenameDialog = () => {
    if (!onRename) {
      notify('Le renommage est disponible depuis la barre du haut.');
      return;
    }
    openPrompt({
      title: 'Renommer le document',
      label: 'Nom du document',
      defaultValue: docName,
      confirmLabel: 'Renommer',
      onConfirm: (value) => {
        onRename(value);
        notify('Document renommé.');
      },
    });
  };

  const openAi = (action: DocumentAiAction, options?: { targetLang?: string; targetTone?: string }) => {
    const selection = window.getSelection();
    if (
      selection &&
      !selection.isCollapsed &&
      selection.rangeCount > 0 &&
      editorRef.current?.contains(selection.anchorNode)
    ) {
      aiRangeRef.current = selection.getRangeAt(0).cloneRange();
    } else {
      aiRangeRef.current = null;
    }
    setAi({ open: true, action, targetLang: options?.targetLang, targetTone: options?.targetTone });
  };

  const getAiText = (): string => {
    const selection = window.getSelection();
    const selected = selection && !selection.isCollapsed ? selection.toString() : '';
    if (selected.trim()) return selected.trim();
    return htmlToPlainText(editorRef.current?.innerHTML || '');
  };

  const handleAiInsert = (html: string) => {
    insertHtml(html);
    setAi((prev) => ({ ...prev, open: false }));
    notify('Contenu inséré par l\u2019assistant IA.');
  };

  const handleAiReplace = (html: string) => {
    const range = aiRangeRef.current;
    const editor = editorRef.current;
    if (range && editor && editor.contains(range.commonAncestorContainer)) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      editor.focus();
      document.execCommand('insertHTML', false, html);
    } else if (editor) {
      editor.innerHTML = html;
    }
    aiRangeRef.current = null;
    sync();
    setAi((prev) => ({ ...prev, open: false }));
    notify('Document mis à jour par l\u2019assistant IA.');
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapperRef.current?.requestFullscreen();
    } catch {
      notify('Le mode plein écran n\u2019est pas disponible.');
    }
  };

  const toggleSetting = (key: 'ruler' | 'toolbar' | 'marks' | 'spellcheck' | 'pagination' | 'fullscreen') => {
    if (key === 'ruler') setRuler((v) => !v);
    else if (key === 'toolbar') setToolbar((v) => !v);
    else if (key === 'marks') setMarks((v) => !v);
    else if (key === 'spellcheck') setSpellcheck((v) => !v);
    else if (key === 'pagination') setPagination((v) => !v);
    else void toggleFullscreen();
  };

  const toggleTrackChanges = () => {
    if (readOnly) return;
    setTrackChanges((v) => !v);
  };

  const acceptTrackChanges = () => {
    baselineRef.current = content.html || '';
    setTrackChanges(false);
    notify('Toutes les modifications ont été acceptées.');
  };

  // ── Commentaires ────────────────────────────────────────────
  const applyComments = (next: WordComment[]) => {
    commentsRef.current = next;
    setComments(next);
    sync(next);
  };

  const addComment = () => {
    if (readOnly) return;
    const editor = editorRef.current;
    if (!editor) return;
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      notify('Placez le curseur dans le document et sélectionnez un passage à commenter.');
      return;
    }
    const selectedText = range.toString();
    if (!selectedText.trim()) {
      notify('Sélectionnez d\u2019abord un passage du texte à commenter.');
      return;
    }
    const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const span = document.createElement('span');
    span.setAttribute('data-comment-id', id);
    span.className = 'doc-comment-highlight';
    try {
      range.surroundContents(span);
    } catch {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }
    selection?.removeAllRanges();
    const comment: WordComment = {
      id,
      authorId: currentUser?.id ?? 0,
      authorName: currentUser?.name || 'Utilisateur',
      text: '',
      quote: selectedText.trim(),
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    applyComments([...commentsRef.current, comment]);
    setDraftId(id);
    setCommentsOpen(true);
  };

  const removeHighlightSpan = (id: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.querySelectorAll(`[data-comment-id="${id}"]`).forEach((el) => {
      const parent = el.parentNode;
      while (el.firstChild) parent?.insertBefore(el.firstChild, el);
      parent?.removeChild(el);
    });
  };

  const confirmComment = (id: string, text: string) => {
    if (readOnly) return;
    applyComments(commentsRef.current.map((c) => (c.id === id ? { ...c, text } : c)));
    setDraftId(null);
  };

  const cancelDraft = (id: string) => {
    removeHighlightSpan(id);
    applyComments(commentsRef.current.filter((c) => c.id !== id));
    setDraftId(null);
  };

  const deleteComment = (id: string) => {
    if (readOnly) return;
    removeHighlightSpan(id);
    applyComments(commentsRef.current.filter((c) => c.id !== id));
    if (draftId === id) setDraftId(null);
    notify('Commentaire supprimé.');
  };

  const toggleResolve = (id: string) => {
    if (readOnly) return;
    const target = commentsRef.current.find((c) => c.id === id);
    const resolved = !target?.resolved;
    applyComments(commentsRef.current.map((c) => (c.id === id ? { ...c, resolved } : c)));
    editorRef.current?.querySelectorAll(`[data-comment-id="${id}"]`).forEach((el) => {
      el.classList.toggle('doc-comment-resolved', resolved);
    });
  };

  const selectComment = (id: string) => {
    const el = editorRef.current?.querySelector(`[data-comment-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('doc-comment-flash');
      void el.getBoundingClientRect();
      el.classList.add('doc-comment-flash');
      window.setTimeout(() => el.classList.remove('doc-comment-flash'), 1600);
    }
  };

  const stats: WordStats = useMemo(() => {
    const div = document.createElement('div');
    div.innerHTML = content.html || '';
    const text = (div.textContent || '').trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const blocks = div.querySelectorAll('p,div,h1,h2,h3,h4,li,blockquote').length;
    return {
      words,
      characters: text.length,
      charactersNoSpaces: text.replace(/\s/g, '').length,
      paragraphs: blocks || (text ? 1 : 0),
      readingMinutes: Math.max(1, Math.round(words / 200)),
      pages: Math.max(1, Math.ceil(words / 450)),
    };
  }, [content.html]);

  const handlers: WordMenuHandlers = {
    exec,
    cut: cutSelection,
    copy: copySelection,
    paste: () => void pasteSelection(),
    pastePlain: () => void pastePlainSelection(),
    selectAll: () => exec('selectAll'),
    deleteSelection: () => exec('delete'),
    openFindReplace: () => setFindOpen(true),
    insertImage: () => imageInputRef.current?.click(),
    insertImageFromUrl: openImageUrlDialog,
    insertTable,
    insertLink: openLinkDialog,
    insertHtml,
    insertText,
    addComment,
    toggleComments: () => setCommentsOpen((v) => !v),
    lineHeight: setLineHeight,
    columns: insertColumns,
    insertTableOfContents,
    save: () => (onSave ? onSave() : notify('Utilisez le bouton « Sauvegarder » ou Ctrl+S.')),
    print: printDocument,
    exportAs: (format) => (onExport ? onExport(format) : notify('Export indisponible pour ce document.')),
    rename: openRenameDialog,
    duplicate: () => (onDuplicate ? onDuplicate() : notify('Action indisponible ici.')),
    del: () => (onDelete ? onDelete() : notify('Action indisponible ici.')),
    close: () => (onClose ? onClose() : notify('Action indisponible ici.')),
    share: () => (onShare ? onShare() : notify('Action indisponible ici.')),
    history: () => (onHistory ? onHistory() : notify('Action indisponible ici.')),
    importFile: () => importInputRef.current?.click(),
    setZoom,
    toggleSetting,
    settings: { ruler, toolbar, marks, spellcheck, pagination, fullscreen, zoom },
    showStats: () => setShowStats(true),
    showShortcuts: () => setShowShortcuts(true),
    showAbout: () => setShowAbout(true),
    showPreferences: () => setShowPrefs(true),
    notify,
    ai: openAi,
    trackChanges,
    toggleTrackChanges,
    acceptTrackChanges,
    canManage,
  };

  const groups = buildWordMenus(handlers).filter(
    (g) => !readOnly || ['file', 'view', 'help'].includes(g.key),
  );

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Veuillez choisir un fichier image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notify('Image trop lourde (2 Mo maximum).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      insertHtml(
        `<img src="${String(reader.result)}" alt="${escapeHtml(file.name)}" style="max-width:100%;height:auto;border-radius:6px;margin:8px 0;" />`,
      );
      notify('Image insérée.');
    };
    reader.readAsDataURL(file);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const raw = await file.text();
      const lower = file.name.toLowerCase();
      const html =
        lower.endsWith('.html') || lower.endsWith('.htm')
          ? raw
          : raw
              .split(/\n{2,}/)
              .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
              .join('');
      const editor = editorRef.current;
      if (editor) {
        editor.innerHTML = html;
        sync();
        notify(`« ${file.name} » importé.`);
      }
    } catch {
      notify('Impossible de lire ce fichier.');
    }
  };

  const actionsRef = useRef({
    insertLink: openLinkDialog,
    print: printDocument,
    showStats: () => setShowStats(true),
    showShortcuts: () => setShowShortcuts(true),
    addComment,
    toggleComments: () => setCommentsOpen((v) => !v),
  });
  actionsRef.current = {
    insertLink: openLinkDialog,
    print: printDocument,
    showStats: () => setShowStats(true),
    showShortcuts: () => setShowShortcuts(true),
    addComment,
    toggleComments: () => setCommentsOpen((v) => !v),
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'f') {
        e.preventDefault();
        if (!readOnly) setFindOpen(true);
      } else if (key === 'k') {
        e.preventDefault();
        if (!readOnly) actionsRef.current.insertLink();
      } else if (key === 'm' && e.altKey) {
        e.preventDefault();
        if (!readOnly) actionsRef.current.addComment();
      } else if (key === 'a' && e.altKey && e.shiftKey) {
        e.preventDefault();
        actionsRef.current.toggleComments();
      } else if (key === 'p') {
        e.preventDefault();
        actionsRef.current.print();
      } else if (key === '/' || (e.shiftKey && key === '7')) {
        e.preventDefault();
        actionsRef.current.showShortcuts();
      } else if (e.shiftKey && key === 'c') {
        e.preventDefault();
        actionsRef.current.showStats();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [readOnly]);

  const fontFamily =
    prefs.font === 'serif'
      ? 'Georgia, "Times New Roman", serif'
      : prefs.font === 'mono'
        ? 'ui-monospace, Menlo, Consolas, monospace'
        : undefined;

  const editorClass = [
    'word-editor focus:outline-none',
    marks ? 'editor-marks' : '',
    prefs.paragraphSpacing ? 'editor-spaced' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const hasHeader = Boolean(content.header && content.header.trim());
  const hasFooter = Boolean(content.footer && content.footer.trim());

  return (
    <div ref={wrapperRef} className="relative flex flex-col h-full bg-background-50 overflow-hidden">
      <div className="flex items-center gap-1 border-b border-background-200/70 px-2 py-1 bg-background-50">
        <WordMenuBar groups={groups} />
        <div className="ml-auto mr-1 flex items-center gap-1">
          <button
            onClick={() => setCommentsOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-foreground-600 hover:bg-background-100 cursor-pointer whitespace-nowrap transition-colors"
            title={commentsOpen ? 'Masquer les commentaires' : 'Afficher les commentaires'}
          >
            <i className="ri-chat-1-line"></i>
            Commentaires
            {comments.length > 0 && (
              <span className="px-1.5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-semibold">
                {comments.filter((c) => !c.resolved && c.text).length || comments.length}
              </span>
            )}
          </button>
          {readOnly && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background-100 text-[11px] font-medium text-foreground-500 whitespace-nowrap">
              <i className="ri-eye-line"></i>
              Lecture seule
            </span>
          )}
        </div>
      </div>

      {toolbar && !readOnly && (
        <WordToolbar
          onExec={exec}
          onSaveSelection={saveSelection}
          onInsertLink={openLinkDialog}
          onInsertTable={() => insertTable(3, 3)}
          onInsertImage={() => imageInputRef.current?.click()}
          onOpenFind={() => setFindOpen(true)}
          onAddComment={addComment}
          onToggleComments={() => setCommentsOpen((v) => !v)}
          trackChanges={trackChanges}
          onToggleTrackChanges={toggleTrackChanges}
        />
      )}

      {findOpen && !readOnly && (
        <WordFindReplace
          open={findOpen}
          onClose={() => setFindOpen(false)}
          getEditor={() => editorRef.current}
          notify={notify}
        />
      )}

      {ruler && (
        <div className="flex justify-center border-b border-background-200/70 bg-background-50 px-8 py-1.5">
          <div
            className={pagination ? 'w-full max-w-[760px] h-3.5' : 'w-full h-3.5'}
            style={{
              backgroundImage:
                'repeating-linear-gradient(to right, oklch(var(--foreground-300)) 0 1px, transparent 1px 12px)',
              backgroundSize: 'auto 6px',
              backgroundPosition: 'bottom left',
              backgroundRepeat: 'repeat-x',
            }}
          ></div>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        {trackChanges && !readOnly ? (
          <WordTrackChanges
            baselineHtml={baselineRef.current || ''}
            currentHtml={content.html || ''}
            pagination={pagination}
            fontSize={prefs.fontSize}
            fontFamily={fontFamily}
            onAcceptAll={acceptTrackChanges}
            onResume={() => setTrackChanges(false)}
          />
        ) : (
          <div className="h-full overflow-auto bg-background-100">
            <div
              className={
                pagination
                  ? 'mx-auto my-6 w-[820px] min-h-[1060px] bg-white border border-background-200/70 rounded-lg px-14 py-14'
                  : 'px-10 py-8'
              }
            >
              {hasHeader && (
                <div className="mb-4">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-foreground-400 select-none">
                    En-tête
                  </div>
                  <div
                    ref={headerRef}
                    contentEditable={!readOnly}
                    suppressContentEditableWarning
                    spellCheck={spellcheck}
                    onInput={() => sync()}
                    onBlur={() => sync()}
                    className="word-editor-header focus:outline-none border-b border-dashed border-background-300/60 pb-3"
                    style={{ lineHeight: 1.5, fontSize: `${prefs.fontSize}px`, fontFamily }}
                  ></div>
                </div>
              )}
              <div
                ref={editorRef}
              contentEditable={!readOnly}
              suppressContentEditableWarning
              spellCheck={spellcheck}
              onInput={sync}
              onBlur={sync}
              data-placeholder="Commencez à écrire votre document..."
              className={editorClass}
              style={{ minHeight: pagination ? '900px' : '480px', lineHeight: 1.7, fontSize: `${prefs.fontSize}px`, fontFamily }}
              ></div>
              {hasFooter && (
                <div className="mt-4">
                  <div
                    ref={footerRef}
                    contentEditable={!readOnly}
                    suppressContentEditableWarning
                    spellCheck={spellcheck}
                    onInput={() => sync()}
                    onBlur={() => sync()}
                    className="word-editor-footer focus:outline-none border-t border-dashed border-background-300/60 pt-3"
                    style={{ lineHeight: 1.5, fontSize: `${prefs.fontSize}px`, fontFamily }}
                  ></div>
                  <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-foreground-400 select-none">
                    Pied de page
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <WordAiPanel
          open={ai.open}
          action={ai.action}
          targetLang={ai.targetLang}
          targetTone={ai.targetTone}
          getText={getAiText}
          onInsert={handleAiInsert}
          onReplace={handleAiReplace}
          onClose={() => setAi((prev) => ({ ...prev, open: false }))}
        />

        <WordCommentsPanel
          open={commentsOpen}
          comments={comments}
          draftId={draftId}
          readOnly={readOnly}
          onClose={() => setCommentsOpen(false)}
          onSelect={selectComment}
          onConfirm={confirmComment}
          onCancelDraft={cancelDraft}
          onDelete={deleteComment}
          onResolve={toggleResolve}
        />
      </div>

      <WordStatusBar
        stats={stats}
        zoom={zoom}
        onZoom={setZoom}
        spellcheck={spellcheck}
        onToggleSpellcheck={() => setSpellcheck((v) => !v)}
      />

      {toast && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[70] animate-toast-in px-4 py-2.5 rounded-lg bg-foreground-950 text-background-50 text-xs font-medium max-w-[90%] text-center">
          {toast}
        </div>
      )}

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
      <input
        ref={importInputRef}
        type="file"
        accept=".txt,.html,.htm,.md,text/plain,text/html"
        className="hidden"
        onChange={handleImport}
      />

      <WordStatsDialog open={showStats} stats={stats} onClose={() => setShowStats(false)} />
      <WordShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <WordAboutDialog open={showAbout} onClose={() => setShowAbout(false)} />
      <WordPreferencesDialog
        open={showPrefs}
        prefs={prefs}
        onChange={setPrefs}
        onClose={() => setShowPrefs(false)}
      />
      <WordPromptDialog
        open={promptState.open}
        title={promptState.title}
        label={promptState.label}
        placeholder={promptState.placeholder}
        defaultValue={promptState.defaultValue}
        confirmLabel={promptState.confirmLabel}
        onConfirm={promptState.onConfirm}
        onClose={() => setPromptState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}