import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface PlatformStats {
  totalUsers: number;
  activeShops: number;
  totalOrders: number;
  totalProducts: number;
  premiumUsers: number;
  totalRevenue: number;
}

interface RecentUser {
  id: number;
  name: string;
  nomcommerce: string;
  typecompte: number;
  datecreation: string;
  monaie: string;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0, activeShops: 0, totalOrders: 0,
    totalProducts: 0, premiumUsers: 0, totalRevenue: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          usersRes, shopsRes, ordersRes, productsRes,
          premiumRes, revenueRes, recentRes,
        ] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('active', 1),
          supabase.from('order_headers').select('id', { count: 'exact', head: true }),
          supabase.from('product_items').select('id', { count: 'exact', head: true }),
          supabase.from('users').select('id', { count: 'exact', head: true }).gt('package', 0),
          supabase.from('order_headers').select('subtotal_items'),
          supabase.from('users').select('id,name,nomcommerce,typecompte,datecreation,monaie').order('datecreation', { ascending: false }).limit(10),
        ]);

        const totalRevenue = (revenueRes.data || []).reduce(
          (sum: number, o: { subtotal_items: number | null }) => sum + (o.subtotal_items || 0), 0,
        );

        setStats({
          totalUsers: usersRes.count || 0,
          activeShops: shopsRes.count || 0,
          totalOrders: ordersRes.count || 0,
          totalProducts: productsRes.count || 0,
          premiumUsers: premiumRes.count || 0,
          totalRevenue,
        });
        setRecentUsers(recentRes.data as RecentUser[] || []);
      } catch { /* keep defaults */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const statCards = [
    { icon: 'ri-user-line', label: 'Utilisateurs', value: stats.totalUsers, sub: `${stats.activeShops} boutiques actives`, color: 'bg-primary-100 text-primary-700' },
    { icon: 'ri-shopping-bag-3-line', label: 'Produits', value: stats.totalProducts, sub: 'Catalogue global', color: 'bg-accent-100 text-accent-700' },
    { icon: 'ri-file-list-3-line', label: 'Commandes', value: stats.totalOrders, sub: `${stats.totalRevenue.toLocaleString()} revenus`, color: 'bg-secondary-100 text-secondary-700' },
    { icon: 'ri-vip-crown-line', label: 'Premium', value: stats.premiumUsers, sub: 'Utilisateurs payants', color: 'bg-foreground-100 text-foreground-700' },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950 mb-1">
          SuperAdmin — Vue d&apos;ensemble
        </h2>
        <p className="text-sm text-foreground-500">
          Administration centrale de la plateforme Zifek
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="bg-background-50 border border-background-200/70 rounded-lg p-4 md:p-5">
            <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              <i className={`${card.icon} text-lg`}></i>
            </div>
            <div className="text-2xl md:text-3xl font-bold font-heading text-foreground-950">
              {card.value.toLocaleString()}
            </div>
            <div className="text-xs text-foreground-500">{card.label}</div>
            <div className="text-[11px] text-foreground-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick overview panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent Users */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground-700 mb-4 flex items-center gap-2">
            <i className="ri-user-add-line text-primary-500"></i>
            Utilisateurs récents
          </h3>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-foreground-400 py-4 text-center">Aucun utilisateur</p>
          ) : (
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-background-200/70 last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm text-foreground-900 truncate">{u.name}</div>
                    <div className="text-xs text-foreground-400">{u.nomcommerce} · {u.monaie}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.typecompte === 1 ? 'bg-foreground-100 text-foreground-700' : 'bg-background-100 text-foreground-500'}`}>
                      {u.typecompte === 1 ? 'Admin' : 'Utilisateur'}
                    </span>
                    <span className="text-xs text-foreground-400 whitespace-nowrap">
                      {new Date(u.datecreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground-700 mb-4 flex items-center gap-2">
            <i className="ri-rocket-line text-accent-500"></i>
            Accès rapides
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: 'ri-palette-line', label: 'Theme Builder', desc: 'Créer et gérer les thèmes', path: '/superadmin/themes', color: 'bg-accent-100 text-accent-700' },
              { icon: 'ri-apps-2-line', label: 'App Builder', desc: 'Modules et extensions', path: '/superadmin/apps', color: 'bg-secondary-100 text-secondary-700' },
              { icon: 'ri-shield-keyhole-line', label: 'Clés API IA', desc: 'Configurer les APIs', path: '/superadmin/settings', color: 'bg-foreground-100 text-foreground-700' },
              { icon: 'ri-database-2-line', label: 'Base de données', desc: 'Explorer les données', path: '/superadmin/settings', color: 'bg-primary-100 text-primary-700' },
            ].map((link, i) => (
              <a
                key={i}
                href={link.path}
                className="flex flex-col gap-2 p-4 bg-background-100 rounded-lg hover:bg-background-200/70 transition-colors cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-lg ${link.color} flex items-center justify-center`}>
                  <i className={`${link.icon}`}></i>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground-900">{link.label}</div>
                  <div className="text-xs text-foreground-500">{link.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}