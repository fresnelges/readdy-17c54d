import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { buildSubdomain, buildSubdomainHost } from '@/lib/domain';

interface DashboardStats {
  todayVisits: number;
  totalVisits: number;
  todayOrders: number;
  todayRevenue: number;
  totalCustomers: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayVisits: 0,
    totalVisits: 0,
    todayOrders: 0,
    todayRevenue: 0,
    totalCustomers: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [domainVerified, setDomainVerified] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const subdomain = user.user_name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();

        const [visitRes, totalVisitRes, orderRes, revenueRes, customersRes] = await Promise.all([
          supabase
            .from('visitesiteweb')
            .select('*', { count: 'exact', head: true })
            .eq('boutique_nom', user.nomcommerce)
            .gte('date', todayISO),
          supabase
            .from('visitesiteweb')
            .select('*', { count: 'exact', head: true })
            .eq('boutique_nom', user.nomcommerce),
          supabase
            .from('order_headers')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', todayISO),
          supabase
            .from('order_headers')
            .select('subtotal_items')
            .gte('created_at', todayISO),
          supabase
            .from('order_headers')
            .select('customer_id', { count: 'exact', head: true })
            .not('customer_id', 'is', null),
        ]);

        const todayRevenue = (revenueRes.data || []).reduce(
          (sum: number, o: { subtotal_items: number | null }) => sum + (o.subtotal_items || 0),
          0,
        );

