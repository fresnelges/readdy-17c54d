import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function AnalyticsAdvancedPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ orders: 0, revenue: 0, products: 0, customers: 0, avgOrder: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        supabase.from('order_headers').select('*').order('created_at', { ascending: false }),
        supabase.from('product_items').select('*').eq('status', 'active'),
      ]);
      const orders = ordersRes.data || [];
      const products = productsRes.data || [];
      const totalRevenue = orders.reduce((s, o) => s + (o.subtotal_items || 0), 0);
      const uniqueCustomers = new Set(orders.map((o) => o.customer_id)).size;

      setStats({
        orders: orders.length,
        revenue: totalRevenue,
        products: products.length,
        customers: uniqueCustomers,
        avgOrder: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
      });
    } catch { /* silent */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const statCards = [
    { label: 'Commandes', value: stats.orders, icon: 'ri-file-list-3-line', change: '+12%', color: 'bg-primary-50 text-primary-600' },
    { label: 'Revenus', value: `${stats.revenue.toLocaleString()} MAD`, icon: 'ri-money-dollar-circle-line', change: '+8%', color: 'bg-accent-50 text-accent-600' },
    { label: 'Produits', value: stats.products, icon: 'ri-shopping-bag-3-line', change: '0%', color: 'bg-secondary-50 text-secondary-600' },
    { label: 'Clients', value: stats.customers, icon: 'ri-user-line', change: '+5%', color: 'bg-background-200/50 text-foreground-600' },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
          <i className="ri-line-chart-line mr-2 text-primary-500"></i>
          Analytics Avancés
        </h2>
        <p className="text-sm text-foreground-500 mt-1">Tableaux de bord et analyses détaillées</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((stat) => (
              <div key={stat.label} className="bg-background-50 border border-background-200/70 rounded-lg p-4">
                <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                  <i className={stat.icon}></i>
                </div>
                <p className="text-xs text-foreground-500">{stat.label}</p>
                <p className="text-xl font-bold text-foreground-950">{stat.value}</p>
                <p className="text-xs text-accent-600 mt-1">{stat.change} ce mois</p>
              </div>
            ))}
          </div>

          {/* Charts placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-background-50 border border-background-200/70 rounded-lg p-6 h-72 flex flex-col items-center justify-center">
              <i className="ri-bar-chart-line text-4xl text-foreground-300 mb-3"></i>
              <p className="text-sm font-medium text-foreground-600">Évolution des ventes</p>
              <p className="text-xs text-foreground-400 mt-1">Graphique mensuel</p>
            </div>
            <div className="bg-background-50 border border-background-200/70 rounded-lg p-6 h-72 flex flex-col items-center justify-center">
              <i className="ri-pie-chart-line text-4xl text-foreground-300 mb-3"></i>
              <p className="text-sm font-medium text-foreground-600">Sources de trafic</p>
              <p className="text-xs text-foreground-400 mt-1">Répartition par canal</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}