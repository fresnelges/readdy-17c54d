export interface DailyPoint {
  key: string;
  label: string;
  count: number;
}

interface DailyChartProps {
  days: DailyPoint[];
  total: number;
}

/**
 * Graphique à barres de l'évolution des événements captés sur les 30 derniers
 * jours. Sans dépendance externe : barres en div, tooltip natif au survol.
 */
export default function DailyChart({ days, total }: DailyChartProps) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const mid = days[Math.floor(days.length / 2)]?.label ?? '';

  return (
    <div className="mt-4 p-4 bg-background-100 rounded-lg">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-semibold text-foreground-700 flex items-center gap-1.5">
          <i className="ri-line-chart-line text-accent-600"></i>
          Évolution sur 30 jours
        </p>
        <p className="text-xs text-foreground-500 whitespace-nowrap">
          <span className="font-bold text-foreground-900">{total.toLocaleString('fr-FR')}</span> événements
        </p>
      </div>

      <div className="flex items-end gap-[3px] h-32">
        {days.map((d) => {
          const pct = d.count === 0 ? 0 : Math.max(6, Math.round((d.count / max) * 100));
          return (
            <div
              key={d.key}
              title={`${d.label} : ${d.count} événement${d.count > 1 ? 's' : ''}`}
              className="flex-1 min-w-0 h-full flex items-end cursor-default"
            >
              <div
                className={`w-full rounded-t-[2px] transition-colors ${
                  d.count === 0 ? 'bg-background-200/70' : 'bg-accent-500 hover:bg-accent-600'
                }`}
                style={{ height: d.count === 0 ? '2px' : `${pct}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-foreground-400">{days[0]?.label}</span>
        <span className="text-[10px] text-foreground-400">{mid}</span>
        <span className="text-[10px] text-foreground-400">{days[days.length - 1]?.label}</span>
      </div>
    </div>
  );
}