        setStats({
          todayVisits: visitRes.count || 0,
          totalVisits: totalVisitRes.count || 0,
          todayOrders: orderRes.count || 0,
          todayRevenue,
          totalCustomers: customersRes.count || 0,
        });
      } catch {
        // Keep defaults
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('websitedomain')
      .select('domaine, verified')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.domaine) {
          setCustomDomain(data.domaine.replace(/^https?:\/\//, '').replace(/\/+$/, ''));
          setDomainVerified(!!data.verified);
        }
      })
      .catch(() => {});
  }, [user]);

  const copyShopUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line animate-spin text-3xl text-primary-500 mb-4 block"></i>
          <p className="text-foreground-500">Chargement...</p>
        </div>
      </div>
    );
  }


  const statCards = [
    {
      icon: 'ri-eye-line',
      label: 'Visites aujourd\'hui',
      value: statsLoading ? '...' : stats.todayVisits.toLocaleString(),
      sub: `${stats.totalVisits.toLocaleString()} visites totales`,
      color: 'bg-primary-100 text-primary-700',
      link: '/dashboard/analytics',
    },
    {
      icon: 'ri-file-list-3-line',
      label: 'Commandes du jour',
      value: statsLoading ? '...' : stats.todayOrders.toLocaleString(),
      sub: 'Nouvelles commandes',
      color: 'bg-accent-100 text-accent-700',
      link: '/dashboard/orders',
    },
    {
      icon: 'ri-money-dollar-circle-line',
      label: 'Revenus du jour',
      value: statsLoading ? '...' : `${stats.todayRevenue.toLocaleString()} ${user.monaie}`,
      sub: `Solde: ${(user.solde || 0).toLocaleString()} ${user.monaie}`,
      color: 'bg-secondary-100 text-secondary-700',
      link: '/dashboard/payments',
    },
    {
      icon: 'ri-user-line',
      label: 'Total clients',
      value: statsLoading ? '...' : stats.totalCustomers.toLocaleString(),
      sub: 'Clients enregistrés',
      color: 'bg-primary-50 text-primary-600',
      link: '/dashboard/customers',
    },
  ];

  return (
    <div className="p-4 md:p-6">
      {/* Welcome */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950 mb-1">
          Bonjour, {user.name.split(' ')[0]} !
        </h2>
        <p className="text-sm text-foreground-500">
          Voici un aperçu de votre activité sur {user.nomcommerce}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {statCards.map((stat, i) => (
          <Link
            key={i}
            to={stat.link}
            className="bg-background-50 border border-background-200/70 rounded-lg p-4 md:p-5 hover:border-background-300/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center`}>
                <i className={`${stat.icon} text-lg`}></i>
              </div>
              {!statsLoading && (
                <i className="ri-arrow-right-line text-foreground-300 opacity-0 group-hover:opacity-100 transition-opacity text-sm"></i>
              )}
            </div>
            <div className="text-2xl md:text-3xl font-bold font-heading text-foreground-950 mb-1">
              {statsLoading ? (
                <span className="inline-block w-16 h-7 bg-background-200/70 rounded animate-pulse"></span>
              ) : (
                stat.value
              )}
            </div>
            <div className="text-xs text-foreground-500">{stat.label}</div>
            {stat.sub && !statsLoading && (
              <div className="text-[11px] text-foreground-400 mt-0.5">{stat.sub}</div>
            )}
          </Link>
        ))}
      </div>

      {/* Store URL */}
      <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 md:p-6 mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground-700 flex items-center gap-2">
            <i className="ri-global-line text-primary-500"></i>
            Lien de votre boutique
          </h3>
          <Link
            to="/dashboard/settings"
            className="text-xs text-foreground-500 hover:text-foreground-700 flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors"
          >
            <i className="ri-settings-3-line"></i>Configurer
          </Link>
        </div>

        <div className="space-y-2">
          {/* Subdomain */}
          <div className="flex items-center justify-between gap-3 p-3 bg-background-100 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 font-medium whitespace-nowrap">Sous-domaine</span>
              <a
                href={buildSubdomain(user.user_name)}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="text-sm text-foreground-900 font-medium truncate hover:text-primary-600 transition-colors"
              >
                {buildSubdomainHost(user.user_name)}
              </a>
            </div>
            <button
              onClick={() => copyShopUrl(buildSubdomain(user.user_name))}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-200/70 transition-colors cursor-pointer shrink-0"
              title="Copier le lien"
            >
              <i className={`text-sm ${copied ? 'ri-check-line text-accent-500' : 'ri-file-copy-line text-foreground-400'}`}></i>
            </button>
          </div>

          {/* Custom domain */}
          {customDomain && (
            <div className="flex items-center justify-between gap-3 p-3 bg-background-100 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-medium whitespace-nowrap">Domaine perso</span>
                <a
                  href={`https://${customDomain}`}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="text-sm text-foreground-900 font-medium truncate hover:text-primary-600 transition-colors"
                >
                  {customDomain}
                </a>
                {domainVerified ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap flex items-center gap-0.5">
                    <i className="ri-shield-check-line"></i>Vérifié
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap flex items-center gap-0.5">
                    <i className="ri-time-line"></i>En attente
                  </span>
                )}
              </div>
              <button
                onClick={() => copyShopUrl(`https://${customDomain}`)}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-200/70 transition-colors cursor-pointer shrink-0"
                title="Copier le lien"
              >
                <i className={`text-sm ${copied ? 'ri-check-line text-accent-500' : 'ri-file-copy-line text-foreground-400'}`}></i>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-sm font-semibold text-foreground-700 mb-3">Actions rapides</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { icon: 'ri-add-line', label: 'Ajouter un produit', link: '/dashboard/products', color: 'bg-foreground-950 text-background-50 hover:bg-foreground-800' },
            { icon: 'ri-service-line', label: 'Créer un service', link: '/dashboard/services', color: 'bg-accent-500 text-background-50 hover:bg-accent-600' },
            { icon: 'ri-store-2-line', label: 'Ma boutique', link: '/dashboard/store', color: 'bg-background-50 border border-background-200/70 text-foreground-700 hover:bg-background-100' },
            { icon: 'ri-palette-line', label: 'Statistiques', link: '/dashboard/analytics', color: 'bg-background-50 border border-background-200/70 text-foreground-700 hover:bg-background-100' },
          ].map((action, i) => (
            <Link
              key={i}
              to={action.link}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${action.color}`}
            >
              <i className={`${action.icon} text-sm`}></i>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <i className="ri-rocket-line text-primary-600 text-lg"></i>
          </div>
          <div>
            <h3 className="text-base font-semibold font-heading text-foreground-950 mb-2">
              Commencez à construire votre boutique
            </h3>
            <p className="text-sm text-foreground-500 mb-4 leading-relaxed">
              Votre espace ZIFEK est prêt. Ajoutez vos premiers produits ou services, personnalisez votre boutique, et commencez à vendre.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/dashboard/products"
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 transition-colors cursor-pointer"
              >
                <i className="ri-add-line"></i>
                Ajouter mon premier produit
              </Link>
              <Link
                to="/dashboard/analytics"
                className="flex items-center gap-2 px-5 py-2.5 border border-background-200/70 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-100 transition-colors cursor-pointer"
              >
                <i className="ri-play-circle-line"></i>
                Voir les statistiques
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-foreground-700 mb-3 flex items-center gap-2">
            <i className="ri-information-line text-accent-500"></i>
            Informations boutique
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground-500">Nom</span>
              <span className="text-foreground-900 font-medium">{user.nomcommerce}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-500">Type</span>
              <span className="text-foreground-900 font-medium capitalize">{user.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-500">Devise</span>
              <span className="text-foreground-900 font-medium">{user.monaie}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-500">Plan</span>
              <span className="text-foreground-900 font-medium">
                {user.package === 0 ? 'Gratuit' : user.package === 1 ? 'Partenaire' : user.package === 2 ? 'Business' : 'Premium'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-foreground-700 mb-3 flex items-center gap-2">
            <i className="ri-lightbulb-line text-primary-500"></i>
            Conseils ZIFEK
          </h4>
          <ul className="space-y-2.5 text-sm text-foreground-600">
            <li className="flex items-start gap-2">
              <i className="ri-checkbox-circle-line text-accent-500 mt-0.5"></i>
              Ajoutez au moins 5 produits pour attirer plus de clients
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-checkbox-circle-line text-accent-500 mt-0.5"></i>
              Personnalisez les couleurs de votre boutique
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-checkbox-circle-line text-accent-500 mt-0.5"></i>
              Connectez une passerelle de paiement
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-checkbox-circle-line text-accent-500 mt-0.5"></i>
              Utilisez l&apos;IA pour générer vos descriptions
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}