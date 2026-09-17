import type { Task } from '../types';
import {
  PRIORITY_FLAG_COLOR,
  TASK_STATUS_LABEL,
  TASK_STATUS_DOT,
  TASK_STATUS_TEXT,
  isTaskOverdue,
} from '../types';

interface TaskRowProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onOpen: (task: Task) => void;
}

function avatarColor(name: string): string {
  const palette = [
    'bg-accent-100 text-accent-700',
    'bg-secondary-100 text-secondary-700',
    'bg-amber-100 text-amber-700',
    'bg-primary-100 text-primary-700',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return palette[h % palette.length];
}

export default function TaskRow({ task, onToggleComplete, onOpen }: TaskRowProps) {
  const done = task.statut === 'termine';
  const overdue = isTaskOverdue(task);

  return (
    <div
      onClick={() => onOpen(task)}
      className="group flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-background-100/70 transition-colors cursor-pointer"
    >
      {/* Case à cocher */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task);
        }}
        title={done ? 'Marquer comme à faire' : 'Terminer la tâche'}
        className="flex-shrink-0 cursor-pointer"
      >
        <i
          className={`${
            done
              ? 'ri-checkbox-circle-fill text-secondary-500'
              : 'ri-checkbox-blank-circle-line text-foreground-300 hover:text-primary-500'
          } text-lg`}
        ></i>
      </button>

      {/* Priorité */}
      <span
        className={`w-4 flex-shrink-0 flex justify-center text-base ${PRIORITY_FLAG_COLOR[task.priorite]}`}
        title={`Priorité ${task.priorite === 1 ? 'haute' : task.priorite === 2 ? 'moyenne' : 'basse'}`}
      >
        <i className="ri-flag-line"></i>
      </span>

      {/* Titre */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate ${
            done ? 'line-through text-foreground-400' : 'text-foreground-900'
          }`}
        >
          {task.titre}
        </p>
      </div>

      {/* Statut (desktop) */}
      <span
        className={`hidden md:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-background-100 ${TASK_STATUS_TEXT[task.statut]} flex-shrink-0 whitespace-nowrap`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${TASK_STATUS_DOT[task.statut]}`}></span>
        {TASK_STATUS_LABEL[task.statut]}
      </span>

      {/* Échéance */}
      {task.datedefin && (
        <span
          className={`text-xs flex-shrink-0 whitespace-nowrap ${
            overdue ? 'text-red-500 font-medium' : 'text-foreground-400'
          }`}
        >
          <i className="ri-calendar-line mr-1"></i>
          {new Date(task.datedefin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </span>
      )}

      {/* Assigné */}
      {task.assigner && (
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${avatarColor(task.assigner)}`}
          title={task.assigner}
        >
          {task.assigner[0].toUpperCase()}
        </div>
      )}
    </div>
  );
}