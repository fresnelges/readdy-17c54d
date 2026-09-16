import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FORM_FIELD_TYPES, getFieldLabel, type AppForm, type AppFormField } from '../constants';

interface FormsPanelProps {
  appId: number;
}

export default function FormsPanel({ appId }: FormsPanelProps) {
  const [forms, setForms] = useState<AppForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchForms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('app_forms')
        .select('*')
        .eq('app_id', appId)
        .order('position', { ascending: true });
      if (fetchError) throw fetchError;
      setForms((data as AppForm[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const createForm = async () => {
    if (!newName.trim()) return;
    const { data, error: insErr } = await supabase
      .from('app_forms')
      .insert({ app_id: appId, name: newName.trim(), title: newName.trim(), position: forms.length })
      .select('*')
      .single();
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setForms((prev) => [...prev, data as AppForm]);
    setSelectedId(data.id);
    setCreating(false);
    setNewName('');
  };

  const deleteForm = async (form: AppForm) => {
    if (!window.confirm(`Supprimer le formulaire "${form.name}" et ses champs ?`)) return;
    const { error: delErr } = await supabase.from('app_forms').delete().eq('id', form.id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setForms((prev) => prev.filter((f) => f.id !== form.id));
    if (selectedId === form.id) setSelectedId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm rounded-lg">
          <i className="ri-error-warning-line"></i>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="cursor-pointer"><i className="ri-close-line"></i></button>
        </div>
      )}

      {creating ? (
        <div className="flex items-center gap-2 bg-background-50 border border-background-200/70 rounded-lg p-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom du formulaire"
            autoFocus
            className="flex-1 px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
          />
          <button onClick={createForm} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap">Créer</button>
          <button onClick={() => { setCreating(false); setNewName(''); }} className="px-3 py-2 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap">Annuler</button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-foreground-950 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-foreground-800 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line"></i>
          Nouveau formulaire
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Forms list */}
        <div className="space-y-2">
          {forms.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-background-200/70 rounded-lg">
              <i className="ri-survey-line text-3xl text-foreground-300 block mb-2"></i>
              <p className="text-sm text-foreground-500">Aucun formulaire</p>
            </div>
          ) : (
            forms.map((form) => (
              <div
                key={form.id}
                onClick={() => setSelectedId(form.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedId === form.id
                    ? 'border-primary-300 bg-primary-50/50'
                    : 'border-background-200/70 bg-background-50 hover:border-background-300/60'
                }`}
              >
                <div className="w-9 h-9 rounded-md bg-background-100 flex items-center justify-center text-foreground-500 flex-shrink-0">
                  <i className="ri-survey-line"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground-900 truncate">{form.name}</p>
                  <p className="text-[11px] text-foreground-400 truncate">{form.title || ''}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteForm(form); }}
                  className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer flex-shrink-0"
                >
                  <i className="ri-delete-bin-line text-sm"></i>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Form field editor */}
        <div className="lg:col-span-2">
          {selectedId ? (
            <FormFieldEditor formId={selectedId} />
          ) : (
            <div className="text-center py-16 border-2 border-dashed border-background-200/70 rounded-lg">
              <i className="ri-cursor-line text-3xl text-foreground-300 block mb-2"></i>
              <p className="text-sm text-foreground-500">Sélectionnez un formulaire pour éditer ses champs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Éditeur de champs de formulaire ──────────────────────────

function FormFieldEditor({ formId }: { formId: number }) {
  const [fields, setFields] = useState<AppFormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('app_form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('position', { ascending: true });
      if (fetchError) throw fetchError;
      setFields((data as AppFormField[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const addField = async (type: string) => {
    const position = fields.length;
    const hasOptions = ['select', 'radio', 'checkbox'].includes(type);
    const { data, error: insErr } = await supabase
      .from('app_form_fields')
      .insert({ form_id: formId, label: getFieldLabel(type), type, required: false, options: hasOptions ? ['', ''] : [], position })
      .select('*')
      .single();
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setFields((prev) => [...prev, data as AppFormField]);
  };

  const updateField = async (field: AppFormField, patch: Partial<AppFormField>) => {
    const next = { ...field, ...patch };
    setFields((prev) => prev.map((f) => (f.id === field.id ? next : f)));
    const { error: updErr } = await supabase
      .from('app_form_fields')
      .update(patch)
      .eq('id', field.id);
    if (updErr) setError(updErr.message);
  };

  const deleteField = async (field: AppFormField) => {
    const { error: delErr } = await supabase.from('app_form_fields').delete().eq('id', field.id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setFields((prev) => prev.filter((f) => f.id !== field.id));
  };

  const moveField = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const arr = [...fields];
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setFields(arr);
    await Promise.all(arr.map((f, i) => supabase.from('app_form_fields').update({ position: i }).eq('id', f.id)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm rounded-lg">
          <i className="ri-error-warning-line"></i>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="cursor-pointer"><i className="ri-close-line"></i></button>
        </div>
      )}

      <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
        <p className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-3">Ajouter un champ</p>
        <div className="flex flex-wrap gap-2">
          {FORM_FIELD_TYPES.map((ft) => (
            <button
              key={ft.type}
              onClick={() => addField(ft.type)}
              className="flex items-center gap-2 px-3 py-2 rounded-full border border-background-200/70 bg-background-50 text-sm text-foreground-700 hover:border-primary-300 hover:bg-primary-50/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className={`${ft.icon} text-foreground-500`}></i>
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-background-200/70 rounded-lg">
          <i className="ri-list-check-2 text-3xl text-foreground-300 block mb-2"></i>
          <p className="text-sm text-foreground-500">Aucun champ dans ce formulaire</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="bg-background-50 border border-background-200/70 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <i className="ri-draggable text-foreground-300"></i>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary-50 text-secondary-700 whitespace-nowrap">
                  {getFieldLabel(field.type)}
                </span>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(field, { label: e.target.value })}
                  className="flex-1 px-2 py-1 border border-background-200/70 rounded text-sm text-foreground-900 focus:outline-none focus:border-primary-300 min-w-0"
                />
                <button
                  onClick={() => updateField(field, { required: !field.required })}
                  className={`px-2 py-1 rounded-full text-[11px] font-medium cursor-pointer whitespace-nowrap ${field.required ? 'bg-accent-100 text-accent-700' : 'bg-background-100 text-foreground-400'}`}
                  title="Obligatoire"
                >
                  Obligatoire
                </button>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => moveField(index, -1)} disabled={index === 0} className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:bg-background-100 cursor-pointer disabled:opacity-30"><i className="ri-arrow-up-s-line"></i></button>
                  <button onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:bg-background-100 cursor-pointer disabled:opacity-30"><i className="ri-arrow-down-s-line"></i></button>
                  <button onClick={() => deleteField(field)} className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"><i className="ri-delete-bin-line"></i></button>
                </div>
              </div>

              {/* Options pour select/radio/checkbox */}
              {['select', 'radio', 'checkbox'].includes(field.type) && (
                <div className="mt-2 pl-8 space-y-1.5">
                  {(field.options || []).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <i className="ri-subtract-line text-foreground-300"></i>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...(field.options || [])];
                          next[oi] = e.target.value;
                          updateField(field, { options: next });
                        }}
                        placeholder={`Option ${oi + 1}`}
                        className="flex-1 px-2 py-1 border border-background-200/70 rounded text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                      />
                      <button
                        onClick={() => updateField(field, { options: (field.options || []).filter((_, i) => i !== oi) })}
                        className="w-6 h-6 rounded flex items-center justify-center text-foreground-400 hover:text-red-500 cursor-pointer"
                      >
                        <i className="ri-close-line text-sm"></i>
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => updateField(field, { options: [...(field.options || []), ''] })}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-primary-600 hover:bg-primary-50 cursor-pointer"
                  >
                    <i className="ri-add-line"></i>
                    Ajouter une option
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}