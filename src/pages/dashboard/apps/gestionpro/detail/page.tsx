import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getCommerceId } from '@/lib/ownership';
import ProjectFilesTab from '../components/ProjectFilesTab';
import TaskRow from './components/TaskRow';
import TaskDetailPanel from './components/TaskDetailPanel';
import MemberAvatar from './components/MemberAvatar';
import MemberSelect from './components/MemberSelect';
import type { Project, Task, Client, ShopUser, ProjectUser } from './types';
import {
  STATUS_LABEL,
  STATUS_STYLE,
  TASK_STATUS_LABEL,
  TASK_STATUS_DOT,
  TASK_STATUS_TEXT,
  KANBAN_COLUMNS,
  PRIORITY_LABEL,
  PRIORITY_BADGE,
} from './types';

type Tab = 'liste' | 'kanban' | 'gantt' | 'utilisateurs' | 'fichiers';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'liste', icon: 'ri-list-check', label: 'Liste' },
  { key: 'kanban', icon: 'ri-layout-column-line', label: 'Kanban' },
  { key: 'gantt', icon: 'ri-bar-chart-horizontal-line', label: 'Gantt' },
  { key: 'utilisateurs', icon: 'ri-team-line', label: 'Membres' },
  { key: 'fichiers', icon: 'ri-folder-line', label: 'Fichiers' },
];

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

  // Filtres / tris
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'priority' | 'due'>('default');
  const [sortOpen, setSortOpen] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Édition projet
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ titre: '', description: '', datedebut: '', datedefin: '', clientid: 0, status: 1 });

  // Nouvelle tâche (modal)
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ titre: '', description: '', assigner: '', priorite: 2, datedebut: '', datedefin: '' });

  // Tâche sélectionnée (panneau latéral)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
      const { data: usersData } = await supabase.from('users').select('id, user_name, name, image').in('id', ids);
      const userMap: Record<number, { name: string; image?: string }> = {};
      (usersData || []).forEach((u) => { userMap[u.id] = { name: u.name || u.user_name, image: u.image || undefined }; });
      pu.forEach((p) => {
        const meta = userMap[p.utilisateur_id];
        p.user_name_display = meta?.name || `User #${p.utilisateur_id}`;
        p.image = meta?.image;
      });
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
    const commerceId = getCommerceId(user);
    const { data } = await supabase
      .from('users')
      .select('id, user_name, name, email, image')
      .eq('active', 1)
      .or(`idcommerce.eq.${commerceId},id.eq.${commerceId}`)
      .order('name');
    setShopUsers(data || []);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProject(), fetchTasks(), fetchProjectUsers(), fetchClients(), fetchShopUsers()])
      .finally(() => setLoading(false));
  }, [fetchProject, fetchTasks, fetchProjectUsers, fetchClients, fetchShopUsers]);

  // ── Projet ──
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

  // ── Tâches ──
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

  const handleChangeTaskStatus = async (taskId: number, newStatus: string) => {
    await supabase.from('projettache').update({ statut: newStatus }).eq('id', taskId);
    fetchTasks();
    setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, statut: newStatus } : prev));
  };

  const handleToggleComplete = async (task: Task) => {
    const next = task.statut === 'termine' ? 'a_faire' : 'termine';
    await handleChangeTaskStatus(task.id, next);
  };

  const handleSaveTask = async (taskId: number, updates: Partial<Task>) => {
    await supabase.from('projettache').update(updates).eq('id', taskId);
    fetchTasks();
    setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, ...updates } : prev));
  };

  const handleDeleteTask = async (taskId: number) => {
    await supabase.from('projettache').delete().eq('id', taskId);
    setSelectedTask(null);
    fetchTasks();
  };

  // ── Utilisateurs ──
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

  const myName = (user?.name || user?.user_name || '').trim().toLowerCase();
  const myTasksCount = myName
    ? tasks.filter((t) => (t.assigner || '').trim().toLowerCase() === myName).length
    : 0;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.statut === 'termine').length;
  const inProgress = tasks.filter((t) => t.statut === 'en_cours' || t.statut === 'en_revision').length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Filtrage + tri
  const visibleTasks = useMemo(() => {
    let list = tasks;
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter((t) => t.titre.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
    if (onlyMine && myName) {
      list = list.filter((t) => (t.assigner || '').trim().toLowerCase() === myName);
    }
    const arr = [...list];
    if (sortBy === 'priority') arr.sort((a, b) => a.priorite - b.priorite);
    else if (sortBy === 'due') arr.sort((a, b) => (a.datedefin || '').localeCompare(b.datedefin || ''));
    return arr;
  }, [tasks, searchQuery, sortBy, onlyMine, myName]);

  // ── Gantt ──
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
    <div className="min-h-full flex flex-col">
      {/* ── Barre fil d'Ariane ── */}
      <div className="flex items-center gap-2 px-4 md:px-6 py-2.5 border-b border-background-200/70 bg-background-50 flex-shrink-0">
        <button
          onClick={() => navigate('/dashboard/gestionpro')}
          className="flex items-center gap-1 text-sm text-foreground-400 hover:text-foreground-700 cursor-pointer transition-colors"
        >
          <i className="ri-arrow-left-s-line text-base"></i>
          Projets
        </button>
        <i className="ri-arrow-right-s-line text-foreground-300 text-base"></i>
        <span className="text-sm font-medium text-foreground-900 truncate">{project.titre}</span>
      </div>

      {/* ── En-tête projet ── */}
      <div className="px-4 md:px-6 py-5 border-b border-background-200/70 bg-background-50 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-xl md:text-2xl font-bold text-foreground-950 font-heading">{project.titre}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[project.status]}`}>{STATUS_LABEL[project.status]}</span>
            </div>

            {project.description && (
              <p className="text-sm text-foreground-600 max-w-2xl">{project.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-foreground-500">
              {getClientName(project.clientid) && (
                <span className="flex items-center gap-1.5"><i className="ri-user-line"></i>{getClientName(project.clientid)}</span>
              )}
              <span className="flex items-center gap-1.5">
                <i className="ri-calendar-line"></i>
                {new Date(project.datedebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                <span className="text-foreground-300">→</span>
                {new Date(project.datedefin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1.5"><i className="ri-team-line"></i>{projectUsers.length} membre{projectUsers.length > 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-background-100 text-foreground-700 text-sm font-medium cursor-pointer hover:bg-background-200/70 whitespace-nowrap transition-colors"
            >
              <i className="ri-pencil-line"></i>Modifier
            </button>
            <button
              onClick={() => setShowTaskForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-500 text-background-50 text-sm font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap transition-colors"
            >
              <i className="ri-add-line"></i>Tâche
            </button>
          </div>
        </div>

        {/* Progression */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-foreground-600">Avancement</span>
              <span className="text-xs font-semibold text-foreground-900">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-background-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-foreground-500">
            <span><strong className="text-foreground-900">{totalTasks}</strong> tâches</span>
            <span><strong className="text-foreground-900">{doneTasks}</strong> terminées</span>
            <span><strong className="text-foreground-900">{inProgress}</strong> en cours</span>
          </div>
        </div>
      </div>

      {/* ── Onglets + barre d'outils ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-6 py-3 border-b border-background-200/70 bg-background-50 flex-shrink-0">
        <div className="flex items-center gap-1 bg-background-100 rounded-full p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap transition-colors ${
                tab === t.key ? 'bg-background-50 text-foreground-950' : 'text-foreground-500 hover:text-foreground-700'
              }`}
            >
              <i className={`${t.icon} text-xs`}></i>{t.label}
            </button>
          ))}
        </div>

        {tab === 'liste' && (
          <div className="flex items-center gap-2">
            {/* Recherche */}
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm pointer-events-none"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher…"
                className="w-40 md:w-52 pl-9 pr-8 py-2 rounded-full border border-background-200/70 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer">
                  <i className="ri-close-circle-fill text-sm"></i>
                </button>
              )}
            </div>

            {/* Filtre Mes tâches */}
            <button
              onClick={() => setOnlyMine((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium cursor-pointer whitespace-nowrap transition-colors ${
                onlyMine
                  ? 'bg-accent-500 border-accent-500 text-background-50'
                  : 'border-background-200/70 bg-background-50 text-foreground-600 hover:bg-background-100'
              }`}
            >
              <i className="ri-user-line"></i>
              Mes tâches
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  onlyMine ? 'bg-background-50/20 text-background-50' : 'bg-background-100 text-foreground-500'
                }`}
              >
                {myTasksCount}
              </span>
            </button>

            {/* Tri */}
            <div className="relative">
              <button
                onClick={() => setSortOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-background-200/70 bg-background-50 text-xs font-medium text-foreground-600 hover:bg-background-100 cursor-pointer whitespace-nowrap transition-colors"
              >
                <i className="ri-sort-desc"></i>
                {sortBy === 'default' ? 'Trier' : sortBy === 'priority' ? 'Priorité' : 'Échéance'}
                <i className="ri-arrow-down-s-line"></i>
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setSortOpen(false)}></div>
                  <div className="absolute right-0 mt-1 z-30 w-44 bg-background-50 border border-background-200/70 rounded-lg shadow-sm py-1">
                    {([
                      { key: 'default', label: 'Par défaut' },
                      { key: 'priority', label: 'Par priorité' },
                      { key: 'due', label: 'Par échéance' },
                    ] as const).map((o) => (
                      <button
                        key={o.key}
                        onClick={() => { setSortBy(o.key); setSortOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left cursor-pointer hover:bg-background-100 transition-colors ${
                          sortBy === o.key ? 'text-primary-600 font-medium' : 'text-foreground-600'
                        }`}
                      >
                        {sortBy === o.key && <i className="ri-check-line"></i>}
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 px-4 md:px-6 py-4">
        {/* LISTE */}
        {tab === 'liste' && (
          <div>
            {visibleTasks.length === 0 ? (
              <div className="flex flex-col items-center py-20">
                <i className="ri-task-line text-4xl text-foreground-300 mb-3"></i>
                <p className="text-sm text-foreground-500">
                  {tasks.length === 0
                    ? 'Aucune tâche pour le moment'
                    : onlyMine
                      ? 'Aucune tâche ne vous est assignée'
                      : 'Aucun résultat'}
                </p>
                {tasks.length === 0 && (
                  <button onClick={() => setShowTaskForm(true)} className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm cursor-pointer hover:bg-primary-600 whitespace-nowrap">
                    <i className="ri-add-line"></i>Créer une tâche
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {KANBAN_COLUMNS.map((col) => {
                  const colTasks = visibleTasks.filter((t) => t.statut === col);
                  const isCollapsed = collapsed[col];
                  return (
                    <div key={col} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
                      {/* En-tête du groupe */}
                      <button
                        onClick={() => setCollapsed((c) => ({ ...c, [col]: !c[col] }))}
                        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-background-100/60 transition-colors cursor-pointer"
                      >
                        <i className={`ri-arrow-down-s-line text-foreground-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}></i>
                        <span className={`w-2 h-2 rounded-full ${TASK_STATUS_DOT[col]}`}></span>
                        <span className={`text-xs font-semibold uppercase tracking-wide ${TASK_STATUS_TEXT[col]}`}>
                          {TASK_STATUS_LABEL[col]}
                        </span>
                        <span className="text-xs text-foreground-400 bg-background-100 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                      </button>

                      {!isCollapsed && (
                        <div className="px-2 pb-2">
                          {colTasks.length === 0 ? (
                            <p className="text-xs text-foreground-400 px-3 py-4">Aucune tâche dans cette section</p>
                          ) : (
                            colTasks.map((task) => (
                              <TaskRow
                                key={task.id}
                                task={task}
                                onToggleComplete={handleToggleComplete}
                                onOpen={setSelectedTask}
                              />
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* KANBAN */}
        {tab === 'kanban' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.statut === col);
              return (
                <div key={col} className="bg-background-100/50 border border-background-200/70 rounded-lg p-3 min-h-[200px]">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={`w-2 h-2 rounded-full ${TASK_STATUS_DOT[col]}`}></span>
                    <span className="text-xs font-semibold text-foreground-700">{TASK_STATUS_LABEL[col]}</span>
                    <span className="text-xs text-foreground-400 bg-background-50 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="w-full text-left bg-background-50 border border-background-200/70 rounded-lg p-3 hover:border-background-300/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <p className="text-xs font-medium text-foreground-900 line-clamp-2">{task.titre}</p>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${PRIORITY_BADGE[task.priorite]} flex-shrink-0`}>{PRIORITY_LABEL[task.priorite]}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          {task.assigner && <span className="text-xs text-foreground-400 truncate"><i className="ri-user-line mr-1"></i>{task.assigner}</span>}
                          {task.datedefin && <span className="text-xs text-foreground-400 whitespace-nowrap">{new Date(task.datedefin).toLocaleDateString('fr-FR')}</span>}
                        </div>
                      </button>
                    ))}
                    {colTasks.length === 0 && (
                      <p className="text-xs text-foreground-400 text-center py-6">Aucune tâche</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* GANTT */}
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

        {/* UTILISATEURS */}
        {tab === 'utilisateurs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground-900">{projectUsers.length} membre{projectUsers.length > 1 ? 's' : ''}</h3>
            </div>

            {availableUsers.length > 0 && (
              <div className="bg-background-50 border border-background-200/70 rounded-lg p-4 mb-4">
                <p className="text-xs font-medium text-foreground-600 mb-2">Ajouter un membre au projet</p>
                <div className="flex flex-wrap gap-2">
                  {availableUsers.map((su) => (
                    <button key={su.id} onClick={() => handleAddUser(su.id)}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-xs bg-background-100 text-foreground-600 border border-background-200/70 cursor-pointer hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-colors whitespace-nowrap">
                      <MemberAvatar image={su.image} name={su.name || su.user_name} size="sm" />
                      <i className="ri-add-line"></i>{su.name || su.user_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {projectUsers.length === 0 ? (
              <div className="flex flex-col items-center py-16 bg-background-50 border border-background-200/70 rounded-lg">
                <i className="ri-team-line text-3xl text-foreground-300 mb-2"></i>
                <p className="text-sm text-foreground-500">Aucun membre assigné</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projectUsers.map((pu) => (
                  <div key={pu.id} className="flex items-center justify-between bg-background-50 border border-background-200/70 rounded-lg p-3 group">
                    <div className="flex items-center gap-3">
                      <MemberAvatar image={pu.image} name={pu.user_name_display || `Utilisateur #${pu.utilisateur_id}`} />
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

        {/* FICHIERS */}
        {tab === 'fichiers' && (
          <ProjectFilesTab projectId={projectId} userId={user?.id || 0} />
        )}
      </div>

      {/* ── Panneau latéral détail tâche ── */}
      <TaskDetailPanel
        task={selectedTask}
        members={projectUsers.map((pu) => ({
          id: pu.utilisateur_id,
          name: pu.user_name_display || `User #${pu.utilisateur_id}`,
          image: pu.image,
        }))}
        onClose={() => setSelectedTask(null)}
        onSave={handleSaveTask}
        onChangeStatus={handleChangeTaskStatus}
        onDelete={handleDeleteTask}
      />

      {/* ── Modal nouvelle tâche ── */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowTaskForm(false)}>
          <div className="bg-background-50 rounded-xl border border-background-200/70 p-6 w-full max-w-lg mx-4 max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground-900">Nouvelle tâche</h3>
              <button onClick={() => setShowTaskForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line"></i></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">Titre *</label>
                <input type="text" value={newTask.titre} onChange={(e) => setNewTask({ ...newTask, titre: e.target.value })}
                  placeholder="Titre de la tâche" className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm focus:outline-none focus:border-primary-300" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Assigné à</label>
                  <MemberSelect
                    value={newTask.assigner}
                    members={projectUsers.map((pu) => ({
                      id: pu.utilisateur_id,
                      name: pu.user_name_display || `User #${pu.utilisateur_id}`,
                      image: pu.image,
                    }))}
                    onChange={(name) => setNewTask({ ...newTask, assigner: name })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Priorité</label>
                  <select value={newTask.priorite} onChange={(e) => setNewTask({ ...newTask, priorite: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300">
                    <option value={1}>Haute</option><option value={2}>Moyenne</option><option value={3}>Basse</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Date début</label>
                  <input type="date" value={newTask.datedebut} onChange={(e) => setNewTask({ ...newTask, datedebut: e.target.value })}
                    className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">Date fin</label>
                  <input type="date" value={newTask.datedefin} onChange={(e) => setNewTask({ ...newTask, datedefin: e.target.value })}
                    className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">Description</label>
                <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={3} placeholder="Description" className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm resize-none focus:outline-none focus:border-primary-300" />
              </div>
            </div>
            <div className="flex gap-3 mt-5 pt-4 border-t border-background-200/70">
              <button onClick={handleCreateTask} disabled={!newTask.titre}
                className="flex-1 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 disabled:opacity-50 whitespace-nowrap">Créer la tâche</button>
              <button onClick={() => setShowTaskForm(false)} className="px-4 py-2.5 bg-background-100 text-foreground-600 rounded-full text-sm cursor-pointer hover:bg-background-200/70 whitespace-nowrap">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal édition projet ── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEdit(false)}>
          <div className="bg-background-50 rounded-xl border border-background-200/70 p-6 w-full max-w-lg mx-4 max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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