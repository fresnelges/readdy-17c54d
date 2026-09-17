import { useEffect, useState } from 'react';
import type { Task } from '../types';
import MemberSelect from './MemberSelect';
import {
  KANBAN_COLUMNS,
  TASK_STATUS_LABEL,
  TASK_STATUS_DOT,
  PRIORITY_LABEL,
  PRIORITY_BADGE,
} from '../types';

interface TaskDetailPanelProps {
  task: Task | null;
  members: { id: number; name: string; image?: string | null }[];
  onClose: () => void;
  onSave: (taskId: number, updates: Partial<Task>) => void;
  onChangeStatus: (taskId: number, status: string) => void;
  onDelete: (taskId: number) => void;
}

export default function TaskDetailPanel({
  task,
  members,
  onClose,
  onSave,
  onChangeStatus,
  onDelete,
}: TaskDetailPanelProps) {
  const [form, setForm] = useState({
    titre: '',
    description: '',
    assigner: '',
    priorite: 2,
    datedebut: '',
    datedefin: '',
  });

  useEffect(() => {
    if (task) {
      setForm({
        titre: task.titre,
        description: task.description || '',
        assigner: task.assigner || '',
        priorite: task.priorite,
        datedebut: task.datedebut ? task.datedebut.slice(0, 10) : '',
        datedefin: task.datedefin ? task.datedefin.slice(0, 10) : '',
      });
    }
  }, [task]);

  if (!task) return null;

  const save = () =>
    onSave(task.id, {
      titre: form.titre,
      description: form.description,
      assigner: form.assigner,
      priorite: form.priorite,
      datedebut: form.datedebut || task.datedebut,
      datedefin: form.datedefin || task.datedefin,
    });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} aria-hidden="true" />

      <div className="fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-md bg-background-50 border-l border-background-200/70 flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-background-200/70 flex-shrink-0">
          <span className="text-sm font-semibold text-foreground-900">Détails de la tâche</span>
          <button
            onClick={onClose}
            title="Fermer"
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:text-foreground-800 hover:bg-background-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
          {/* Statut (segmented) */}
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1.5">Statut</label>
            <div className="flex gap-1 bg-background-100 rounded-full p-1">
              {KANBAN_COLUMNS.map((s) => (
                <button
                  key={s}
                  onClick={() => onChangeStatus(task.id, s)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    task.statut === s
                      ? 'bg-background-50 text-foreground-900'
                      : 'text-foreground-500 hover:text-foreground-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${TASK_STATUS_DOT[s]}`}></span>
                  {TASK_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1.5">Titre</label>
            <input
              type="text"
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm font-medium text-foreground-900 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {/* Priorité */}
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1.5">Priorité</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  onClick={() => setForm({ ...form, priorite: p })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-colors whitespace-nowrap ${
                    form.priorite === p
                      ? PRIORITY_BADGE[p] + ' border-transparent'
                      : 'bg-background-50 text-foreground-500 border-background-200/70 hover:border-background-300/60'
                  }`}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Assigné */}
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1.5">Assigné à</label>
            <MemberSelect
              value={form.assigner}
              members={members}
              onChange={(name) => setForm({ ...form, assigner: name })}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1.5">Date de début</label>
              <input
                type="date"
                value={form.datedebut}
                onChange={(e) => setForm({ ...form, datedebut: e.target.value })}
                className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1.5">Échéance</label>
              <input
                type="date"
                value={form.datedefin}
                onChange={(e) => setForm({ ...form, datedefin: e.target.value })}
                className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-primary-300"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={5}
              placeholder="Ajouter une description…"
              className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 resize-none focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>

        {/* Pied */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-background-200/70 flex-shrink-0">
          <button
            onClick={() => onDelete(task.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-red-500 hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-delete-bin-line"></i>Supprimer
          </button>
          <button
            onClick={save}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-500 text-background-50 text-xs font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-check-line"></i>Enregistrer
          </button>
        </div>
      </div>
    </>
  );
}