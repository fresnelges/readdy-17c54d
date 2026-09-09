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
  total_orders: number;
  total_spent: number;
  last_order_date: string;
}

const ORDER_STATUSES = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending_payment', label: 'En attente' },
  { value: 'paid', label: 'Payé' },
  { value: 'processing', label: 'En traitement' },
  { value: 'shipped', label: 'Expédié' },
  { value: 'delivered', label: 'Livré' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'refunded', label: 'Remboursé' },
];

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
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('order_headers')
        .select('id, customer_id, subtotal_items, tax_total, created_at, status')
        .order('created_at', { ascending: false });

      if (filterDateStart) query = query.gte('created_at', filterDateStart);
      if (filterDateEnd) query = query.gte('created_at', filterDateEnd).lte('created_at', filterDateEnd + 'T23:59:59');
      if (filterStatus) query = query.eq('status', filterStatus);

      const { data: orders, error: ordersErr } = await query;

      if (ordersErr) throw ordersErr;

      const customerMap = new Map<string, CustomerData>();
      (orders || []).forEach((o) => {
        const cid = o.customer_id || 'guest';
        const existing = customerMap.get(cid);
        if (existing) {
          existing.total_orders++;
          existing.total_spent += (o.subtotal_items || 0) + (o.tax_total || 0);
          if (o.created_at && o.created_at > existing.last_order_date) {
            existing.last_order_date = o.created_at;
          }
        } else {
          customerMap.set(cid, {
            customerId: cid,
            name: cid === 'guest' ? 'Invité' : `Client #${cid.slice(0, 8)}`,
            email: '',
            phone: '',
            total_orders: 1,
            total_spent: (o.subtotal_items || 0) + (o.tax_total || 0),
            last_order_date: o.created_at || '',
          });
        }
      });

      // Fetch real user names from users table
      const nonGuestIds = Array.from(customerMap.keys()).filter(cid => cid !== 'guest');
      if (nonGuestIds.length > 0) {
        const { data: usersData, error: usersErr } = await supabase
          .from('users')
          .select('id, name, email, telephone')
          .in('id', nonGuestIds.map(id => parseInt(id, 10)));

        if (!usersErr && usersData) {
          usersData.forEach((u) => {
            const uid = String(u.id);
            const existing = customerMap.get(uid);
            if (existing) {
              existing.name = u.name || existing.name;
              existing.email = existing.email || u.email || '';
              existing.phone = existing.phone || u.telephone || '';
            }
          });
        }
      }

      let result = Array.from(customerMap.values());

      if (filterMinAmount) {
        const minAmount = parseFloat(filterMinAmount);
        if (!isNaN(minAmount)) {
          result = result.filter((c) => c.total_spent >= minAmount);
        }
      }

      setCustomers(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [user, filterDateStart, filterDateEnd, filterMinAmount, filterStatus]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const clearFilters = () => {
    setFilterDateStart('');
    setFilterDateEnd('');
    setFilterMinAmount('');
    setFilterStatus('');
  };

  const hasActiveFilters = filterDateStart || filterDateEnd || filterMinAmount || filterStatus;

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const getWaLink = (phone: string) => {
    if (!phone) return '';
    return `https://wa.me/${phone.replace(/[^0-9+]/g, '')}`;
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-user-line mr-2 text-primary-500"></i>
            Gestion Clients
          </h2>
          <p className="text-sm text-foreground-500 mt-1">CRM et suivi de votre relation client</p>
        </div>
        <button
          onClick={() => {
            const headers = ['Nom', 'Email', 'Téléphone', 'Commandes', 'Total dépensé (MAD)', 'Dernière commande'];
            const rows = filtered.map(c => [
              c.name, c.email, c.phone,
              String(c.total_orders),
              String(c.total_spent),
              c.last_order_date ? new Date(c.last_order_date).toLocaleDateString('fr-FR') : '',
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground-500 mb-1.5">Date début</label>
              <input
                type="date"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-500 mb-1.5">Date fin</label>
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
            <div>
              <label className="block text-xs font-medium text-foreground-500 mb-1.5">Statut commande</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
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
          { label: 'CA Total', value: `${filtered.reduce((s, c) => s + c.total_spent, 0).toLocaleString()} MAD`, icon: 'ri-money-dollar-circle-line', color: 'bg-secondary-50 text-secondary-600' },
          { label: 'Panier Moyen', value: filtered.length > 0 ? `${Math.round(filtered.reduce((s, c) => s + c.total_spent, 0) / filtered.reduce((s, c) => s + c.total_orders, 1)).toLocaleString()} MAD` : '0 MAD', icon: 'ri-shopping-basket-2-line', color: 'bg-background-200/50 text-foreground-600' },
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
      ) : (
        <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background-100 text-xs font-semibold text-foreground-500 uppercase">
                  <th className="text-left px-4 py-3">Client</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Email/Tel</th>
                  <th className="text-center px-4 py-3">Commandes</th>
                  <th className="text-right px-4 py-3">Total dépensé</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">Dernière commande</th>
                  <th className="text-center px-4 py-3 w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-200/70">
                {filtered.map((c) => (
                  <tr key={c.customerId} className="hover:bg-background-50/50">
                    <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/dashboard/customers-manager/${c.customerId}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-accent-700">{c.name.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-foreground-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground-500 hidden sm:table-cell cursor-pointer" onClick={() => navigate(`/dashboard/customers-manager/${c.customerId}`)}>{c.email || '-'}</td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground-800 cursor-pointer" onClick={() => navigate(`/dashboard/customers-manager/${c.customerId}`)}>{c.total_orders}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary-600 cursor-pointer" onClick={() => navigate(`/dashboard/customers-manager/${c.customerId}`)}>{c.total_spent.toLocaleString()} MAD</td>
                    <td className="px-4 py-3 text-right text-foreground-500 hidden md:table-cell cursor-pointer" onClick={() => navigate(`/dashboard/customers-manager/${c.customerId}`)}>
                      {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/customers-manager/${c.customerId}`); }}
                          className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center hover:bg-primary-100 transition-colors cursor-pointer"
                          title="Voir les commandes"
                        >
                          <i className="ri-file-list-3-line text-primary-600 text-sm"></i>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/customers-manager/${c.customerId}`); }}
                          className="w-8 h-8 rounded-full bg-secondary-50 flex items-center justify-center hover:bg-secondary-100 transition-colors cursor-pointer"
                          title="Contacter le client"
                        >
                          <i className="ri-message-2-line text-secondary-600 text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-10 text-center text-foreground-500">Aucun client trouvé</div>
          )}
        </div>
      )}
    </div>
  );
}