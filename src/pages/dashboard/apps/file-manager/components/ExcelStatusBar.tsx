export interface ExcelStatusStats {
  sum: number;
  avg: number;
  min: number;
  max: number;
  countNums: number;
  count: number;
}

interface ExcelStatusBarProps {
  stats: ExcelStatusStats | null;
  selectionLabel: string;
  zoom: number;
  onZoomChange: (z: number) => void;
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const r = Math.round(n * 100) / 100;
  return r.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-foreground-400">{label} :</span>
      <span className="font-semibold text-foreground-800">{value}</span>
    </span>
  );
}

export default function ExcelStatusBar({
  stats,
  selectionLabel,
  zoom,
  onZoomChange,
}: ExcelStatusBarProps) {
  const hasNums = !!stats && stats.countNums > 0;
  return (
    <div className="flex items-center gap-4 px-3 py-1 border-t border-background-200/70 bg-background-50 text-xs whitespace-nowrap overflow-x-auto">
      <span className="font-medium text-foreground-600 shrink-0">
        {selectionLabel || 'Aucune sélection'}
      </span>
      {stats && (
        <div className="flex items-center gap-4 text-foreground-600">
          {hasNums && (
            <>
              <Stat label="Somme" value={fmtNum(stats.sum)} />
              <Stat label="Moyenne" value={fmtNum(stats.avg)} />
              <Stat label="Min" value={fmtNum(stats.min)} />
              <Stat label="Max" value={fmtNum(stats.max)} />
            </>
          )}
          <Stat label="Nb valeurs" value={String(stats.count)} />
        </div>
      )}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        <button
          onClick={() => onZoomChange(zoom - 10)}
          className="w-6 h-6 rounded flex items-center justify-center text-foreground-500 hover:bg-background-200/60 cursor-pointer"
          title="Zoom arrière"
        >
          <i className="ri-zoom-out-line text-sm"></i>
        </button>
        <button
          onClick={() => onZoomChange(100)}
          className="min-w-10 h-6 px-1 rounded text-foreground-600 hover:bg-background-200/60 cursor-pointer font-medium"
          title="Réinitialiser le zoom"
        >
          {zoom} %
        </button>
        <button
          onClick={() => onZoomChange(zoom + 10)}
          className="w-6 h-6 rounded flex items-center justify-center text-foreground-500 hover:bg-background-200/60 cursor-pointer"
          title="Zoom avant"
        >
          <i className="ri-zoom-in-line text-sm"></i>
        </button>
      </div>
    </div>
  );
}