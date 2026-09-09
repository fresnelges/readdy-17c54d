import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: number;
  name: string;
  email: string;
  user_name: string;
  nomcommerce: string;
  typecompte: number;
  active: number;
  package: number;
  monaie: string;
  datecreation: string;
  telephone: string;
  type: string;
}

type StatusFilter = 'all' | 'active' | 'inactive';

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [toggling, setToggling] = useState<number | null>(null);
  const perPage = 15;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('id,name,email,user_name,nomcommerce,typecompte,active,package,monaie,datecreation,telephone,type')
        .order('datecreation', { ascending: false });

      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,nomcommerce.ilike.%${search}%,user_name.ilike.%${search}%`);
      }

      if (statusFilter === 'active') query = query.eq('active', 1);
      if (statusFilter === 'inactive') query = query.eq('active', 0);

      const { data } = await query;
      setUsers((data as User[]) || []);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleActive = async (userId: number, currentActive: number) => {
    setToggling(userId);
    try {
      const newStatus = currentActive === 1 ? 0 : 1;
      await supabase.from('users').update({ active: newStatus }).eq('id', userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, active: newStatus } : u)));
    } catch { /* */ }
    finally { setToggling(null); }
  };

  const totalPages = Math.ceil(users.length / perPage);
  const paginatedUsers = users.slice((page - 1) * perPage, page * perPage);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Gestion des utilisateurs</h2>
        <p className="text-sm text-foreground-500 mt-1">
          {users.length} utilisateur{users.length !== 1 ? 's' : ''} au total
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par nom, email, boutique..."
            className="w-full h-10 pl-9 pr-4 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
          />
        </div>

        <div className="flex items-center gap-0.5 bg-background-100 rounded-full p-0.5">
          {[
            { key: 'all', label: 'Tous' },
            { key: 'active', label: 'Actifs' },
            { key: 'inactive', label: 'Inactifs' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key as StatusFilter); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-background-50 text-foreground-900 shadow-sm'
                  : 'text-foreground-500 hover:text-foreground-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {paginatedUsers.length === 0 ? (
        <div className="text-center py-16">
          <i className="ri-user-search-line text-4xl text-foreground-300 mb-3 block"></i>
          <p className="text-foreground-500 text-sm">Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <>
          <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-background-200/70 bg-background-100/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-500">Utilisateur</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-500 hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-500 hidden lg:table-cell">Boutique</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-500 hidden lg:table-cell">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-500 hidden md:table-cell">Rôle</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-foreground-500">Statut</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => (
                    <tr key={u.id} className="border-b border-background-200/70 last:border-0 hover:bg-background-100/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-foreground-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-foreground-700 font-bold text-xs">{u.name?.charAt(0) || '?'}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground-900 truncate">{u.name}</div>
                            <div className="text-xs text-foreground-400">@{u.user_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground-600 hidden md:table-cell truncate max-w-[180px]">{u.email}</td>
                      <td className="px-4 py-3 text-xs text-foreground-600 hidden lg:table-cell">{u.nomcommerce || '-'}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          u.package === 0 ? 'bg-background-100 text-foreground-500' :
                          u.package === 1 ? 'bg-secondary-100 text-secondary-700' :
                          u.package === 2 ? 'bg-accent-100 text-accent-700' :
                          'bg-foreground-100 text-foreground-700'
                        }`}>
                          {u.package === 0 ? 'Gratuit' : u.package === 1 ? 'Partenaire' : u.package === 2 ? 'Business' : 'Premium'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          u.typecompte === 1 ? 'bg-foreground-100 text-foreground-700' : 'bg-background-100 text-foreground-500'
                        }`}>
                          {u.typecompte === 1 ? 'Admin' : 'Utilisateur'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          u.active === 1 ? 'bg-accent-50 text-accent-600' : 'bg-foreground-100 text-foreground-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.active === 1 ? 'bg-accent-500' : 'bg-foreground-400'}`}></span>
                          {u.active === 1 ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggleActive(u.id, u.active)}
                          disabled={toggling === u.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 ${
                            u.active === 1
                              ? 'bg-foreground-100 text-foreground-700 hover:bg-foreground-200/70'
                              : 'bg-accent-100 text-accent-700 hover:bg-accent-200/70'
                          }`}
                        >
                          {toggling === u.id ? (
                            <i className="ri-loader-4-line animate-spin text-xs"></i>
                          ) : u.active === 1 ? (
                            <>
                              <i className="ri-close-circle-line text-xs"></i>
                              Désactiver
                            </>
                          ) : (
                            <>
                              <i className="ri-checkbox-circle-line text-xs"></i>
                              Activer
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-foreground-400">
                Page {page} sur {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-background-200/70 text-xs text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <i className="ri-arrow-left-s-line"></i>
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        page === pageNum
                          ? 'bg-foreground-950 text-background-50'
                          : 'border border-background-200/70 text-foreground-600 hover:bg-background-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-background-200/70 text-xs text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <i className="ri-arrow-right-s-line"></i>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}