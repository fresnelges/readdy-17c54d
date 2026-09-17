import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { PowerPointContent, Slide, SlideElement } from '@/lib/documents';
import type { DocumentAiAction } from '@/lib/documentAi';
import WordMenuBar from './WordMenuBar';
import EditorAiModal from './EditorAiModal';
import { EditorShortcutsDialog, EditorAboutDialog } from './EditorHelpDialogs';
import { WordPromptDialog } from './WordDialogs';
import { buildPowerPointMenus, type PowerPointMenuHandlers } from './powerpointMenus';

interface PowerPointEditorProps {
  content: PowerPointContent;
  onChange: (content: PowerPointContent) => void;
  readOnly?: boolean;
  docName?: string;
  canManage?: boolean;
  onSave?: () => void;
  onRename?: (name: string) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  onShare?: () => void;
  onHistory?: () => void;
  onExport?: (format: 'pptx' | 'pdf') => void;
}

const BG_COLORS = ['#ffffff', '#f5f5f4', '#fef3c7', '#ecfdf5', '#eff6ff', '#fdf2f8', '#1f2937'];

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderSlideElement(e: SlideElement, defaultColor: string) {
  const baseStyle: CSSProperties = {
    position: 'absolute',
    left: `${e.x}%`,
    top: `${e.y}%`,
    width: `${e.w}%`,
    height: `${e.h}%`,
  };
  if (e.type === 'image') {
    const img = (
      <img
        src={e.src}
        alt=""
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    );
    return (
      <div key={e.id} style={baseStyle}>
        {e.link ? (
          <a href={e.link} target="_blank" rel="nofollow" style={{ display: 'block', width: '100%', height: '100%' }}>
            {img}
          </a>
        ) : (
          img
        )}
      </div>
    );
  }
  if (e.type === 'shape') {
    const style: CSSProperties = {
      ...baseStyle,
      background: e.fill || 'transparent',
      borderRadius: e.radius ?? 0,
    };
    return e.link ? (
      <a key={e.id} href={e.link} target="_blank" rel="nofollow" style={{ ...style, display: 'block' }}>
        &nbsp;
      </a>
    ) : (
      <div key={e.id} style={style} />
    );
  }
  const justifyContent = e.valign === 'middle' ? 'center' : e.valign === 'bottom' ? 'flex-end' : 'flex-start';
  return (
    <div
      key={e.id}
      style={{
        ...baseStyle,
        background: e.fill || 'transparent',
        display: 'flex',
        flexDirection: 'column',
        justifyContent,
        textAlign: e.align || 'left',
        overflow: 'hidden',
        padding: '0 0.75%',
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: e.html || '' }}
        style={{ color: defaultColor, lineHeight: 1.2, wordBreak: 'break-word' }}
      />
    </div>
  );
}

