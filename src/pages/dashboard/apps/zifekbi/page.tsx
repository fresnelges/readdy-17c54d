import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function ZifekBIPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ products: 0, orders: 0, revenue: 0, customers: 0, avgOrder: 0, lowStock: 0 });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        supabase.from('order_headers').select('*'),
        supabase.from('product_items').select('*'),
      ]);
      const orders = ordersRes.data || [];
      const products = productsRes.data || [];
      const revenue = orders.reduce((s, o) => s + (o.subtotal_items || 0), 0);
      const uniqueCustomers = new Set(orders.map((o) => o.customer_id)).size;

      setKpis({
        products: products.length,
        orders: orders.length,
        revenue,
        customers: uniqueCustomers,
        avgOrder: orders.length > 0 ? Math.round(revenue / orders.length) : 0,
        lowStock: products.filter((p) => p.stock > 0 && p.stock <= 5).length,
      });
    } catch { /* silent */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cards = [
    { label: 'Produits', value: kpis.products, icon: 'ri-shopping-bag-3-line', color: 'bg-primary-50 text-primary-600' },
    { label: 'Commandes', value: kpis.orders, icon: 'ri-file-list-3-line', color: 'bg-accent-50 text-accent-600' },
    { label: 'CA Total', value: `${kpis.revenue.toLocaleString()} MAD`, icon: 'ri-money-dollar-circle-line', color: 'bg-secondary-50 text-secondary-600' },
    { label: 'Clients', value: kpis.customers, icon: 'ri-user-line', color: 'bg-background-200/60 text-foreground-600' },
    { label: 'Panier Moy.', value: `${kpis.avgOrder.toLocaleString()} MAD`, icon: 'ri-shopping-basket-2-line', color: 'bg-amber-50 text-amber-600' },
    { label: 'Stock Faible', value: kpis.lowStock, icon: 'ri-alert-line', color: kpis.lowStock > 0 ? 'bg-red-50 text-red-500' : 'bg-accent-50 text-accent-600' },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-bar-chart-box-line mr-2 text-primary-500"></i>
            ZifekBI
          </h2>
          <p className="text-sm text-foreground-500 mt-1">Business Intelligence complète</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-full text-sm text-foreground-600 cursor-pointer hover:bg-background-100">
          <i className="ri-refresh-line"></i>
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {cards.map((card) => (
              <div key={card.label} className="bg-background-50 border border-background-200/70 rounded-lg p-4">
                <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center mb-2`}>
                  <i className={card.icon}></i>
                </div>
                <p className="text-[10px] text-foreground-400 uppercase tracking-wider">{card.label}</p>
                <p className="text-base font-bold text-foreground-950">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Charts section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-background-50 border border-background-200/70 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-foreground-800 mb-4 flex items-center gap-2">
                <i className="ri-line-chart-line text-primary-500"></i>
                Évolution du CA
              </h3>
              <div className="h-48 flex items-end justify-between gap-2 px-2">
                {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'].map((month, i) => {
                  const h = [35, 45, 55, 42, 62, 70][i];
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-foreground-400">{Math.round(kpis.revenue * h / 100 / (i + 1)).toLocaleString()}</span>
                      <div className="w-full bg-primary-200/50 rounded-t-md" style={{ height: `${h}%` }}>
                        <div className="w-full bg-primary-500 rounded-t-md transition-all" style={{ height: '100%' }}></div>
                      </div>
                      <span className="text-[10px] text-foreground-400">{month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-background-50 border border-background-200/70 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-foreground-800 mb-4 flex items-center gap-2">
                <i className="ri-pie-chart-line text-accent-500"></i>
                Répartition
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Ventes directes', pct: 65, color: 'bg-primary-500' },
                  { label: 'Commandes en ligne', pct: 25, color: 'bg-accent-500' },
                  { label: 'Autres', pct: 10, color: 'bg-secondary-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground-600">{item.label}</span>
                      <span className="font-medium text-foreground-800">{item.pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-background-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="mt-6 bg-accent-50 border border-accent-200/50 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-accent-800 mb-2 flex items-center gap-2">
              <i className="ri-lightbulb-line"></i>
              Recommandations IA
            </h3>
            <ul className="space-y-1.5 text-xs text-accent-700">
              <li>· {kpis.lowStock > 0 ? `Réapprovisionnez ${kpis.lowStock} produit(s) en stock faible` : 'Stocks à niveau satisfaisant'}</li>
              <li>· {kpis.orders < 10 ? 'Augmentez votre visibilité pour attirer plus de commandes' : 'Bon volume de commandes, continuez !'}</li>
              <li>· {kpis.avgOrder < 50 ? 'Proposez des offres groupées pour augmenter le panier moyen' : 'Panier moyen satisfaisant'}</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}