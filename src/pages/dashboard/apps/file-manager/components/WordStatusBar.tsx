import type { WordStats } from './WordDialogs';

interface WordStatusBarProps {
  stats: WordStats;
  zoom: number;
  onZoom: (z: number) => void;
  spellcheck: boolean;
  onToggleSpellcheck: () => void;
}

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200];

export default function WordStatusBar({
  stats,
  zoom,
  onZoom,
  spellcheck,
  onToggleSpellcheck,
}: WordStatusBarProps) {
  const zoomIn = () => {
    const next = ZOOM_STEPS.find((z) => z > zoom) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
    onZoom(next);
  };
  const zoomOut = () => {
    const reversed = [...ZOOM_STEPS].reverse();
    const next = reversed.find((z) => z < zoom) ?? ZOOM_STEPS[0];
    onZoom(next);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-background-200/70 bg-background-100 text-[11px] text-foreground-500">
      <span className="flex items-center gap-1.5">
        <i className="ri-file-text-line"></i>
        Page {stats.pages} sur {Math.max(stats.pages, 1)}
      </span>
      <span className="w-px h-3.5 bg-background-200/70"></span>
      <span>{stats.words.toLocaleString('fr-FR')} mots</span>
      <span className="w-px h-3.5 bg-background-200/70"></span>
      <span>{stats.characters.toLocaleString('fr-FR')} caractères</span>
      <span className="hidden sm:inline w-px h-3.5 bg-background-200/70"></span>
      <span className="hidden sm:inline">{stats.readingMinutes} min de lecture</span>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSpellcheck}
          title="Vérification orthographique"
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-colors ${
            spellcheck ? 'text-primary-700 hover:bg-background-200/70' : 'text-foreground-400 hover:bg-background-200/70'
          }`}
        >
          <i className={spellcheck ? 'ri-check-double-line' : 'ri-check-double-line'}></i>
          <span className="hidden sm:inline">Orthographe</span>
        </button>
        <span className="w-px h-3.5 bg-background-200/70"></span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_STEPS[0]}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-background-200/70 disabled:opacity-40 cursor-pointer"
            title="Réduire"
          >
            <i className="ri-subtract-line"></i>
          </button>
          <button
            type="button"
            onClick={() => onZoom(100)}
            className="px-1.5 py-1 rounded-md hover:bg-background-200/70 cursor-pointer font-medium"
            title="Réinitialiser le zoom"
          >
            {zoom} %
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-background-200/70 disabled:opacity-40 cursor-pointer"
            title="Agrandir"
          >
            <i className="ri-add-line"></i>
          </button>
        </div>
      </div>
    </div>
  );
}