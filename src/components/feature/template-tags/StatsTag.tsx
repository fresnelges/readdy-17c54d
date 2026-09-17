import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

interface StatItem {
  label: string;
  value: number;
  suffix: string;
  icon: string;
}

export default function StatsTag() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant, isTenant } = useTenant();

  useEffect(() => {
    setLoading(true);

    const ownerFilter = (query: ReturnType<typeof supabase.from>) => {
      if (isTenant && tenant) {
        return query.eq('idcommerce', tenant.id);
      }
      return query;
    };

    // mesclients uses 'idshop' instead of 'owner'
    const mesclientsQuery = (isTenant && tenant)
      ? supabase.from('mesclients').select('id', { count: 'exact', head: true }).eq('idshop', tenant.id)
      : supabase.from('mesclients').select('id', { count: 'exact', head: true });

    Promise.all([
      ownerFilter(supabase.from('product_items').select('id', { count: 'exact', head: true }).eq('status', 'active')),
      ownerFilter(supabase.from('nospartenairesservices').select('id', { count: 'exact', head: true })),
      ownerFilter(supabase.from('partenaires').select('id', { count: 'exact', head: true })),
      ownerFilter(supabase.from('equipe').select('id', { count: 'exact', head: true })),
      ownerFilter(supabase.from('temoignage').select('id', { count: 'exact', head: true })),
      mesclientsQuery,
    ])
      .then((results) => {
        const [productsRes, servicesRes, partnersRes, teamRes, testimonialsRes, clientsRes] = results;

        const items: StatItem[] = [
          {
            label: 'Produits',
            value: productsRes.count ?? 0,
            suffix: '+',
            icon: 'ri-shopping-bag-line',
          },
          {
            label: 'Services',
            value: servicesRes.count ?? 0,
            suffix: '',
            icon: 'ri-briefcase-line',
          },
          {
            label: 'Partenaires',
            value: partnersRes.count ?? 0,
            suffix: '',
            icon: 'ri-shake-hands-line',
          },
          {
            label: 'Membres',
            value: teamRes.count ?? 0,
            suffix: '',
            icon: 'ri-team-line',
          },
          {
            label: 'Témoignages',
            value: testimonialsRes.count ?? 0,
            suffix: '+',
            icon: 'ri-chat-quote-line',
          },
          {
            label: 'Clients',
            value: clientsRes.count ?? 0,
            suffix: '+',
            icon: 'ri-user-heart-line',
          },
        ];

        setStats(items.filter((s) => s.value > 0));
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [isTenant, tenant]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <i className="ri-loader-4-line animate-spin text-xl text-primary-500"></i>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <i className="ri-error-warning-line text-3xl text-red-400 mb-2"></i>
        <p className="text-sm text-foreground-500">{error}</p>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mb-3">
          <i className="ri-bar-chart-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm text-foreground-500">Aucune statistique disponible</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className="bg-background-50 border border-background-200/70 rounded-lg p-5 text-center hover:border-background-300/60 transition-all duration-200"
        >
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-accent-100 flex items-center justify-center">
            <i className={`${stat.icon} text-lg text-accent-600`}></i>
          </div>
          <div className="text-2xl font-bold text-foreground-950 font-heading">
            {stat.value}
            <span className="text-accent-500">{stat.suffix}</span>
          </div>
          <p className="text-xs text-foreground-500 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}