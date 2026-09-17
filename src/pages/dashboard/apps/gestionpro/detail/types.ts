export interface Project {
  id: number;
  titre: string;
  description: string;
  status: number;
  datedebut: string;
  datedefin: string;
  clientid: number;
  owner: number;
}

export interface Task {
  id: number;
  idprojet: number;
  titre: string;
  description: string;
  assigner: string;
  priorite: number;
  statut: string;
  duree: string;
  datecreation: string;
  datedebut: string;
  datedefin: string;
  owner: number;
}

export interface Client {
  id: number;
  nomclient: string;
  email: string;
}

export interface ShopUser {
  id: number;
  user_name: string;
  name: string;
  email: string;
  image?: string;
}

export interface ProjectUser {
  id: number;
  projet_id: number;
  tacheid: number;
  utilisateur_id: number;
  user_name?: string;
  user_name_display?: string;
  image?: string;
}

export const STATUS_LABEL: Record<number, string> = {
  1: 'En cours',
  2: 'Terminé',
  3: 'Annulé',
  4: 'En attente',
};

export const STATUS_STYLE: Record<number, string> = {
  1: 'bg-accent-50 text-accent-700',
  2: 'bg-secondary-50 text-secondary-700',
  3: 'bg-background-100 text-foreground-500',
  4: 'bg-amber-50 text-amber-700',
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  en_revision: 'En révision',
  termine: 'Terminé',
};

export const TASK_STATUS_DOT: Record<string, string> = {
  a_faire: 'bg-foreground-300',
  en_cours: 'bg-accent-500',
  en_revision: 'bg-amber-400',
  termine: 'bg-secondary-500',
};

export const TASK_STATUS_TEXT: Record<string, string> = {
  a_faire: 'text-foreground-500',
  en_cours: 'text-accent-600',
  en_revision: 'text-amber-600',
  termine: 'text-secondary-600',
};

export const KANBAN_COLUMNS = ['a_faire', 'en_cours', 'en_revision', 'termine'];

export const PRIORITY_LABEL: Record<number, string> = { 1: 'Haute', 2: 'Moyenne', 3: 'Basse' };

export const PRIORITY_FLAG_COLOR: Record<number, string> = {
  1: 'text-red-500',
  2: 'text-amber-500',
  3: 'text-foreground-300',
};

export const PRIORITY_BADGE: Record<number, string> = {
  1: 'bg-red-50 text-red-600',
  2: 'bg-amber-50 text-amber-600',
  3: 'bg-background-100 text-foreground-500',
};

export function isTaskOverdue(task: Task): boolean {
  return (
    task.statut !== 'termine' &&
    !!task.datedefin &&
    new Date(task.datedefin).getTime() < Date.now()
  );
}