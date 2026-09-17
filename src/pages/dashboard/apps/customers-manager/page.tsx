import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { downloadCSV } from '@/lib/csv';

interface CustomerData {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  total_orders: number;
  total_transactions: number;
  total_spent: number;
  last_activity: string;
}

/** Convertit une valeur (varchar/numeric) en nombre de façon sûre. */
function toNum(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export default function CustomersManagerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Filters
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const commerceId = user.id;

      // 1. Clients enregistrés du commerçant (table clientshop)
      const { data: shopClients } = await supabase
        .from('clientshop')
        .select('*')
        .eq('idshop', commerceId)
        .order('date', { ascending: false });

      // 2. Commandes du commerçant (table commande, scopée par idvendeur)
      const { data: commandes } = await supabase
        .from('commande')
        .select('*')
        .eq('idvendeur', commerceId)
        .order('date_time', { ascending: false });

      // 3. Paiements du commerçant (table transaction, scopée par idcommerce)
      const { data: transactions } = await supabase
        .from('transaction')
        .select('*')
        .eq('idcommerce', commerceId)
        .order('date_time', { ascending: false });

      const map = new Map<string, CustomerData>();

      const ensure = (id: string): CustomerData => {
        if (!map.has(id)) {
          map.set(id, {
            customerId: id,
            name: '',
            email: '',
            phone: '',
            address: '',
            total_orders: 0,
            total_transactions: 0,
            total_spent: 0,
            last_activity: '',
          });
        }
        return map.get(id)!;
      };

      // Merge clients enregistrés
      (shopClients || []).forEach((c: Record<string, unknown>) => {
        const id = c.idclient != null ? String(c.idclient) : '';
        if (!id) return;
        const e = ensure(id);
        e.name = (c.nomclient as string) || e.name;
        e.email = (c.email as string) || e.email;
        e.phone = (c.telephone as string) || e.phone;
        e.address = (c.adresse as string) || e.address;
        if (c.date && (c.date as string) > e.last_activity) e.last_activity = c.date as string;
      });

      // Merge commandes
      (commandes || []).forEach((o: Record<string, unknown>) => {
        const id = o.user_id != null ? String(o.user_id) : '';
        if (!id) return;
        const e = ensure(id);
        e.total_orders += 1;
        const paid = toNum(o.sommepayee) || toNum(o.totalttc);
        e.total_spent += paid;
        e.name = (o.nomclient as string) || e.name;
        e.email = (o.email as string) || e.email;
        e.phone = (o.tel as string) || e.phone;
        e.address = (o.adresse as string) || e.address;
        if (o.date_time && (o.date_time as string) > e.last_activity) e.last_activity = o.date_time as string;
      });

      // Merge paiements
      (transactions || []).forEach((t: Record<string, unknown>) => {
        const id = t.idclient != null ? String(t.idclient) : '';
        if (!id) return;
        const e = ensure(id);
        e.total_transactions += 1;
        e.total_spent += toNum(t.montant);
        if (t.date_time && (t.date_time as string) > e.last_activity) e.last_activity = t.date_time as string;
      });

      let result = Array.from(map.values());

      if (filterDateStart || filterDateEnd) {
        result = result.filter((c) => {
          if (!c.last_activity) return false;
          const d = c.last_activity.slice(0, 10);
          if (filterDateStart && d < filterDateStart) return false;
          if (filterDateEnd && d > filterDateEnd) return false;
          return true;
        });
      }

      if (filterMinAmount) {
        const minAmount = parseFloat(filterMinAmount);
        if (!isNaN(minAmount)) {
          result = result.filter((c) => c.total_spent >= minAmount);
        }
      }

      result.sort((a, b) => b.total_spent - a.total_spent);

      setCustomers(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [user, filterDateStart, filterDateEnd, filterMinAmount]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const clearFilters = () => {
    setFilterDateStart('');
    setFilterDateEnd('');
    setFilterMinAmount('');
  };

  const hasActiveFilters = filterDateStart || filterDateEnd || filterMinAmount;

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-user-line mr-2 text-primary-500"></i>
            Gestion Clients
          </h2>
          <p className="text-sm text-foreground-500 mt-1">Tous vos clients et leur historique d'activité avec votre boutique</p>
        </div>
        <button
          onClick={() => {
            const headers = ['Nom', 'Email', 'Téléphone', 'Adresse', 'Commandes', 'Transactions', 'Total dépensé (MAD)', 'Dernière activité'];
            const rows = filtered.map(c => [
              c.name, c.email, c.phone, c.address,
              String(c.total_orders),
              String(c.total_transactions),
              String(c.total_spent),
              c.last_activity ? new Date(c.last_activity).toLocaleDateString('fr-FR') : '',
            ]);
            downloadCSV('clients.csv', headers, rows);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm font-medium text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer"
        >
          <i className="ri-download-line"></i>
          <span>Exporter CSV</span>
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
            showFilters || hasActiveFilters
              ? 'bg-primary-500 text-background-50 border-primary-500'
              : 'bg-background-50 text-foreground-700 border-background-200/70 hover:bg-background-100'
          }`}
        >
          <i className="ri-filter-3-line"></i>
          <span>Filtres</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-accent-400"></span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground-500 mb-1.5">Dernière activité (début)</label>
              <input
                type="date"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-500 mb-1.5">Dernière activité (fin)</label>
              <input
                type="date"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-500 mb-1.5">Montant min (MAD)</label>
              <input
                type="number"
                placeholder="Ex: 500"
                value={filterMinAmount}
                onChange={(e) => setFilterMinAmount(e.target.value)}
                className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
              />
            </div>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 flex items-center gap-1.5 text-xs text-foreground-500 hover:text-foreground-800 cursor-pointer transition-colors"
            >
              <i className="ri-close-line"></i>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Clients', value: filtered.length, icon: 'ri-user-line', color: 'bg-primary-50 text-primary-600' },
          { label: 'Commandes', value: filtered.reduce((s, c) => s + c.total_orders, 0), icon: 'ri-file-list-3-line', color: 'bg-accent-50 text-accent-600' },
          { label: 'Transactions', value: filtered.reduce((s, c) => s + c.total_transactions, 0), icon: 'ri-exchange-dollar-line', color: 'bg-secondary-50 text-secondary-600' },
          { label: 'CA Total', value: `${filtered.reduce((s, c) => s + c.total_spent, 0).toLocaleString()} MAD`, icon: 'ri-money-dollar-circle-line', color: 'bg-background-200/50 text-foreground-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-background-50 border border-background-200/70 rounded-lg p-4">
            <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
              <i className={`${stat.icon}`}></i>
            </div>
            <p className="text-xs text-foreground-500">{stat.label}</p>
            <p className="text-lg font-bold text-foreground-950">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>
      ) : error ? (
        <div className="flex flex-col items-center py-20"><p className="text-foreground-600 mb-3">{error}</p><button onClick={fetchCustomers} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm">Réessayer</button></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-user-line text-2xl text-foreground-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground-800 mb-1">Aucun client</h3>
          <p className="text-sm text-foreground-500">Vos clients apparaîtront ici après leurs premiers achats</p>
        </div>
      ) : (
        <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background-100 text-xs font-semibold text-foreground-500 uppercase">
                  <th className="text-left px-4 py-3">Client</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Contact</th>
                  <th className="text-center px-4 py-3">Commandes</th>
                  <th className="text-center px-4 py-3 hidden md:table-cell">Transactions</th>
                  <th className="text-right px-4 py-3">Total dépensé</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">Dernière activité</th>
                  <th className="text-center px-4 py-3 w-[60px]">Voir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-200/70">
                {filtered.map((c) => (
                  <tr key={c.customerId} className="hover:bg-background-50/50">
                    <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/dashboard/customers-manager/${c.customerId}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-accent-700">{(c.name || '?').charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="font-medium text-foreground-900 block">{c.name || `Client #${c.customerId}`}</span>
                          {c.address && <span className="text-xs text-foreground-400 block truncate max-w-[180px]">{c.address}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground-500 hidden sm:table-cell cursor-pointer" onClick={() => navigate(`/dashboard/customers-manager/${c.customerId}`)}>
                      <div className="text-xs space-y-0.5">
                        {c.email && <div className="flex items-center gap-1"><i className="ri-mail-line text-foreground-400"></i>{c.email}</div>}
                        {c.phone && <div className="flex items-center gap-1"><i className="ri-phone-line text-foreground-400"></i>{c.phone}</div>}
                        {!c.email && !c.phone && <span>-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground-800 cursor-pointer" onClick={() => navigate(`/dashboard/customers-manager/${c.customerId}`)}>{c.total_orders}</td>
                    <td className="px-4 py-3 text-center text-foreground-600 hidden md:table-cell cursor-pointer" onClick={() => navigate(`/dashboard/customers-manager/${c.customerId}`)}>{c.total_transactions}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary-600 cursor-pointer" onClick={() => navigate(`/dashboard/customers-manager/${c.customerId}`)}>{c.total_spent.toLocaleString()} MAD</td>
                    <td className="px-4 py-3 text-right text-foreground-500 hidden md:table-cell cursor-pointer" onClick={() => navigate(`/dashboard/customers-manager/${c.customerId}`)}>
                      {c.last_activity ? new Date(c.last_activity).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/dashboard/customers-manager/${c.customerId}`)}
                        className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center hover:bg-primary-100 transition-colors cursor-pointer mx-auto"
                        title="Voir les détails"
                      >
                        <i className="ri-arrow-right-line text-primary-600 text-sm"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}