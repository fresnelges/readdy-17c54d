import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface UserItem {
  id: number;
  name: string;
  email: string;
  telephone: string;
  typecompte: number;
  nomcommerce: string;
  Pays: string;
  Ville: string;
  active: number;
  datecreation: string;
}

export default function UsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First get the idcommerce for the current user
      const { data: userData } = await supabase
        .from('users')
        .select('idcommerce')
        .eq('id', user!.id)
        .maybeSingle();

      if (!userData?.idcommerce) {
        setUsers([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('users')
        .select('id, name, email, telephone, typecompte, nomcommerce, "Pays", "Ville", active, datecreation')
        .eq('idcommerce', userData.idcommerce)
        .order('datecreation', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setUsers(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [search, user]);

  useEffect(() => {
    if (user) fetchUsers();
  }, [fetchUsers, user]);

  const getTypeLabel = (type: number) => {
    const types: Record<number, string> = { 1: 'Admin', 2: 'Manager', 3: 'Employé', 4: 'Client' };
    return types[type] || 'Utilisateur';
  };

  const getTypeStyle = (type: number) => {
    const styles: Record<number, string> = {
      1: 'bg-accent-100 text-accent-700',
      2: 'bg-primary-50 text-primary-700',
      3: 'bg-secondary-100 text-secondary-700',
      4: 'bg-background-200/70 text-foreground-600',
    };
    return styles[type] || 'bg-background-200/70 text-foreground-600';
  };

  return (
    <div className="p-4 md:p-6">
      {/* Sub nav */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => navigate('/dashboard/services')} className="px-4 py-2.5 bg-background-50 border border-background-200/70 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-100 transition-colors cursor-pointer">
          <i className="ri-arrow-left-line mr-1"></i> Services
        </button>
        <div className="h-6 w-px bg-background-200/70 hidden sm:block"></div>
        <span className="text-sm font-bold text-foreground-950">Gestion utilisateurs</span>
      </div>

      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Gestion utilisateurs</h2>
        <p className="text-sm text-foreground-500 mt-1">Gérez les utilisateurs de votre commerce</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
          <p className="text-foreground-600 mb-3">{error}</p>
          <button onClick={fetchUsers} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-user-settings-line text-2xl text-foreground-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground-800 mb-1">Aucun utilisateur</h3>
          <p className="text-sm text-foreground-500">Aucun utilisateur trouvé dans votre commerce</p>
        </div>
      ) : (
        <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-background-200/70 bg-background-100 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
            <div className="col-span-3">Utilisateur</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-2">Téléphone</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-1">Statut</div>
            <div className="col-span-2">Créé le</div>
          </div>

          <div className="divide-y divide-background-200/70">
            {users.map((u) => (
              <div key={u.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-3.5 items-center hover:bg-background-50/50 transition-colors">
                <div className="md:col-span-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-accent-700 font-bold text-xs">{u.name?.charAt(0) || '?'}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground-900 truncate">{u.name}</div>
                    <div className="text-xs text-foreground-500 truncate">{u.nomcommerce}</div>
                  </div>
                </div>
                <div className="md:col-span-2 text-sm text-foreground-600 truncate">{u.email || '—'}</div>
                <div className="md:col-span-2 text-sm text-foreground-600 truncate">{u.telephone || '—'}</div>
                <div className="md:col-span-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeStyle(u.typecompte)}`}>
                    {getTypeLabel(u.typecompte)}
                  </span>
                </div>
                <div className="md:col-span-1">
                  {u.active === 1 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-accent-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-500"></span>
                      Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-foreground-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground-400"></span>
                      Inactif
                    </span>
                  )}
                </div>
                <div className="md:col-span-2 text-xs text-foreground-500">
                  {u.datecreation ? new Date(u.datecreation).toLocaleDateString('fr-FR') : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-foreground-500">
          <span>{users.length} utilisateur{users.length > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}