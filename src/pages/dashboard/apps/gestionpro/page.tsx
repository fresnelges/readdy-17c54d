import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import StatsCharts from './components/StatsCharts';

interface Client {
  id: number;
  nomclient: string;
  email: string;
  telephone: string;
}

interface Project {
  id: number;
  titre: string;
  description: string;
  status: number;
  datedebut: string;
  datedefin: string;
  clientid: number;
  owner: number;
}

const STATUS_MAP: Record<number, string> = { 1: 'en_cours', 2: 'termine', 3: 'annule', 4: 'en_attente' };
const STATUS_LABEL: Record<number, string> = { 1: 'En cours', 2: 'Terminé', 3: 'Annulé', 4: 'En attente' };

export default function GestionProPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({ titre: '', description: '', datedebut: '', datedefin: '', clientid: 0, status: 1 });
  const [newProject, setNewProject] = useState({
    titre: '', description: '', datedebut: '', datedefin: '', clientid: 0, selectedUsers: [] as number[],
  });
  const [filterStatus, setFilterStatus] = useState<number>(0);
  const [filterClient, setFilterClient] = useState<number>(0);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('projet').select('*').order('datedebut', { ascending: false });
      setProjects(data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  const fetchClients = useCallback(async () => {
    if (!user) return;
    try {
      const { data: uw } = await supabase.from('userwebsite').select('idcommerce').eq('iduser', user.id).limit(1);
      const shopId = uw && uw.length > 0 ? uw[0].idcommerce : user.id;
      const { data } = await supabase.from('clientshop').select('id, nomclient, email, telephone').eq('idshop', shopId).order('nomclient');
      setClients(data || []);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => { fetchProjects(); fetchClients(); }, [fetchProjects, fetchClients]);

  const handleCreate = async () => {
    if (!newProject.titre || !user) return;
    const now = new Date().toISOString();
    try {
      const { data: created } = await supabase.from('projet').insert({
        titre: newProject.titre, description: newProject.description || '', budget: '0',
        montantpaye: 0, montantrestant: 0, status: 1, date: now,
        datedebut: newProject.datedebut || now, datedefin: newProject.datedefin || now,
        clientid: newProject.clientid || 0, owner: user.id,
      }).select('id').single();
      if (created && newProject.selectedUsers.length > 0) {
        await supabase.from('projet_utilisateurs').insert(
          newProject.selectedUsers.map((uid) => ({ projet_id: created.id, tacheid: 0, utilisateur_id: uid }))
        );
      }
      setNewProject({ titre: '', description: '', datedebut: '', datedefin: '', clientid: 0, selectedUsers: [] });
      setShowCreate(false);
      fetchProjects();
    } catch { /* silent */ }
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setEditForm({
      titre: p.titre, description: p.description || '',
      datedebut: p.datedebut ? p.datedebut.slice(0, 10) : '',
      datedefin: p.datedefin ? p.datedefin.slice(0, 10) : '',
      clientid: p.clientid || 0, status: p.status,
    });
  };

  const handleEdit = async () => {
    if (!editingProject) return;
    try {
      await supabase.from('projet').update({
        titre: editForm.titre, description: editForm.description,
        datedebut: editForm.datedebut || editingProject.datedebut,
        datedefin: editForm.datedefin || editingProject.datedefin,
        clientid: editForm.clientid, status: editForm.status,
      }).eq('id', editingProject.id);
      setEditingProject(null);
      fetchProjects();
    } catch { /* silent */ }
  };

  const handleDelete = async (id: number) => {
    await supabase.from('projet').delete().eq('id', id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const getStatusStyle = (status: number) => {
    const s = STATUS_MAP[status] || 'en_cours';
    const styles: Record<string, string> = {
      en_cours: 'bg-accent-50 text-accent-700', termine: 'bg-secondary-50 text-secondary-700',
      annule: 'bg-background-100 text-foreground-500', en_attente: 'bg-amber-50 text-amber-700',
    };
    return styles[s] || 'bg-background-100 text-foreground-500';
  };

  const getStatusLabel = (status: number) => STATUS_LABEL[status] || 'Inconnu';
  const getClientName = (clientId: number) => {
    if (!clientId) return null;
    const c = clients.find((cl) => cl.id === clientId);
    return c ? c.nomclient : null;
  };

  // Stats
  const stats = {
    total: projects.length,
    enCours: projects.filter((p) => p.status === 1).length,
    termine: projects.filter((p) => p.status === 2).length,
    enAttente: projects.filter((p) => p.status === 4).length,
    annule: projects.filter((p) => p.status === 3).length,
  };

  const statCards = [
    { label: 'Total projets', value: stats.total, icon: 'ri-projector-line', color: 'text-primary-500', bg: 'bg-primary-50' },
    { label: 'En cours', value: stats.enCours, icon: 'ri-play-circle-line', color: 'text-accent-500', bg: 'bg-accent-50' },
    { label: 'Terminés', value: stats.termine, icon: 'ri-checkbox-circle-line', color: 'text-secondary-500', bg: 'bg-secondary-50' },
    { label: 'En attente', value: stats.enAttente, icon: 'ri-time-line', color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  // Filtering
  const filteredProjects = projects.filter((p) => {
    if (filterStatus !== 0 && p.status !== filterStatus) return false;
    if (filterClient !== 0 && p.clientid !== filterClient) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-projector-line mr-2 text-primary-500"></i>GESTIONPRO
          </h2>
          <p className="text-sm text-foreground-500 mt-1">Gestion de projets complète</p>
        </div>
        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <button onClick={() => setShowDashboard(!showDashboard)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap transition-colors ${
                showDashboard ? 'bg-accent-50 text-accent-700' : 'bg-background-100 text-foreground-500 hover:text-foreground-700'
              }`}
              title="Tableau de bord">
              <i className="ri-bar-chart-grouped-line"></i>
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}
          <button onClick={() => { setShowCreate(!showCreate); setEditingProject(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 transition-colors">
            <i className="ri-add-line"></i>Nouveau projet
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {statCards.map((sc) => (
            <div key={sc.label} className="bg-background-50 border border-background-200/70 rounded-lg p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${sc.bg} flex items-center justify-center`}>
                <i className={`${sc.icon} ${sc.color} text-lg`}></i>
              </div>
              <div>
                <p className="text-xs text-foreground-500">{sc.label}</p>
                <p className="text-xl font-bold text-foreground-950">{sc.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dashboard Charts */}
      {showDashboard && !loading && projects.length > 0 && (
        <StatsCharts projects={projects} clients={clients} />
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 mb-6 space-y-4">
          <h3 className="text-base font-semibold text-foreground-900 mb-1">Créer un nouveau projet</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">Nom du projet *</label>
              <input type="text" value={newProject.titre} onChange={(e) => setNewProject({ ...newProject, titre: e.target.value })}
                placeholder="Nom du projet" className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50 focus:outline-none focus:border-primary-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">Client (optionnel)</label>
              <select value={newProject.clientid} onChange={(e) => setNewProject({ ...newProject, clientid: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50 focus:outline-none focus:border-primary-300 cursor-pointer">
                <option value={0}>Aucun client</option>
                {clients.map((c) => (<option key={c.id} value={c.id}>{c.nomclient}{c.email ? ` (${c.email})` : ''}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">Date de début *</label>
              <input type="date" value={newProject.datedebut} onChange={(e) => setNewProject({ ...newProject, datedebut: e.target.value })}
                className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50 focus:outline-none focus:border-primary-300 cursor-pointer" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">Date de fin *</label>
              <input type="date" value={newProject.datedefin} onChange={(e) => setNewProject({ ...newProject, datedefin: e.target.value })}
                className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50 focus:outline-none focus:border-primary-300 cursor-pointer" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">Description</label>
            <textarea value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              rows={2} placeholder="Description du projet" className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50 resize-none focus:outline-none focus:border-primary-300" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={handleCreate} disabled={!newProject.titre}
              className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors">
              <i className="ri-check-line mr-1.5"></i>Créer le projet
            </button>
            <button onClick={() => { setShowCreate(false); setNewProject({ titre: '', description: '', datedebut: '', datedefin: '', clientid: 0, selectedUsers: [] }); }}
              className="px-4 py-2.5 bg-background-100 text-foreground-600 rounded-full text-sm cursor-pointer hover:bg-background-200/70 whitespace-nowrap transition-colors">Annuler</button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingProject(null)}>
          <div className="bg-background-50 rounded-xl border border-background-200/70 p-6 w-full max-w-lg mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground-900">Modifier le projet</h3>
              <button onClick={() => setEditingProject(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-400 hover:text-foreground-600 cursor-pointer">
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">Nom du projet</label>
                <input type="text" value={editForm.titre} onChange={(e) => setEditForm({ ...editForm, titre: e.target.value })}
                  className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50 focus:outline-none focus:border-primary-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Date de début</label>
                  <input type="date" value={editForm.datedebut} onChange={(e) => setEditForm({ ...editForm, datedebut: e.target.value })}
                    className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50 focus:outline-none focus:border-primary-300 cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Date de fin</label>
                  <input type="date" value={editForm.datedefin} onChange={(e) => setEditForm({ ...editForm, datedefin: e.target.value })}
                    className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50 focus:outline-none focus:border-primary-300 cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Statut</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50 focus:outline-none focus:border-primary-300 cursor-pointer">
                    <option value={1}>En cours</option>
                    <option value={4}>En attente</option>
                    <option value={2}>Terminé</option>
                    <option value={3}>Annulé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Client</label>
                  <select value={editForm.clientid} onChange={(e) => setEditForm({ ...editForm, clientid: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50 focus:outline-none focus:border-primary-300 cursor-pointer">
                    <option value={0}>Aucun client</option>
                    {clients.map((c) => (<option key={c.id} value={c.id}>{c.nomclient}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2} className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50 resize-none focus:outline-none focus:border-primary-300" />
              </div>
            </div>
            <div className="flex gap-3 mt-5 pt-4 border-t border-background-200/70">
              <button onClick={handleEdit}
                className="flex-1 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap transition-colors">
                Enregistrer
              </button>
              <button onClick={() => setEditingProject(null)}
                className="px-4 py-2.5 bg-background-100 text-foreground-600 rounded-full text-sm cursor-pointer hover:bg-background-200/70 whitespace-nowrap transition-colors">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      {!loading && projects.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 bg-background-50 border border-background-200/70 rounded-lg p-3">
          <span className="text-xs font-medium text-foreground-500 flex items-center gap-1.5">
            <i className="ri-filter-line"></i>Filtres
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterStatus} onChange={(e) => setFilterStatus(Number(e.target.value))}
              className="px-3 py-1.5 border border-background-200/70 rounded-full text-xs bg-background-50 cursor-pointer focus:outline-none focus:border-primary-300">
              <option value={0}>Tous les statuts</option>
              <option value={1}>En cours</option>
              <option value={4}>En attente</option>
              <option value={2}>Terminé</option>
              <option value={3}>Annulé</option>
            </select>
            <select value={filterClient} onChange={(e) => setFilterClient(Number(e.target.value))}
              className="px-3 py-1.5 border border-background-200/70 rounded-full text-xs bg-background-50 cursor-pointer focus:outline-none focus:border-primary-300">
              <option value={0}>Tous les clients</option>
              {clients.map((c) => (<option key={c.id} value={c.id}>{c.nomclient}</option>))}
            </select>
            {(filterStatus !== 0 || filterClient !== 0) && (
              <button onClick={() => { setFilterStatus(0); setFilterClient(0); }}
                className="px-2.5 py-1.5 rounded-full text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer transition-colors flex items-center gap-1">
                <i className="ri-close-line"></i>Réinitialiser
              </button>
            )}
          </div>
          <span className="text-xs text-foreground-400 ml-auto">
            {filteredProjects.length} projet{filteredProjects.length > 1 ? 's' : ''} affiché{filteredProjects.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Projects list */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <i className="ri-projector-line text-4xl text-foreground-300 mb-3"></i>
          <p className="text-foreground-500">Aucun projet créé</p>
          <p className="text-xs text-foreground-400 mt-1">Cliquez sur &quot;Nouveau projet&quot; pour commencer</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <i className="ri-filter-off-line text-3xl text-foreground-300 mb-2"></i>
          <p className="text-foreground-500">Aucun projet ne correspond aux filtres</p>
          <button onClick={() => { setFilterStatus(0); setFilterClient(0); }}
            className="mt-3 px-4 py-2 bg-background-100 text-foreground-600 rounded-full text-sm cursor-pointer hover:bg-background-200/70 transition-colors">Réinitialiser les filtres</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div key={project.id}
              className="bg-background-50 border border-background-200/70 rounded-lg p-5 hover:border-background-300/60 transition-colors group cursor-pointer"
              onClick={() => navigate(`/dashboard/gestionpro/${project.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground-900 group-hover:text-primary-500 transition-colors pr-2">{project.titre}</h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(project); }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-foreground-300 hover:text-primary-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                    title="Modifier">
                    <i className="ri-pencil-line text-xs"></i>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                    title="Supprimer">
                    <i className="ri-delete-bin-line text-xs"></i>
                  </button>
                </div>
              </div>
              <p className="text-xs text-foreground-500 line-clamp-2 mb-3">{project.description || 'Aucune description'}</p>
              {getClientName(project.clientid) && (
                <div className="flex items-center gap-1.5 mb-2 text-xs text-foreground-500">
                  <i className="ri-user-line text-foreground-400"></i>
                  <span>{getClientName(project.clientid)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(project.status)}`}>{getStatusLabel(project.status)}</span>
                {project.datedebut && (
                  <span className="text-xs text-foreground-400">
                    <i className="ri-calendar-line mr-1"></i>{new Date(project.datedebut).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {project.datedefin && (
                  <span className="text-xs text-foreground-400">
                    <i className="ri-arrow-right-line mx-0.5"></i>{new Date(project.datedefin).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}