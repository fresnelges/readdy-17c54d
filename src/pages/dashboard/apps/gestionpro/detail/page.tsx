import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import ProjectFilesTab from '../components/ProjectFilesTab';

interface Project {
  id: number; titre: string; description: string; status: number;
  datedebut: string; datedefin: string; clientid: number; owner: number;
}
interface Task {
  id: number; idprojet: number; titre: string; description: string;
  assigner: string; priorite: number; statut: string;
  duree: string; datecreation: string; datedebut: string; datedefin: string; owner: number;
}
interface Client {
  id: number; nomclient: string; email: string;
}
interface ShopUser {
  id: number; user_name: string; name: string; email: string;
}
interface ProjectUser {
  id: number; projet_id: number; tacheid: number; utilisateur_id: number;
  user_name?: string; user_name_display?: string;
}

const STATUS_LABEL: Record<number, string> = { 1: 'En cours', 2: 'Terminé', 3: 'Annulé', 4: 'En attente' };
const STATUS_STYLE: Record<number, string> = {
  1: 'bg-accent-50 text-accent-700', 2: 'bg-secondary-50 text-secondary-700',
  3: 'bg-background-100 text-foreground-500', 4: 'bg-amber-50 text-amber-700',
};
const TASK_STATUS_LABEL: Record<string, string> = {
  a_faire: 'À faire', en_cours: 'En cours', en_revision: 'En révision', termine: 'Terminé',
};
const TASK_STATUS_COLOR: Record<string, string> = {
  a_faire: 'bg-background-100 text-foreground-600', en_cours: 'bg-accent-50 text-accent-700',
  en_revision: 'bg-amber-50 text-amber-700', termine: 'bg-secondary-50 text-secondary-700',
};
const KANBAN_COLUMNS = ['a_faire', 'en_cours', 'en_revision', 'termine'];
const PRIORITY_LABEL: Record<number, string> = { 1: 'Haute', 2: 'Moyenne', 3: 'Basse' };
const PRIORITY_COLOR: Record<number, string> = {
  1: 'bg-red-50 text-red-600', 2: 'bg-amber-50 text-amber-600', 3: 'bg-background-100 text-foreground-500',
};

type Tab = 'liste' | 'kanban' | 'gantt' | 'utilisateurs' | 'fichiers';

