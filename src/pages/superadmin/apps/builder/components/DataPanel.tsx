import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TABLE_FIELD_TYPES, type AppTable, type AppTableField, type AppTableRow } from '../constants';

interface DataPanelProps {
  appId: number;
}

export default function DataPanel({ appId }: DataPanelProps) {
  const [tables, setTables] = useState<AppTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('app_tables')
        .select('*')
        .eq('app_id', appId)
        .order('position', { ascending: true });
      if (fetchError) throw fetchError;
      setTables((data as AppTable[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'table';

  const createTable = async () => {
    if (!newName.trim()) return;
    const { data, error: insErr } = await supabase
      .from('app_tables')
      .insert({ app_id: appId, name: newName.trim(), slug: slugify(newName), position: tables.length })
      .select('*')
      .single();
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setTables((prev) => [...prev, data as AppTable]);
    setSelectedId(data.id);
    setCreating(false);
    setNewName('');
  };

  const deleteTable = async (table: AppTable) => {
    if (!window.confirm(`Supprimer le tableau "${table.name}" et toutes ses données ?`)) return;
    const { error: delErr } = await supabase.from('app_tables').delete().eq('id', table.id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setTables((prev) => prev.filter((t) => t.id !== table.id));
    if (selectedId === table.id) setSelectedId(null);
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
            placeholder="Nom du tableau"
            autoFocus
            className="flex-1 px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
          />
          <button onClick={createTable} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap">Créer</button>
          <button onClick={() => { setCreating(false); setNewName(''); }} className="px-3 py-2 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap">Annuler</button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-foreground-950 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-foreground-800 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line"></i>
          Nouveau tableau de données
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Tables list */}
        <div className="space-y-2">
          {tables.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-background-200/70 rounded-lg">
              <i className="ri-database-2-line text-3xl text-foreground-300 block mb-2"></i>
              <p className="text-sm text-foreground-500">Aucun tableau de données</p>
            </div>
          ) : (
            tables.map((table) => (
              <div
                key={table.id}
                onClick={() => setSelectedId(table.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedId === table.id
                    ? 'border-primary-300 bg-primary-50/50'
                    : 'border-background-200/70 bg-background-50 hover:border-background-300/60'
                }`}
              >
                <div className="w-9 h-9 rounded-md bg-background-100 flex items-center justify-center text-foreground-500 flex-shrink-0">
                  <i className="ri-table-line"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground-900 truncate">{table.name}</p>
                  <p className="text-[11px] text-foreground-400 truncate">/{table.slug}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTable(table); }}
                  className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer flex-shrink-0"
                >
                  <i className="ri-delete-bin-line text-sm"></i>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Table detail (fields + rows) */}
        <div className="lg:col-span-2">
          {selectedId ? (
            <TableDetail tableId={selectedId} />
          ) : (
            <div className="text-center py-16 border-2 border-dashed border-background-200/70 rounded-lg">
              <i className="ri-cursor-line text-3xl text-foreground-300 block mb-2"></i>
              <p className="text-sm text-foreground-500">Sélectionnez un tableau pour gérer ses champs et données</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Détail d'un tableau : champs + lignes ────────────────────

function TableDetail({ tableId }: { tableId: number }) {
  const [fields, setFields] = useState<AppTableField[]>([]);
  const [rows, setRows] = useState<AppTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFields, setShowFields] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fieldsRes, rowsRes] = await Promise.all([
        supabase.from('app_table_fields').select('*').eq('table_id', tableId).order('position', { ascending: true }),
        supabase.from('app_table_rows').select('*').eq('table_id', tableId).order('created_at', { ascending: true }),
      ]);
      if (fieldsRes.error) throw fieldsRes.error;
      if (rowsRes.error) throw rowsRes.error;
      setFields((fieldsRes.data as AppTableField[]) || []);
      setRows((rowsRes.data as AppTableRow[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addField = async (type: string) => {
    const { data, error: insErr } = await supabase
      .from('app_table_fields')
      .insert({ table_id: tableId, label: 'Nouveau champ', type, position: fields.length })
      .select('*')
      .single();
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setFields((prev) => [...prev, data as AppTableField]);
  };

  const updateField = async (field: AppTableField, patch: Partial<AppTableField>) => {
    const next = { ...field, ...patch };
    setFields((prev) => prev.map((f) => (f.id === field.id ? next : f)));
    await supabase.from('app_table_fields').update(patch).eq('id', field.id);
  };

  const deleteField = async (field: AppTableField) => {
    if (!window.confirm(`Supprimer le champ "${field.label}" ?`)) return;
    const { error: delErr } = await supabase.from('app_table_fields').delete().eq('id', field.id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setFields((prev) => prev.filter((f) => f.id !== field.id));
  };

  const addRow = async () => {
    const empty: Record<string, unknown> = {};
    fields.forEach((f) => { empty[String(f.id)] = ''; });
    const { data, error: insErr } = await supabase
      .from('app_table_rows')
      .insert({ table_id: tableId, data: empty })
      .select('*')
      .single();
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setRows((prev) => [...prev, data as AppTableRow]);
  };

  const updateRow = async (row: AppTableRow, data: Record<string, unknown>) => {
    const next = { ...row, data };
    setRows((prev) => prev.map((r) => (r.id === row.id ? next : r)));
    await supabase.from('app_table_rows').update({ data }).eq('id', row.id);
  };

  const deleteRow = async (row: AppTableRow) => {
    const { error: delErr } = await supabase.from('app_table_rows').delete().eq('id', row.id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
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

      {/* Fields toggle */}
      <div className="flex items-center justify-between bg-background-50 border border-background-200/70 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <i className="ri-layout-column-line text-foreground-500"></i>
          <span className="text-sm font-medium text-foreground-800">Champs ({fields.length})</span>
        </div>
        <button
          onClick={() => setShowFields((v) => !v)}
          className="px-3 py-1.5 rounded-full text-xs font-medium text-foreground-600 bg-background-100 hover:bg-background-200/70 cursor-pointer whitespace-nowrap"
        >
          {showFields ? 'Masquer' : 'Gérer les champs'}
        </button>
      </div>

      {/* Fields editor */}
      {showFields && (
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {TABLE_FIELD_TYPES.map((ft) => (
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
          <div className="space-y-2">
            {fields.map((field) => (
              <div key={field.id} className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary-50 text-secondary-700 whitespace-nowrap">{field.type}</span>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(field, { label: e.target.value })}
                  className="flex-1 px-2 py-1 border border-background-200/70 rounded text-sm text-foreground-900 focus:outline-none focus:border-primary-300 min-w-0"
                />
                <button onClick={() => deleteField(field)} className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"><i className="ri-delete-bin-line"></i></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rows */}
      <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-background-200/70">
          <span className="text-sm font-medium text-foreground-800">Données ({rows.length})</span>
          <button
            onClick={addRow}
            disabled={fields.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary-500 text-background-50 cursor-pointer hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <i className="ri-add-line"></i>
            Ajouter une ligne
          </button>
        </div>

        {fields.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-foreground-500">Ajoutez d'abord des champs pour saisir des données</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-foreground-400">Aucune donnée pour l'instant</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background-100 text-left text-xs text-foreground-500 uppercase tracking-wider">
                  {fields.map((f) => (
                    <th key={f.id} className="px-4 py-2 font-semibold whitespace-nowrap">{f.label}</th>
                  ))}
                  <th className="px-4 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-200/70">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-background-50/50">
                    {fields.map((f) => (
                      <td key={f.id} className="px-4 py-2">
                        <input
                          type="text"
                          value={String(row.data?.[String(f.id)] ?? '')}
                          onChange={(e) => updateRow(row, { ...(row.data || {}), [String(f.id)]: e.target.value })}
                          className="w-full min-w-[100px] px-2 py-1 border border-background-200/70 rounded text-sm text-foreground-900 focus:outline-none focus:border-primary-300 bg-transparent"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => deleteRow(row)} className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer ml-auto">
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}