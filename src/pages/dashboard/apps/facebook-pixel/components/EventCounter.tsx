import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import DailyChart, { DailyPoint } from './DailyChart';

const EVENT_DEFS = [
  { name: 'PageView', icon: 'ri-eye-line', desc: 'Pages visitées' },
  { name: 'ViewContent', icon: 'ri-file-search-line', desc: 'Produits consultés' },
  { name: 'Lead', icon: 'ri-user-add-line', desc: 'Formulaires soumis' },
  { name: 'Search', icon: 'ri-search-line', desc: 'Recherches effectuées' },
  { name: 'AddToCart', icon: 'ri-shopping-cart-line', desc: 'Ajouts au panier' },
  { name: 'Purchase', icon: 'ri-shopping-bag-line', desc: 'Commandes validées' },
];

interface EventCounterProps {
  storeId: number;
}

interface EventRow {
  event_name: string;
  created_at: string;
}

export default function EventCounter({ storeId }: EventCounterProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [last24h, setLast24h] = useState(0);
  const [last7d, setLast7d] = useState(0);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [total30d, setTotal30d] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: readError } = await supabase
        .from('facebook_pixel_events')
        .select('event_name, created_at')
        .eq('idcommerce', storeId)
        .order('created_at', { ascending: false })
        .limit(5000);

      if (readError) throw readError;

      const rows = (data || []) as EventRow[];
      setTotal(rows.length);

      const perEvent: Record<string, number> = {};
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      let c24 = 0;
      let c7 = 0;

      for (const row of rows) {
        perEvent[row.event_name] = (perEvent[row.event_name] || 0) + 1;
        const t = new Date(row.created_at).getTime();
        if (!Number.isNaN(t)) {
          if (now - t <= dayMs) c24 += 1;
          if (now - t <= 7 * dayMs) c7 += 1;
        }
      }

      // Répartition par jour sur les 30 derniers jours.
      const today = new Date();
      const days: DailyPoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        days.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          count: 0,
        });
      }
      const dayIndex = new Map(days.map((d, idx) => [d.key, idx]));
      for (const row of rows) {
        const t = new Date(row.created_at);
        if (Number.isNaN(t.getTime())) continue;
        const k = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
        const idx = dayIndex.get(k);
        if (idx !== undefined) days[idx].count += 1;
      }

      setDaily(days);
      setTotal30d(days.reduce((s, d) => s + d.count, 0));
      setCounts(perEvent);
      setLast24h(c24);
      setLast7d(c7);
    } catch {
      setError('Impossible de charger les compteurs. Réessayez.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const maxCount = Math.max(1, ...Object.values(counts));

  return (
    <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
            <i className="ri-pulse-line text-accent-600"></i>
            Événements captés
          </h4>
          <p className="text-xs text-foreground-500 mt-0.5">
            Compteur des événements envoyés au pixel depuis votre boutique.
          </p>
        </div>
        <button
          onClick={fetchCounts}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-background-100 text-foreground-600 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer hover:bg-background-200/70 transition-colors disabled:opacity-50"
        >
          <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i>
          Actualiser
        </button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 text-sm rounded-lg">
          <i className="ri-error-warning-line"></i>
          {error}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-10">
          <i className="ri-loader-4-line animate-spin text-xl text-primary-500"></i>
        </div>
      ) : (
        <>
          {/* Totaux */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="p-4 bg-background-100 rounded-lg">
              <p className="text-xs text-foreground-500">Total</p>
              <p className="text-2xl font-bold text-foreground-950 mt-1 font-heading">
                {total.toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="p-4 bg-background-100 rounded-lg">
              <p className="text-xs text-foreground-500">24 dernières heures</p>
              <p className="text-2xl font-bold text-accent-600 mt-1 font-heading">
                {last24h.toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="p-4 bg-background-100 rounded-lg">
              <p className="text-xs text-foreground-500">7 derniers jours</p>
              <p className="text-2xl font-bold text-foreground-950 mt-1 font-heading">
                {last7d.toLocaleString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Graphique d'évolution sur 30 jours */}
          {total > 0 && (
            <DailyChart days={daily} total={total30d} />
          )}

          {/* Détail par événement */}
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mb-3">
                <i className="ri-radar-line text-xl text-foreground-400"></i>
              </div>
              <p className="text-sm text-foreground-600 font-medium">Aucun événement capté pour l'instant</p>
              <p className="text-xs text-foreground-400 mt-1 max-w-xs">
                Dès que votre pixel est actif et que des visiteurs naviguent sur votre boutique, les événements apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {EVENT_DEFS.map((ev) => {
                const count = counts[ev.name] || 0;
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={ev.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-background-100 flex items-center justify-center flex-shrink-0">
                      <i className={`${ev.icon} text-sm text-foreground-500`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-semibold text-foreground-700 whitespace-nowrap">{ev.name}</p>
                        <p className="text-xs font-bold text-foreground-900 whitespace-nowrap">
                          {count.toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <div className="h-1.5 rounded-full bg-background-200/70 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent-500 transition-all"
                          style={{ width: `${count === 0 ? 0 : Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}