export default function ProjectDetailPage({ initialTab = 'liste' }: { initialTab?: Tab } = {}) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [shopUsers, setShopUsers] = useState<ShopUser[]>([]);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>(initialTab);

  // Edit project
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ titre: '', description: '', datedebut: '', datedefin: '', clientid: 0, status: 1 });

  // New task
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ titre: '', description: '', assigner: '', priorite: 2, datedebut: '', datedefin: '' });

  // Edit task
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskForm, setEditTaskForm] = useState({ titre: '', description: '', assigner: '', priorite: 2, statut: 'a_faire', datedebut: '', datedefin: '' });

  // ── Fetch ──
  const fetchProject = useCallback(async () => {
    const { data } = await supabase.from('projet').select('*').eq('id', projectId).maybeSingle();
    setProject(data);
    if (data) {
      setEditForm({
        titre: data.titre, description: data.description || '',
        datedebut: data.datedebut ? data.datedebut.slice(0, 10) : '',
        datedefin: data.datedefin ? data.datedefin.slice(0, 10) : '',
        clientid: data.clientid || 0, status: data.status,
      });
    }
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase.from('projettache').select('*').eq('idprojet', projectId).order('datecreation', { ascending: false });
    setTasks(data || []);
  }, [projectId]);

  const fetchProjectUsers = useCallback(async () => {
    const { data } = await supabase.from('projet_utilisateurs').select('*').eq('projet_id', projectId).eq('tacheid', 0);
    const pu = data || [];
    if (pu.length > 0) {
      const ids = pu.map((p) => p.utilisateur_id);
      const { data: usersData } = await supabase.from('users').select('id, user_name, name').in('id', ids);
      const userMap: Record<number, string> = {};
      (usersData || []).forEach((u) => { userMap[u.id] = u.name || u.user_name; });
      pu.forEach((p) => { p.user_name_display = userMap[p.utilisateur_id] || `User #${p.utilisateur_id}`; });
    }
    setProjectUsers(pu);
  }, [projectId]);

  const fetchClients = useCallback(async () => {
    if (!user) return;
    const { data: uw } = await supabase.from('userwebsite').select('idcommerce').eq('iduser', user.id).limit(1);
    const shopId = uw && uw.length > 0 ? uw[0].idcommerce : user.id;
    const { data } = await supabase.from('clientshop').select('id, nomclient, email').eq('idshop', shopId).order('nomclient');
    setClients(data || []);
  }, [user]);

  const fetchShopUsers = useCallback(async () => {
    if (!user) return;
    const { data: uw } = await supabase.from('userwebsite').select('idcommerce').eq('iduser', user.id).limit(1);
    const shopId = uw && uw.length > 0 ? uw[0].idcommerce : user.id;
    const { data: members } = await supabase.from('userwebsite').select('iduser').eq('idcommerce', shopId);
    if (members && members.length > 0) {
      const ids = members.map((m) => m.iduser);
      const { data: usersData } = await supabase.from('users').select('id, user_name, name, email').in('id', ids);
      setShopUsers(usersData || []);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProject(), fetchTasks(), fetchProjectUsers(), fetchClients(), fetchShopUsers()])
      .finally(() => setLoading(false));
  }, [fetchProject, fetchTasks, fetchProjectUsers, fetchClients, fetchShopUsers]);

  // ── Project edit ──
  const handleEditProject = async () => {
    if (!project) return;
    await supabase.from('projet').update({
      titre: editForm.titre, description: editForm.description,
      datedebut: editForm.datedebut || project.datedebut,
      datedefin: editForm.datedefin || project.datedefin,
      clientid: editForm.clientid, status: editForm.status,
    }).eq('id', project.id);
    setShowEdit(false);
    fetchProject();
  };

  // ── Task CRUD ──
  const handleCreateTask = async () => {
    if (!newTask.titre || !user) return;
    const now = new Date().toISOString();
    await supabase.from('projettache').insert({
      idprojet: projectId, titre: newTask.titre, description: newTask.description || '',
      assigner: newTask.assigner || '', priorite: newTask.priorite, statut: 'a_faire',
      duree: now, datecreation: now,
      datedebut: newTask.datedebut || now, datedefin: newTask.datedefin || now, owner: user.id,
    });
    setNewTask({ titre: '', description: '', assigner: '', priorite: 2, datedebut: '', datedefin: '' });
    setShowTaskForm(false);
    fetchTasks();
  };

  const openEditTask = (t: Task) => {
    setEditingTask(t);
    setEditTaskForm({
      titre: t.titre, description: t.description || '', assigner: t.assigner || '',
      priorite: t.priorite, statut: t.statut,
      datedebut: t.datedebut ? t.datedebut.slice(0, 10) : '',
      datedefin: t.datedefin ? t.datedefin.slice(0, 10) : '',
    });
  };

  const handleEditTask = async () => {
    if (!editingTask) return;
    await supabase.from('projettache').update({
      titre: editTaskForm.titre, description: editTaskForm.description,
      assigner: editTaskForm.assigner, priorite: editTaskForm.priorite,
      statut: editTaskForm.statut,
      datedebut: editTaskForm.datedebut || editingTask.datedebut,
      datedefin: editTaskForm.datedefin || editingTask.datedefin,
    }).eq('id', editingTask.id);
    setEditingTask(null);
    fetchTasks();
  };

  const handleDeleteTask = async (taskId: number) => {
    await supabase.from('projettache').delete().eq('id', taskId);
    fetchTasks();
  };

  const handleChangeTaskStatus = async (taskId: number, newStatus: string) => {
    await supabase.from('projettache').update({ statut: newStatus }).eq('id', taskId);
    fetchTasks();
  };

  // ── Users ──
  const handleAddUser = async (userId: number) => {
    const exists = projectUsers.some((pu) => pu.utilisateur_id === userId);
    if (exists) return;
    await supabase.from('projet_utilisateurs').insert({ projet_id: projectId, tacheid: 0, utilisateur_id: userId });
    fetchProjectUsers();
  };

  const handleRemoveUser = async (puId: number) => {
    await supabase.from('projet_utilisateurs').delete().eq('id', puId);
    fetchProjectUsers();
  };

  // ── Helpers ──
  const getClientName = (cid: number) => {
    const c = clients.find((cl) => cl.id === cid);
    return c ? c.nomclient : null;
  };

  const assignedUserIds = projectUsers.map((pu) => pu.utilisateur_id);
  const availableUsers = shopUsers.filter((su) => !assignedUserIds.includes(su.id));

  // ── Gantt calculations ──
  const tasksWithDates = tasks.filter((t) => t.datedebut && t.datedefin);
  const ganttMin = tasksWithDates.length > 0
    ? Math.min(...tasksWithDates.map((t) => new Date(t.datedebut).getTime()))
    : Date.now();
  const ganttMax = tasksWithDates.length > 0
    ? Math.max(...tasksWithDates.map((t) => new Date(t.datedefin).getTime()))
    : Date.now() + 86400000 * 30;
  const ganttSpan = Math.max(ganttMax - ganttMin, 86400000);

  if (loading) {
    return <div className="flex items-center justify-center py-32"><i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>;
  }
  if (!project) {
    return (
      <div className="flex flex-col items-center py-32">
        <i className="ri-error-warning-line text-4xl text-foreground-300 mb-3"></i>
        <p className="text-foreground-500">Projet introuvable</p>
        <button onClick={() => navigate('/dashboard/gestionpro')} className="mt-4 px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm cursor-pointer">Retour</button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Back + Header */}
      <button onClick={() => navigate('/dashboard/gestionpro')} className="flex items-center gap-1.5 text-sm text-foreground-500 hover:text-foreground-700 mb-4 cursor-pointer">
        <i className="ri-arrow-left-line"></i> Retour aux projets
      </button>

      <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-xl font-bold text-foreground-950 font-heading">{project.titre}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[project.status]}`}>{STATUS_LABEL[project.status]}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-foreground-500">
              {getClientName(project.clientid) && (
                <span className="flex items-center gap-1"><i className="ri-user-line"></i>{getClientName(project.clientid)}</span>
              )}
              <span className="flex items-center gap-1"><i className="ri-calendar-line"></i>{new Date(project.datedebut).toLocaleDateString('fr-FR')}</span>
              <span className="flex items-center gap-1"><i className="ri-arrow-right-line"></i>{new Date(project.datedefin).toLocaleDateString('fr-FR')}</span>
              <span className="flex items-center gap-1"><i className="ri-team-line"></i>{projectUsers.length} utilisateur{projectUsers.length > 1 ? 's' : ''}</span>
              <span className="flex items-center gap-1"><i className="ri-task-line"></i>{tasks.length} tâche{tasks.length > 1 ? 's' : ''}</span>
            </div>
            {project.description && <p className="text-sm text-foreground-600 mt-3 line-clamp-2">{project.description}</p>}
          </div>
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-background-100 text-foreground-700 rounded-full text-sm font-medium cursor-pointer hover:bg-background-200/70 whitespace-nowrap transition-colors">
            <i className="ri-pencil-line"></i> Modifier
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-background-100 rounded-full p-1 mb-6 w-fit">
        {([
          { key: 'liste', icon: 'ri-list-check', label: 'Liste' },
          { key: 'kanban', icon: 'ri-layout-column-line', label: 'Kanban' },
          { key: 'gantt', icon: 'ri-bar-chart-horizontal-line', label: 'Gantt' },
          { key: 'utilisateurs', icon: 'ri-team-line', label: 'Utilisateurs' },
          { key: 'fichiers', icon: 'ri-folder-line', label: 'Fichiers' },
        ] as { key: Tab; icon: string; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-background-50 text-foreground-950 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'}`}>
            <i className={`${t.icon} text-xs`}></i>{t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Liste ── */}
      {tab === 'liste' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground-900">{tasks.length} tâche{tasks.length > 1 ? 's' : ''}</h3>
            <button onClick={() => setShowTaskForm(!showTaskForm)}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 text-background-50 rounded-full text-xs font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap transition-colors">
              <i className="ri-add-line"></i>Nouvelle tâche
            </button>
          </div>

          {showTaskForm && (
            <div className="bg-background-50 border border-background-200/70 rounded-lg p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Titre *</label>
                  <input type="text" value={newTask.titre} onChange={(e) => setNewTask({ ...newTask, titre: e.target.value })}
                    placeholder="Titre de la tâche" className="w-full px-3 py-2 border border-background-200/70 rounded-lg text-sm focus:outline-none focus:border-primary-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Assigné à</label>
                  <input type="text" value={newTask.assigner} onChange={(e) => setNewTask({ ...newTask, assigner: e.target.value })}
                    placeholder="Nom de la personne" className="w-full px-3 py-2 border border-background-200/70 rounded-lg text-sm focus:outline-none focus:border-primary-300" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Priorité</label>
                  <select value={newTask.priorite} onChange={(e) => setNewTask({ ...newTask, priorite: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300">
                    <option value={1}>Haute</option><option value={2}>Moyenne</option><option value={3}>Basse</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Date début</label>
                  <input type="date" value={newTask.datedebut} onChange={(e) => setNewTask({ ...newTask, datedebut: e.target.value })}
                    className="w-full px-3 py-2 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Date fin</label>
                  <input type="date" value={newTask.datedefin} onChange={(e) => setNewTask({ ...newTask, datedefin: e.target.value })}
                    className="w-full px-3 py-2 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">Description</label>
                <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={2} placeholder="Description" className="w-full px-3 py-2 border border-background-200/70 rounded-lg text-sm resize-none focus:outline-none focus:border-primary-300" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateTask} disabled={!newTask.titre}
                  className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-xs font-medium cursor-pointer hover:bg-primary-600 disabled:opacity-50 whitespace-nowrap">Ajouter</button>
                <button onClick={() => setShowTaskForm(false)}
                  className="px-3 py-2 text-xs text-foreground-500 cursor-pointer hover:text-foreground-700">Annuler</button>
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center py-16 bg-background-50 border border-background-200/70 rounded-lg">
              <i className="ri-task-line text-3xl text-foreground-300 mb-2"></i>
              <p className="text-sm text-foreground-500">Aucune tâche</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="bg-background-50 border border-background-200/70 rounded-lg p-4 hover:border-background-300/60 transition-colors group">
                  {editingTask?.id === task.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="text" value={editTaskForm.titre} onChange={(e) => setEditTaskForm({ ...editTaskForm, titre: e.target.value })}
                          className="w-full px-3 py-1.5 border border-background-200/70 rounded-lg text-sm focus:outline-none focus:border-primary-300" />
                        <div className="flex gap-2">
                          <select value={editTaskForm.statut} onChange={(e) => setEditTaskForm({ ...editTaskForm, statut: e.target.value })}
                            className="flex-1 px-3 py-1.5 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300">
                            {KANBAN_COLUMNS.map((s) => (<option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>))}
                          </select>
                          <select value={editTaskForm.priorite} onChange={(e) => setEditTaskForm({ ...editTaskForm, priorite: Number(e.target.value) })}
                            className="w-28 px-3 py-1.5 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300">
                            <option value={1}>Haute</option><option value={2}>Moyenne</option><option value={3}>Basse</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input type="text" value={editTaskForm.assigner} onChange={(e) => setEditTaskForm({ ...editTaskForm, assigner: e.target.value })}
                          placeholder="Assigné à" className="px-3 py-1.5 border border-background-200/70 rounded-lg text-sm focus:outline-none focus:border-primary-300" />
                        <input type="date" value={editTaskForm.datedebut} onChange={(e) => setEditTaskForm({ ...editTaskForm, datedebut: e.target.value })}
                          className="px-3 py-1.5 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300" />
                        <input type="date" value={editTaskForm.datedefin} onChange={(e) => setEditTaskForm({ ...editTaskForm, datedefin: e.target.value })}
                          className="px-3 py-1.5 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300" />
                      </div>
                      <textarea value={editTaskForm.description} onChange={(e) => setEditTaskForm({ ...editTaskForm, description: e.target.value })}
                        rows={1} placeholder="Description" className="w-full px-3 py-1.5 border border-background-200/70 rounded-lg text-sm resize-none focus:outline-none focus:border-primary-300" />
                      <div className="flex gap-2">
                        <button onClick={handleEditTask} className="px-3 py-1.5 bg-primary-500 text-background-50 rounded-full text-xs font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap">Enregistrer</button>
                        <button onClick={() => setEditingTask(null)} className="px-3 py-1.5 text-xs text-foreground-500 cursor-pointer hover:text-foreground-700">Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-semibold text-foreground-900">{task.titre}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[task.priorite]}`}>{PRIORITY_LABEL[task.priorite]}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TASK_STATUS_COLOR[task.statut]}`}>{TASK_STATUS_LABEL[task.statut]}</span>
                        </div>
                        {task.description && <p className="text-xs text-foreground-500 line-clamp-1 mb-1.5">{task.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-foreground-400 flex-wrap">
                          {task.assigner && <span><i className="ri-user-line mr-0.5"></i>{task.assigner}</span>}
                          {task.datedebut && <span><i className="ri-calendar-line mr-0.5"></i>{new Date(task.datedebut).toLocaleDateString('fr-FR')}</span>}
                          {task.datedefin && <span><i className="ri-flag-line mr-0.5"></i>{new Date(task.datedefin).toLocaleDateString('fr-FR')}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditTask(task)} className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-300 hover:text-primary-500 cursor-pointer" title="Modifier">
                          <i className="ri-pencil-line text-xs"></i>
                        </button>
                        <button onClick={() => handleDeleteTask(task.id)} className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer" title="Supprimer">
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Kanban ── */}
      {tab === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.statut === col);
            return (
              <div key={col} className="bg-background-50 border border-background-200/70 rounded-lg p-3 min-h-[200px]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-foreground-700">{TASK_STATUS_LABEL[col]}</span>
                  <span className="text-xs text-foreground-400 bg-background-100 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <div key={task.id} className="bg-background-50 border border-background-200/70 rounded-lg p-3 hover:border-background-300/60 transition-colors group">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-xs font-medium text-foreground-900 line-clamp-2">{task.titre}</p>
                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${PRIORITY_COLOR[task.priorite]} flex-shrink-0`}>{PRIORITY_LABEL[task.priorite]}</span>
                      </div>
                      {task.assigner && <p className="text-xs text-foreground-400 mb-1.5"><i className="ri-user-line mr-0.5"></i>{task.assigner}</p>}
                      <div className="flex items-center justify-between">
                        {task.datedefin && <span className="text-xs text-foreground-400">{new Date(task.datedefin).toLocaleDateString('fr-FR')}</span>}
                        <select value={task.statut} onChange={(e) => handleChangeTaskStatus(task.id, e.target.value)}
                          className="text-xs px-2 py-1 border border-background-200/70 rounded-full bg-background-50 cursor-pointer focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity">
                          {KANBAN_COLUMNS.map((s) => (<option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: Gantt ── */}
      {tab === 'gantt' && (
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 overflow-x-auto">
          {tasksWithDates.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <i className="ri-bar-chart-horizontal-line text-3xl text-foreground-300 mb-2"></i>
              <p className="text-sm text-foreground-500">Ajoutez des tâches avec des dates pour voir le diagramme de Gantt</p>
            </div>
          ) : (
            <div className="min-w-[600px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground-900">Diagramme de Gantt</h3>
                <span className="text-xs text-foreground-400">
                  {new Date(ganttMin).toLocaleDateString('fr-FR')} → {new Date(ganttMax).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="space-y-2">
                {tasksWithDates.map((task) => {
                  const left = ((new Date(task.datedebut).getTime() - ganttMin) / ganttSpan) * 100;
                  const width = Math.max(((new Date(task.datedefin).getTime() - new Date(task.datedebut).getTime()) / ganttSpan) * 100, 2);
                  return (
                    <div key={task.id} className="flex items-center gap-3">
                      <div className="w-40 flex-shrink-0 text-xs text-foreground-700 truncate" title={task.titre}>{task.titre}</div>
                      <div className="flex-1 relative h-7 bg-background-100 rounded-full overflow-hidden">
                        <div className={`absolute top-0 h-full rounded-full ${task.statut === 'termine' ? 'bg-secondary-500' : task.statut === 'en_cours' ? 'bg-accent-500' : task.statut === 'en_revision' ? 'bg-amber-400' : 'bg-primary-500'}`}
                          style={{ left: `${left}%`, width: `${width}%` }}>
                        </div>
                      </div>
                      <span className="text-xs text-foreground-400 w-32 flex-shrink-0 text-right">{new Date(task.datedebut).toLocaleDateString('fr-FR')} - {new Date(task.datedefin).toLocaleDateString('fr-FR')}</span>
                    </div>
                  );
                })}
              </div>
              {/* Month markers */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-background-200/70">
                <div className="w-40 flex-shrink-0"></div>
                <div className="flex-1 relative h-4">
                  {(() => {
                    const months: { label: string; left: number }[] = [];
                    const start = new Date(ganttMin);
                    const end = new Date(ganttMax);
                    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
                    while (cursor <= end) {
                      const left = ((cursor.getTime() - ganttMin) / ganttSpan) * 100;
                      months.push({ label: cursor.toLocaleDateString('fr-FR', { month: 'short' }), left });
                      cursor.setMonth(cursor.getMonth() + 1);
                    }
                    return months.map((m, i) => (
                      <span key={i} className="absolute text-xs text-foreground-400" style={{ left: `${m.left}%` }}>{m.label}</span>
                    ));
                  })()}
                </div>
                <div className="w-32 flex-shrink-0"></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Utilisateurs ── */}
      {tab === 'utilisateurs' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground-900">{projectUsers.length} utilisateur{projectUsers.length > 1 ? 's' : ''} assigné{projectUsers.length > 1 ? 's' : ''}</h3>
          </div>

          {availableUsers.length > 0 && (
            <div className="bg-background-50 border border-background-200/70 rounded-lg p-4 mb-4">
              <p className="text-xs font-medium text-foreground-600 mb-2">Ajouter un utilisateur au projet</p>
              <div className="flex flex-wrap gap-2">
                {availableUsers.map((su) => (
                  <button key={su.id} onClick={() => handleAddUser(su.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-background-100 text-foreground-600 border border-background-200/70 cursor-pointer hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-colors whitespace-nowrap">
                    <i className="ri-add-line"></i>{su.name || su.user_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {projectUsers.length === 0 ? (
            <div className="flex flex-col items-center py-16 bg-background-50 border border-background-200/70 rounded-lg">
              <i className="ri-team-line text-3xl text-foreground-300 mb-2"></i>
              <p className="text-sm text-foreground-500">Aucun utilisateur assigné</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projectUsers.map((pu) => (
                <div key={pu.id} className="flex items-center justify-between bg-background-50 border border-background-200/70 rounded-lg p-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary-600">{(pu.user_name_display || '?')[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground-900">{pu.user_name_display || `Utilisateur #${pu.utilisateur_id}`}</p>
                      <p className="text-xs text-foreground-400">Accès au projet</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveUser(pu.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <i className="ri-close-line text-xs"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Fichiers ── */}
      {tab === 'fichiers' && (
        <ProjectFilesTab projectId={projectId} userId={user?.id || 0} />
      )}

      {/* Edit project modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEdit(false)}>
          <div className="bg-background-50 rounded-xl border border-background-200/70 p-6 w-full max-w-lg mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground-900">Modifier le projet</h3>
              <button onClick={() => setShowEdit(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line"></i></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">Nom</label>
                <input type="text" value={editForm.titre} onChange={(e) => setEditForm({ ...editForm, titre: e.target.value })}
                  className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm focus:outline-none focus:border-primary-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Date début</label>
                  <input type="date" value={editForm.datedebut} onChange={(e) => setEditForm({ ...editForm, datedebut: e.target.value })}
                    className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Date fin</label>
                  <input type="date" value={editForm.datedefin} onChange={(e) => setEditForm({ ...editForm, datedefin: e.target.value })}
                    className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Statut</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300">
                    <option value={1}>En cours</option><option value={4}>En attente</option><option value={2}>Terminé</option><option value={3}>Annulé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Client</label>
                  <select value={editForm.clientid} onChange={(e) => setEditForm({ ...editForm, clientid: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300">
                    <option value={0}>Aucun client</option>
                    {clients.map((c) => (<option key={c.id} value={c.id}>{c.nomclient}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2} className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm resize-none focus:outline-none focus:border-primary-300" />
              </div>
            </div>
            <div className="flex gap-3 mt-5 pt-4 border-t border-background-200/70">
              <button onClick={handleEditProject} className="flex-1 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap">Enregistrer</button>
              <button onClick={() => setShowEdit(false)} className="px-4 py-2.5 bg-background-100 text-foreground-600 rounded-full text-sm cursor-pointer hover:bg-background-200/70 whitespace-nowrap">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}