import { useEffect, useMemo, useState } from 'react';
import type { CondFormatOperator, ConditionalFormatRule } from '@/lib/documents';
import { colLabel } from '@/lib/excelModel';
import {
  COND_BG_PRESETS,
  COND_OPERATORS,
} from '@/lib/excelConditionalFormat';

export interface CondRange {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

interface ConditionalFormatDialogProps {
  open: boolean;
  rules: ConditionalFormatRule[];
  selectionRange: CondRange | null;
  onAdd: (rule: Omit<ConditionalFormatRule, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<ConditionalFormatRule>) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  notify: (msg: string) => void;
}

function rangeLabel(r: CondRange): string {
  if (r.r1 === r.r2 && r.c1 === r.c2) return `${colLabel(r.c1)}${r.r1 + 1}`;
  return `${colLabel(r.c1)}${r.r1 + 1}:${colLabel(r.c2)}${r.r2 + 1}`;
}

function fieldCls(): string {
  return 'h-8 px-2 rounded-md border border-background-200/70 bg-white text-xs text-foreground-800 focus:outline-none focus:border-primary-400 cursor-pointer';
}

export default function ConditionalFormatDialog({
  open,
  rules,
  selectionRange,
  onAdd,
  onUpdate,
  onRemove,
  onClose,
  notify,
}: ConditionalFormatDialogProps) {
  const [newOperator, setNewOperator] = useState<CondFormatOperator>('gt');
  const [newValue, setNewValue] = useState('');
  const [newValue2, setNewValue2] = useState('');
  const [newBg, setNewBg] = useState('#f4cccc');

  useEffect(() => {
    if (open) {
      setNewOperator('gt');
      setNewValue('');
      setNewValue2('');
      setNewBg('#f4cccc');
    }
  }, [open]);

  const newOpt = useMemo(
    () => COND_OPERATORS.find((o) => o.value === newOperator),
    [newOperator],
  );

  if (!open) return null;

  const addRule = () => {
    if (!selectionRange) {
      notify('Sélectionnez d\u2019abord des cellules.');
      return;
    }
    onAdd({
      ...selectionRange,
      operator: newOperator,
      value: newValue || undefined,
      value2: newValue2 || undefined,
      bg: newBg,
      color: undefined,
    });
    notify('Règle ajoutée.');
  };

  const opLabel = (v: CondFormatOperator) =>
    COND_OPERATORS.find((o) => o.value === v)?.label ?? v;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground-950/40" onClick={onClose}></div>
      <div className="relative w-[560px] max-w-[92vw] max-h-[82vh] flex flex-col rounded-xl bg-background-50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-background-200/70">
          <h3 className="text-sm font-semibold text-foreground-900">
            Mise en forme conditionnelle
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
          >
            <i className="ri-close-line text-base"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Création d'une nouvelle règle */}
          <div className="rounded-lg border border-background-200/70 p-3 space-y-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground-500">
              Nouvelle règle
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-600 flex-shrink-0">Appliquer à</span>
              <span className="px-2 py-1 rounded-md bg-background-100 text-xs font-mono text-foreground-800">
                {selectionRange ? rangeLabel(selectionRange) : '— sélection —'}
              </span>
            </div>
            <select
              value={newOperator}
              onChange={(e) => setNewOperator(e.target.value as CondFormatOperator)}
              className={`${fieldCls()} w-full`}
            >
              {COND_OPERATORS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {newOpt?.needsValue && (
              <div className="flex gap-2">
                <input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={newOpt.needsValue2 ? 'Valeur 1' : 'Valeur'}
                  className={`${fieldCls()} flex-1`}
                />
                {newOpt.needsValue2 && (
                  <input
                    value={newValue2}
                    onChange={(e) => setNewValue2(e.target.value)}
                    placeholder="Valeur 2"
                    className={`${fieldCls()} flex-1`}
                  />
                )}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-foreground-600">Couleur de fond</span>
              <div className="flex items-center gap-1 flex-wrap">
                {COND_BG_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewBg(c)}
                    className={`w-6 h-6 rounded-md border ${
                      newBg === c ? 'border-primary-500 ring-2 ring-primary-300' : 'border-background-200/70'
                    } cursor-pointer`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <label className="relative w-6 h-6 rounded-md border border-background-200/70 cursor-pointer overflow-hidden">
                <input
                  type="color"
                  value={newBg}
                  onChange={(e) => setNewBg(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={!selectionRange}
              onClick={addRule}
              className="h-8 px-3 rounded-md bg-primary-500 text-background-50 text-xs font-medium hover:bg-primary-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Ajouter la règle
            </button>
            {!selectionRange && (
              <p className="text-[11px] text-foreground-500">
                Sélectionnez des cellules dans la feuille pour définir la plage.
              </p>
            )}
          </div>

          {/* Règles existantes */}
          {rules.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground-500">
                Règles existantes ({rules.length})
              </div>
              {rules.map((rule) => {
                const opt = COND_OPERATORS.find((o) => o.value === rule.operator);
                return (
                  <div
                    key={rule.id}
                    className="rounded-lg border border-background-200/70 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-md bg-background-100 text-xs font-mono text-foreground-800">
                        {rangeLabel(rule)}
                      </span>
                      <span className="text-xs text-foreground-600">{opLabel(rule.operator)}</span>
                      {opt?.needsValue && rule.value !== undefined && (
                        <span className="px-1.5 py-0.5 rounded bg-background-100 text-xs font-mono text-foreground-800">
                          {rule.value}
                          {rule.value2 !== undefined ? ` – ${rule.value2}` : ''}
                        </span>
                      )}
                      <span
                        className="ml-auto w-5 h-5 rounded-md border border-background-200/70 flex-shrink-0"
                        style={{ background: rule.bg || '#ffffff' }}
                        title="Couleur de fond"
                      />
                      {rule.color && (
                        <span
                          className="w-5 h-5 rounded-md border border-background-200/70 flex-shrink-0"
                          style={{ background: rule.color }}
                          title="Couleur du texte"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={rule.operator}
                        onChange={(e) =>
                          onUpdate(rule.id, { operator: e.target.value as CondFormatOperator })
                        }
                        className={`${fieldCls()} flex-1 min-w-[160px]`}
                      >
                        {COND_OPERATORS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {opt?.needsValue && (
                        <>
                          <input
                            value={rule.value ?? ''}
                            onChange={(e) => onUpdate(rule.id, { value: e.target.value })}
                            placeholder="Valeur"
                            className={`${fieldCls()} w-24`}
                          />
                          {opt.needsValue2 && (
                            <input
                              value={rule.value2 ?? ''}
                              onChange={(e) => onUpdate(rule.id, { value2: e.target.value })}
                              placeholder="Valeur 2"
                              className={`${fieldCls()} w-24`}
                            />
                          )}
                        </>
                      )}
                      <label
                        title="Couleur de fond"
                        className="relative w-8 h-8 rounded-md border border-background-200/70 cursor-pointer overflow-hidden flex-shrink-0"
                      >
                        <span
                          className="absolute inset-0"
                          style={{ background: rule.bg || '#ffffff' }}
                        />
                        <input
                          type="color"
                          value={rule.bg || '#ffffff'}
                          onChange={(e) => onUpdate(rule.id, { bg: e.target.value })}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>
                      <label
                        title="Couleur du texte"
                        className="relative w-8 h-8 rounded-md border border-background-200/70 cursor-pointer overflow-hidden flex-shrink-0"
                      >
                        <span
                          className="absolute inset-0 flex items-center justify-center text-[11px] font-bold"
                          style={{
                            color: rule.color || '#334155',
                            background: '#ffffff',
                          }}
                        >
                          A
                        </span>
                        <input
                          type="color"
                          value={rule.color || '#334155'}
                          onChange={(e) => onUpdate(rule.id, { color: e.target.value })}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>
                      <button
                        type="button"
                        title="Supprimer la règle"
                        onClick={() => onRemove(rule.id)}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-foreground-400 hover:text-foreground-700 hover:bg-background-100 cursor-pointer flex-shrink-0"
                      >
                        <i className="ri-delete-bin-line text-base"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {rules.length === 0 && (
            <p className="text-xs text-foreground-500 text-center py-2">
              Aucune règle. Ajoutez-en une pour colorer automatiquement les cellules selon leur
              valeur.
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-background-200/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-md bg-background-100 text-foreground-800 text-xs font-medium hover:bg-background-200 cursor-pointer whitespace-nowrap"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}