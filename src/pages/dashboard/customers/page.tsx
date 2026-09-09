import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { downloadCSV } from '@/lib/csv';

interface ClientRecord {
  id: number;
  idshop: number;
  idclient: string;
  nomclient: string;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  date: string;
}

export default function CustomersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Filters
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('clientshop')
        .select('*')
        .eq('idshop', user.id)
        .order('date', { ascending: false });

      if (search) {
        query = query.or(`nomclient.ilike.%${search}%,email.ilike.%${search}%,telephone.ilike.%${search}%`);
      }
      if (filterDateStart) query = query.gte('date', filterDateStart);
      if (filterDateEnd) query = query.lte('date', filterDateEnd + 'T23:59:59');

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setClients(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  }, [search, user, filterDateStart, filterDateEnd]);

  useEffect(() => {
    if (user) fetchClients();
  }, [fetchClients, user]);

  const clearFilters = () => {
    setFilterDateStart('');
    setFilterDateEnd('');
  };

  const hasActiveFilters = filterDateStart || filterDateEnd;

  const getWaLink = (phone: string | null) => {
    if (!phone) return '';
    return `https://wa.me/${phone.replace(/[^0-9+]/g, '')}`;
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Clients</h2>
          <p className="text-sm text-foreground-500 mt-1">Liste de vos clients et leurs informations</p>
        </div>
        <button
          onClick={() => {
            const headers = ['Nom', 'Email', 'Téléphone', 'Adresse', "Date d'ajout"];
            const rows = clients.map(c => [
              c.nomclient, c.email || '', c.telephone || '', c.adresse || '',
              new Date(c.date).toLocaleDateString('fr-FR'),
            ]);
            downloadCSV('clients-shop.csv', headers, rows);
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
            placeholder="Rechercher par nom, email ou téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <div className="text-2xl font-bold font-heading text-foreground-950">{clients.length}</div>
          <div className="text-xs text-foreground-500 mt-1">Total clients</div>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <div className="text-2xl font-bold font-heading text-primary-600">
            {clients.filter(c => c.email).length}
          </div>
          <div className="text-xs text-foreground-500 mt-1">Avec email</div>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <div className="text-2xl font-bold font-heading text-accent-600">
            {clients.filter(c => c.telephone).length}
          </div>
          <div className="text-xs text-foreground-500 mt-1">Avec téléphone</div>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <div className="text-2xl font-bold font-heading text-secondary-700">
            {clients.filter(c => c.adresse).length}
          </div>
          <div className="text-xs text-foreground-500 mt-1">Avec adresse</div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
          <p className="text-foreground-600 mb-3">{error}</p>
          <button onClick={fetchClients} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-user-line text-2xl text-foreground-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground-800 mb-1">Aucun client</h3>
          <p className="text-sm text-foreground-500">Les clients apparaîtront ici après leurs premiers achats</p>
        </div>
      ) : (
        <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-background-200/70 bg-background-100 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
            <div className="col-span-3">Client</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-2">Téléphone</div>
            <div className="col-span-2">Adresse</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1 text-center">Actions</div>
          </div>
          <div className="divide-y divide-background-200/70">
            {clients.map((client) => (
              <div key={client.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 items-center hover:bg-background-50/50 transition-colors">
                <div className="md:col-span-3 cursor-pointer" onClick={() => navigate(`/dashboard/customers/${client.idclient}`)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-700 font-bold text-xs">{client.nomclient.charAt(0)}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground-900 truncate">{client.nomclient}</span>
                  </div>
                </div>
                <div className="md:col-span-2 cursor-pointer" onClick={() => navigate(`/dashboard/customers/${client.idclient}`)}>
                  <span className="text-sm text-foreground-600">{client.email || '—'}</span>
                </div>
                <div className="md:col-span-2 cursor-pointer" onClick={() => navigate(`/dashboard/customers/${client.idclient}`)}>
                  <span className="text-sm text-foreground-600">{client.telephone || '—'}</span>
                </div>
                <div className="md:col-span-2 cursor-pointer" onClick={() => navigate(`/dashboard/customers/${client.idclient}`)}>
                  <span className="text-sm text-foreground-600 truncate">{client.adresse || '—'}</span>
                </div>
                <div className="md:col-span-2 cursor-pointer" onClick={() => navigate(`/dashboard/customers/${client.idclient}`)}>
                  <span className="text-xs text-foreground-400">
                    {new Date(client.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="md:col-span-1 flex items-center justify-center gap-2">
                  {client.telephone ? (
                    <a
                      href={getWaLink(client.telephone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center hover:bg-green-100 transition-colors cursor-pointer"
                      title="WhatsApp"
                    >
                      <i className="ri-whatsapp-fill text-green-600 text-sm"></i>
                    </a>
                  ) : client.email ? (
                    <a
                      href={`mailto:${client.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center hover:bg-primary-100 transition-colors cursor-pointer"
                      title="Email"
                    >
                      <i className="ri-mail-fill text-primary-600 text-sm"></i>
                    </a>
                  ) : (
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-300">
                      <i className="ri-message-2-line text-sm"></i>
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/customers/${client.idclient}`); }}
                    className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center hover:bg-primary-100 transition-colors cursor-pointer"
                    title="Voir les détails"
                  >
                    <i className="ri-file-list-3-line text-primary-600 text-sm"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {clients.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-foreground-500">
          <span>{clients.length} client{clients.length > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}