function SlideStage({ slide }: { slide: Slide }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const canvasW = slide.canvasW || 960;
  const canvasH = slide.canvasH || 540;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / canvasW);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasW]);

  const dark = (slide.bg || '').toLowerCase() === '#1f2937';
  const defaultColor = dark ? '#e5e7eb' : '#1f2937';

  return (
    <div ref={ref} className="w-full relative" style={{ height: 0, paddingBottom: `${(canvasH / canvasW) * 100}%` }}>
      <div
        className="absolute inset-0 overflow-hidden rounded-lg border border-background-200/70"
        style={{
          backgroundColor: slide.bg || '#ffffff',
          backgroundImage: slide.bgImage ? `url(${slide.bgImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div style={{ width: canvasW, height: canvasH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {(slide.elements || []).map((e) => renderSlideElement(e, defaultColor))}
        </div>
      </div>
    </div>
  );
}

export default function PowerPointEditor({
  content,
  onChange,
  readOnly = false,
  docName = 'Présentation',
  canManage = false,
  onSave,
  onRename,
  onDuplicate,
  onDelete,
  onClose,
  onShare,
  onHistory,
  onExport,
}: PowerPointEditorProps) {
  const slides: Slide[] =
    content.slides && content.slides.length > 0
      ? content.slides
      : [{ id: 'initial', title: 'Titre de la diapositive', body: '' }];

  const [currentId, setCurrentId] = useState<string>(slides[0].id);
  const [present, setPresent] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [toast, setToast] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [ai, setAi] = useState<{ open: boolean; action: DocumentAiAction | null }>({
    open: false,
    action: null,
  });
  const [renameOpen, setRenameOpen] = useState(false);
  const toastTimer = useRef<number | null>(null);

  const current = slides.find((s) => s.id === currentId) || slides[0];
  const currentIndex = slides.findIndex((s) => s.id === current.id);
  const isRich = Boolean(current.rich && current.elements && current.elements.length > 0);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const updateSlide = (id: string, patch: Partial<Slide>) => {
    onChange({ slides: slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  };

  const addSlide = () => {
    const id = crypto.randomUUID();
    onChange({ slides: [...slides, { id, title: 'Nouvelle diapositive', body: '', bg: current.bg }] });
    setCurrentId(id);
  };

  const duplicateSlide = (id: string) => {
    const idx = slides.findIndex((s) => s.id === id);
    const src = slides[idx];
    const copyId = crypto.randomUUID();
    const next = [...slides];
    next.splice(idx + 1, 0, { ...src, id: copyId, title: `${src.title} (copie)` });
    onChange({ slides: next });
    setCurrentId(copyId);
  };

  const deleteSlide = (id: string) => {
    if (slides.length <= 1) return;
    const next = slides.filter((s) => s.id !== id);
    onChange({ slides: next });
    setCurrentId(next[0].id);
  };

  const moveSlide = (id: string, dir: -1 | 1) => {
    const idx = slides.findIndex((s) => s.id === id);
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ slides: next });
  };

  const printPresentation = () => {
    let html = '';
    slides.forEach((s) => {
      html += `<div style="page-break-after:always;padding:24px;box-sizing:border-box;">`;
      html += `<h2 style="margin:0 0 12px;font-size:24px;color:#1f2937;">${escapeHtml(s.title || '')}</h2>`;
      html += `<p style="font-size:14px;white-space:pre-wrap;color:#374151;">${escapeHtml(s.body || '')}</p>`;
      html += `</div>`;
    });

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
      `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(docName)}</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:0;}h2{font-size:24px;}p{font-size:14px;white-space:pre-wrap;}</style></head><body>${html}</body></html>`,
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

  const getAiText = (): string => {
    const parts = [current.title, current.body].filter(Boolean);
    return parts.join('\n\n');
  };

  const handleAiInsert = (text: string) => {
    updateSlide(current.id, { body: text });
    setAi({ open: false, action: null });
    notify('Contenu de la diapositive mis à jour.');
  };

  const openPresent = () => {
    setPresentIndex(currentIndex);
    setPresent(true);
  };

  const handlers: PowerPointMenuHandlers = {
    save: () => (onSave ? onSave() : notify('Utilisez le bouton « Sauvegarder » ou Ctrl+S.')),
    duplicate: () => (onDuplicate ? onDuplicate() : notify('Action indisponible ici.')),
    rename: () => (onRename ? setRenameOpen(true) : notify('Renommage indisponible ici.')),
    exportAs: (format) => (onExport ? onExport(format) : notify('Export indisponible.')),
    print: printPresentation,
    share: () => (onShare ? onShare() : notify('Action indisponible ici.')),
    history: () => (onHistory ? onHistory() : notify('Action indisponible ici.')),
    close: () => (onClose ? onClose() : notify('Action indisponible ici.')),
    del: () => (onDelete ? onDelete() : notify('Action indisponible ici.')),
    canManage,

    addSlide,
    duplicateSlide: () => duplicateSlide(current.id),
    deleteSlide: () => deleteSlide(current.id),
    moveUp: () => moveSlide(current.id, -1),
    moveDown: () => moveSlide(current.id, 1),

    align: (a) => updateSlide(current.id, { align: a }),
    setBg: (color) => updateSlide(current.id, { bg: color }),

    settings: { present, zoom },
    togglePresent: () => (present ? setPresent(false) : openPresent()),
    setZoom,

    ai: (action) => setAi({ open: true, action }),

    notify,
    showShortcuts: () => setShowShortcuts(true),
    showAbout: () => setShowAbout(true),
  };

  const groups = buildPowerPointMenus(handlers).filter(
    (g) => !readOnly || ['file', 'view', 'help'].includes(g.key),
  );

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresent(false);
      else if (e.key === 'ArrowRight') setPresentIndex((i) => Math.min(slides.length - 1, i + 1));
      else if (e.key === 'ArrowLeft') setPresentIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [present, slides.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // F5 : lancer / quitter la présentation
      if (e.key === 'F5') {
        e.preventDefault();
        if (present) setPresent(false);
        else openPresent();
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'd') {
        e.preventDefault();
        if (!readOnly) duplicateSlide(current.id);
      } else if (key === 'm') {
        e.preventDefault();
        if (!readOnly) addSlide();
      } else if (key === 'p') {
        e.preventDefault();
        printPresentation();
      } else if (key === '/' || (e.shiftKey && key === '7')) {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present, readOnly, current.id, currentIndex, slides]);

  return (
    <div className="relative flex flex-col h-full bg-background-100">
      <div className="flex items-center gap-1 border-b border-background-200/70 px-2 py-1 bg-background-50">
        <WordMenuBar groups={groups} />
        {readOnly && (
          <span className="ml-auto mr-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background-100 text-[11px] font-medium text-foreground-500 whitespace-nowrap">
            <i className="ri-eye-line"></i>
            Lecture seule
          </span>
        )}
      </div>

      <div className="flex flex-1 h-full min-h-0">
        {/* Liste des diapositives */}
        <div className="w-44 border-r border-background-200/70 bg-background-50 flex flex-col flex-shrink-0">
          <div className="px-3 py-2 border-b border-background-200/70 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-600">Diapositives</span>
            {!readOnly && (
              <button
                onClick={addSlide}
                className="w-6 h-6 rounded hover:bg-background-100 flex items-center justify-center text-foreground-600 cursor-pointer"
                title="Ajouter une diapositive"
              >
                <i className="ri-add-line text-sm"></i>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-2">
            {slides.map((s, i) => (
              <div
                key={s.id}
                onClick={() => setCurrentId(s.id)}
                className={`relative rounded-md border p-2 cursor-pointer transition-colors ${
                  s.id === current.id ? 'border-accent-400 bg-accent-50' : 'border-background-200/70 bg-white hover:border-background-300'
                }`}
              >
                <div
                  className="aspect-video rounded flex items-center justify-center overflow-hidden border border-background-200/70"
                  style={{
                    backgroundColor: s.bg || '#ffffff',
                    backgroundImage: s.bgImage ? `url(${s.bgImage})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <p
                    className="text-[9px] font-semibold text-foreground-700 text-center px-1 w-full truncate"
                    style={{ color: s.bg === '#1f2937' ? '#ffffff' : undefined }}
                  >
                    {s.title || 'Sans titre'}
                  </p>
                </div>
                <span className="block text-center text-[10px] text-foreground-400 mt-1">{i + 1}</span>
                {slides.length > 1 && !readOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSlide(s.id);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 cursor-pointer"
                    title="Supprimer la diapositive"
                  >
                    <i className="ri-close-line text-[10px]"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Édition de la diapositive courante */}
        <div className="flex-1 flex flex-col bg-background-100 min-w-0">
          <div className="flex items-center justify-between px-4 py-2 bg-background-50 border-b border-background-200/70 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {!readOnly && (
                <>
                  <button
                    onClick={() => moveSlide(current.id, -1)}
                    disabled={currentIndex === 0}
                    className="w-7 h-7 rounded-full bg-white border border-background-200/70 flex items-center justify-center text-foreground-600 hover:bg-background-100 disabled:opacity-40 cursor-pointer"
                    title="Monter"
                  >
                    <i className="ri-arrow-up-line text-sm"></i>
                  </button>
                  <button
                    onClick={() => moveSlide(current.id, 1)}
                    disabled={currentIndex === slides.length - 1}
                    className="w-7 h-7 rounded-full bg-white border border-background-200/70 flex items-center justify-center text-foreground-600 hover:bg-background-100 disabled:opacity-40 cursor-pointer"
                    title="Descendre"
                  >
                    <i className="ri-arrow-down-line text-sm"></i>
                  </button>
                </>
              )}
              <span className="text-xs text-foreground-400 ml-1 whitespace-nowrap">
                Diapositive {currentIndex + 1} / {slides.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!readOnly && (
                <>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-foreground-400">Fond</span>
                    {BG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => updateSlide(current.id, { bg: color })}
                        className="w-5 h-5 rounded-full border border-background-200/70 cursor-pointer"
                        style={{ backgroundColor: color }}
                        title="Couleur de fond"
                      ></button>
                    ))}
                  </div>
                  <button
                    onClick={() => duplicateSlide(current.id)}
                    className="w-7 h-7 rounded-full bg-white border border-background-200/70 flex items-center justify-center text-foreground-600 hover:bg-background-100 cursor-pointer"
                    title="Dupliquer la diapositive"
                  >
                    <i className="ri-file-copy-line text-sm"></i>
                  </button>
                  <button
                    onClick={addSlide}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-500 text-background-50 text-xs font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    <i className="ri-add-line"></i>
                    Nouvelle
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Barre de mise en forme du texte */}
          {!readOnly && (
            <div className="flex items-center gap-1 px-4 py-1.5 bg-background-50 border-b border-background-200/70">
              <span className="text-[10px] text-foreground-400 mr-1">Aligner</span>
              {(['left', 'center', 'right'] as const).map((align) => {
                const alignIcon = align === 'left' ? 'ri-align-left' : align === 'center' ? 'ri-align-center' : 'ri-align-right';
                return (
                  <button
                    key={align}
                    onClick={() => updateSlide(current.id, { align })}
                    title={`Aligner ${align === 'left' ? 'à gauche' : align === 'center' ? 'au centre' : 'à droite'}`}
                    className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer ${
                      (current.align || 'left') === align ? 'bg-accent-100 text-accent-700' : 'text-foreground-600 hover:bg-background-100'
                    }`}
                  >
                    <i className={`${alignIcon} text-sm`}></i>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 overflow-auto p-6">
            {isRich ? (
              <div className="max-w-4xl mx-auto">
                <SlideStage slide={current} />
                {!readOnly && (
                  <p className="mt-3 text-center text-[11px] text-foreground-400">
                    Diapositive importée — le design, les images et les liens sont conservés. Ajoutez une nouvelle
                    diapositive pour la modifier en texte.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ zoom: zoom / 100 }}>
                <div
                  className="max-w-3xl mx-auto aspect-video rounded-lg border border-background-200/70 p-6 flex flex-col"
                  style={{ backgroundColor: current.bg || '#ffffff' }}
                >
                  <input
                    value={current.title}
                    onChange={(e) => updateSlide(current.id, { title: e.target.value })}
                    placeholder="Titre de la diapositive"
                    readOnly={readOnly}
                    className="text-2xl font-heading font-bold bg-transparent focus:outline-none placeholder:text-foreground-300 w-full"
                    style={{
                      color: current.bg === '#1f2937' ? '#ffffff' : '#1f2937',
                      textAlign: current.align || 'left',
                    }}
                  />
                  <textarea
                    value={current.body}
                    onChange={(e) => updateSlide(current.id, { body: e.target.value })}
                    placeholder="Cliquez pour ajouter du texte..."
                    readOnly={readOnly}
                    className="mt-3 flex-1 w-full resize-none text-sm bg-transparent focus:outline-none placeholder:text-foreground-300"
                    style={{
                      color: current.bg === '#1f2937' ? '#e5e7eb' : '#1f2937',
                      textAlign: current.align || 'left',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mode présentation */}
      {present && (
        <div className="fixed inset-0 z-[80] bg-foreground-950 flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 bg-foreground-950 text-background-50">
            <span className="text-sm font-medium">
              {docName} · Diapositive {presentIndex + 1} / {slides.length}
            </span>
            <button
              onClick={() => setPresent(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-background-50 hover:bg-foreground-800 cursor-pointer"
              title="Quitter la présentation (Échap)"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
            {slides[presentIndex]?.rich && slides[presentIndex]?.elements?.length ? (
              <div className="w-full max-w-6xl">
                <SlideStage slide={slides[presentIndex]} />
              </div>
            ) : (
              <div
                className="w-full max-w-5xl aspect-video rounded-lg p-10 flex flex-col"
                style={{ backgroundColor: slides[presentIndex]?.bg || '#ffffff' }}
              >
                <h2
                  className="text-4xl font-heading font-bold"
                  style={{
                    color: slides[presentIndex]?.bg === '#1f2937' ? '#ffffff' : '#1f2937',
                    textAlign: slides[presentIndex]?.align || 'left',
                  }}
                >
                  {slides[presentIndex]?.title || ''}
                </h2>
                <p
                  className="mt-6 flex-1 text-lg whitespace-pre-wrap overflow-hidden"
                  style={{
                    color: slides[presentIndex]?.bg === '#1f2937' ? '#e5e7eb' : '#1f2937',
                    textAlign: slides[presentIndex]?.align || 'left',
                  }}
                >
                  {slides[presentIndex]?.body || ''}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-4 pb-6">
            <button
              onClick={() => setPresentIndex((i) => Math.max(0, i - 1))}
              disabled={presentIndex === 0}
              className="w-11 h-11 rounded-full border border-background-300/60 text-background-50 flex items-center justify-center hover:bg-foreground-800 disabled:opacity-40 cursor-pointer"
              title="Diapositive précédente"
            >
              <i className="ri-arrow-left-line text-lg"></i>
            </button>
            <span className="text-sm text-foreground-300">
              {presentIndex + 1} / {slides.length}
            </span>
            <button
              onClick={() => setPresentIndex((i) => Math.min(slides.length - 1, i + 1))}
              disabled={presentIndex === slides.length - 1}
              className="w-11 h-11 rounded-full border border-background-300/60 text-background-50 flex items-center justify-center hover:bg-foreground-800 disabled:opacity-40 cursor-pointer"
              title="Diapositive suivante"
            >
              <i className="ri-arrow-right-line text-lg"></i>
            </button>
          </div>
        </div>
      )}

      <EditorAiModal
        open={ai.open}
        action={ai.action}
        title={ai.action === 'write' ? 'Générer du contenu' : undefined}
        getText={getAiText}
        onInsert={handleAiInsert}
        onClose={() => setAi({ open: false, action: null })}
      />

      <EditorShortcutsDialog
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        shortcuts={[
          ['Ctrl + S', 'Enregistrer le document'],
          ['Ctrl + D', 'Dupliquer la diapositive'],
          ['Ctrl + M', 'Nouvelle diapositive'],
          ['Ctrl + P', 'Imprimer'],
          ['F5', 'Lancer la présentation'],
          ['Échap', 'Quitter la présentation'],
          ['Ctrl + /', 'Afficher les raccourcis'],
        ]}
      />
      <EditorAboutDialog
        open={showAbout}
        title="À propos de l'éditeur de présentations"
        description="Cet éditeur vous permet de créer des diaporamas directement depuis votre espace de travail, avec gestion des diapositives, mise en forme et export multi-format."
        features={[
          'Gestion des diapositives (ajout, duplication, suppression, réorganisation)',
          'Couleur de fond et alignement du texte par diapositive',
          'Mode présentation plein écran',
          'Export PowerPoint et PDF',
          'Assistant IA pour générer et améliorer le contenu',
          'Collaboration et historique des versions',
        ]}
        onClose={() => setShowAbout(false)}
      />

      <WordPromptDialog
        open={renameOpen}
        title="Renommer le document"
        label="Nom du document"
        defaultValue={docName}
        confirmLabel="Renommer"
        onConfirm={(value) => {
          onRename?.(value);
          notify('Document renommé.');
        }}
        onClose={() => setRenameOpen(false)}
      />

      {toast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[70] animate-toast-in px-4 py-2.5 rounded-lg bg-foreground-950 text-background-50 text-xs font-medium max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}