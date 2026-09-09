import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface VisitData {
  date: string;
  count: number;
}

type Period = '7' | '30';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [stats, setStats] = useState<{ produit: string; ip: string; temps: string }[]>([]);
  const [visitPeriod, setVisitPeriod] = useState<Period>('7');
  const [visitData, setVisitData] = useState<VisitData[]>([]);
  const [totalVisitsPeriod, setTotalVisitsPeriod] = useState(0);
  const [visitsToday, setVisitsToday] = useState(0);

  const fetchVisitChart = useCallback(async (period: Period) => {
    if (!user) return;
    try {
      const now = new Date();
      const daysAgo = new Date();
      daysAgo.setDate(now.getDate() - parseInt(period));
      const startISO = daysAgo.toISOString();

      const { data, error: visitErr } = await supabase
        .from('visitesiteweb')
        .select('date')
        .eq('boutique_nom', user.nomcommerce)
        .gte('date', startISO)
        .order('date', { ascending: true });

      if (visitErr) throw visitErr;

      const dayMap: Record<string, number> = {};
      for (let i = 0; i < parseInt(period); i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dayMap[key] = 0;
      }

      (data || []).forEach((row: { date: string }) => {
        const key = row.date ? row.date.split('T')[0] : '';
        if (dayMap[key] !== undefined) dayMap[key]++;
      });

      const chartData = Object.entries(dayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({
          date: new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          count,
        }));

      const todayKey = now.toISOString().split('T')[0];
      const total = chartData.reduce((s, d) => s + d.count, 0);

      setVisitData(chartData);
      setTotalVisitsPeriod(total);
      setVisitsToday(dayMap[todayKey] || 0);
    } catch {
      setVisitData([]);
      setTotalVisitsPeriod(0);
      setVisitsToday(0);
    }
  }, [user]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productRes, orderRes, clientRes, statsRes] = await Promise.all([
        supabase.from('product_items').select('id', { count: 'exact', head: true }),
        supabase.from('order_headers').select('id', { count: 'exact', head: true }),
        user ? supabase.from('clientshop').select('id', { count: 'exact', head: true }).eq('idshop', user.id) : Promise.resolve({ count: 0 }),
        supabase.from('zifekproductstats').select('produit,ip,temps').order('temps', { ascending: false }).limit(50),
      ]);

      setProductCount(productRes.count || 0);
      setOrderCount(orderRes.count || 0);
      setClientCount(clientRes.count || 0);
      setStats(statsRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchVisitChart(visitPeriod);
    }
  }, [fetchData, fetchVisitChart, user, visitPeriod]);

  // Get top products
  const productVisits: Record<string, number> = {};
  stats.forEach((s) => {
    productVisits[s.produit] = (productVisits[s.produit] || 0) + 1;
  });
  const topProducts = Object.entries(productVisits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const todayFromStats = stats.filter((s) => {
    const d = new Date(s.temps);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const visitsThisWeek = stats.filter((s) => {
    const d = new Date(s.temps);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Statistiques</h2>
        <p className="text-sm text-foreground-500 mt-1">Aperçu des performances de votre boutique</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4 md:p-5">
          <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center mb-3">
            <i className="ri-eye-line text-lg"></i>
          </div>
          <div className="text-2xl md:text-3xl font-bold font-heading text-foreground-950">{todayFromStats}</div>
          <div className="text-xs text-foreground-500 mt-1">Visites produit aujourd&apos;hui</div>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4 md:p-5">
          <div className="w-9 h-9 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center mb-3">
            <i className="ri-bar-chart-line text-lg"></i>
          </div>
          <div className="text-2xl md:text-3xl font-bold font-heading text-foreground-950">{visitsThisWeek}</div>
          <div className="text-xs text-foreground-500 mt-1">7 derniers jours (produits)</div>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4 md:p-5">
          <div className="w-9 h-9 rounded-lg bg-secondary-100 text-secondary-700 flex items-center justify-center mb-3">
            <i className="ri-shopping-bag-3-line text-lg"></i>
          </div>
          <div className="text-2xl md:text-3xl font-bold font-heading text-foreground-950">{productCount}</div>
          <div className="text-xs text-foreground-500 mt-1">Produits</div>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4 md:p-5">
          <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
            <i className="ri-file-list-3-line text-lg"></i>
          </div>
          <div className="text-2xl md:text-3xl font-bold font-heading text-foreground-950">{orderCount}</div>
          <div className="text-xs text-foreground-500 mt-1">Commandes</div>
        </div>
      </div>

      {/* Visits Evolution Chart */}
      <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground-700 flex items-center gap-2">
              <i className="ri-line-chart-line text-primary-500"></i>
              Évolution des visites
            </h3>
            <p className="text-xs text-foreground-400 mt-0.5">
              {totalVisitsPeriod} visites sur {visitPeriod} jours — {visitsToday} aujourd&apos;hui
            </p>
          </div>
          <div className="flex items-center gap-0.5 bg-background-100 rounded-full p-0.5 self-start">
            {(['7', '30'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setVisitPeriod(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  visitPeriod === p
                    ? 'bg-background-50 text-foreground-900 shadow-sm'
                    : 'text-foreground-500 hover:text-foreground-700'
                }`}
              >
                {p} jours
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
          </div>
        ) : visitData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-foreground-400">
            <i className="ri-bar-chart-2-line text-3xl mb-2"></i>
            <p className="text-sm">Aucune donnée de visite pour cette période</p>
          </div>
        ) : (
          <div className="h-60 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--foreground-200) / 0.4)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'oklch(var(--foreground-500))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'oklch(var(--foreground-200) / 0.4)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'oklch(var(--foreground-500))' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(var(--background-50))',
                    border: '1px solid oklch(var(--foreground-200) / 0.4)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'oklch(var(--foreground-900))',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Visites"
                  stroke="oklch(var(--primary-500))"
                  strokeWidth={2}
                  dot={{ fill: 'oklch(var(--primary-500))', r: 3, strokeWidth: 0 }}
                  activeDot={{ fill: 'oklch(var(--primary-500))', r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {error && (
        <div className="flex flex-col items-center justify-center py-6 mb-6">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap">
            Réessayer
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Top Products */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground-700 mb-4 flex items-center gap-2">
            <i className="ri-trophy-line text-primary-500"></i>
            Produits les plus consultés
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-foreground-400 py-4 text-center">Aucune donnée disponible</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-secondary-100 flex items-center justify-center text-xs font-bold text-secondary-700 flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground-900 truncate">{name}</div>
                    <div className="h-1.5 bg-background-200/70 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-primary-400 rounded-full transition-all"
                        style={{ width: `${(count / topProducts[0][1]) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-foreground-600 whitespace-nowrap">{count} vues</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Visits */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground-700 mb-4 flex items-center gap-2">
            <i className="ri-history-line text-accent-500"></i>
            Visites récentes
          </h3>
          {stats.length === 0 ? (
            <p className="text-sm text-foreground-400 py-4 text-center">Aucune visite enregistrée</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stats.slice(0, 10).map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-background-200/70 last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm text-foreground-900 truncate">{stat.produit}</div>
                    <div className="text-xs text-foreground-400">{stat.ip}</div>
                  </div>
                  <span className="text-xs text-foreground-500 whitespace-nowrap">
                    {new Date(stat.temps).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overview */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground-700 mb-4 flex items-center gap-2">
            <i className="ri-pie-chart-line text-secondary-700"></i>
            Résumé global
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-background-100 rounded-lg">
              <div className="text-xl font-bold font-heading text-primary-600">{productCount}</div>
              <div className="text-xs text-foreground-500">Produits actifs</div>
            </div>
            <div className="text-center p-3 bg-background-100 rounded-lg">
              <div className="text-xl font-bold font-heading text-accent-600">{clientCount}</div>
              <div className="text-xs text-foreground-500">Clients</div>
            </div>
            <div className="text-center p-3 bg-background-100 rounded-lg">
              <div className="text-xl font-bold font-heading text-secondary-700">{orderCount}</div>
              <div className="text-xs text-foreground-500">Commandes</div>
            </div>
            <div className="text-center p-3 bg-background-100 rounded-lg">
              <div className="text-xl font-bold font-heading text-foreground-900">{stats.length}</div>
              <div className="text-xs text-foreground-500">Visites produit</div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground-700 mb-4 flex items-center gap-2">
            <i className="ri-rocket-line text-primary-500"></i>
            Actions recommandées
          </h3>
          <div className="space-y-2">
            {productCount === 0 && (
              <div className="flex items-center gap-3 p-3 bg-background-100 rounded-lg">
                <i className="ri-add-circle-line text-primary-500"></i>
                <div className="text-sm">
                  <span className="text-foreground-900 font-medium">Ajoutez votre premier produit</span>
                  <p className="text-xs text-foreground-500">Commencez à construire votre catalogue</p>
                </div>
              </div>
            )}
            {orderCount === 0 && (
              <div className="flex items-center gap-3 p-3 bg-background-100 rounded-lg">
                <i className="ri-shopping-cart-line text-accent-500"></i>
                <div className="text-sm">
                  <span className="text-foreground-900 font-medium">Pas encore de commandes</span>
                  <p className="text-xs text-foreground-500">Partagez votre boutique pour attirer des clients</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-background-100 rounded-lg">
              <i className="ri-share-line text-secondary-700"></i>
              <div className="text-sm">
                <span className="text-foreground-900 font-medium">Partagez votre boutique</span>
                <p className="text-xs text-foreground-500">Augmentez votre visibilité en ligne</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}