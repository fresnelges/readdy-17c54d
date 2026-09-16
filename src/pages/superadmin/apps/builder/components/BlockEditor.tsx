import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BLOCK_TYPES, getBlockLabel, type AppBlock } from '../constants';

interface BlockEditorProps {
  pageId: number;
  appId: number;
}

export default function BlockEditor({ pageId, appId }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<AppBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Options for form/table blocks
  const [forms, setForms] = useState<{ id: number; name: string }[]>([]);
  const [tables, setTables] = useState<{ id: number; name: string }[]>([]);

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('app_blocks')
        .select('*')
        .eq('page_id', pageId)
        .order('position', { ascending: true });
      if (fetchError) throw fetchError;
      setBlocks((data as AppBlock[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    fetchBlocks();
    // Load form/table options
    supabase.from('app_forms').select('id, name').eq('app_id', appId).then(({ data }) => setForms(data || []));
    supabase.from('app_tables').select('id, name').eq('app_id', appId).then(({ data }) => setTables(data || []));
  }, [fetchBlocks, appId]);

  const addBlock = async (type: string) => {
    const position = blocks.length;
    const content = defaultContent(type);
    setSaving(true);
    try {
      const { data, error: insErr } = await supabase
        .from('app_blocks')
        .insert({ page_id: pageId, type, content, position })
        .select('*')
        .single();
      if (insErr) throw insErr;
      setBlocks((prev) => [...prev, data as AppBlock]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l ajout');
    } finally {
      setSaving(false);
    }
  };

  const updateBlock = async (block: AppBlock, patch: Partial<AppBlock>) => {
    const next = { ...block, ...patch };
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? next : b)));
    const { error: updErr } = await supabase
      .from('app_blocks')
      .update({ type: next.type, content: next.content })
      .eq('id', block.id);
    if (updErr) setError(updErr.message);
  };

  const deleteBlock = async (block: AppBlock) => {
    if (!window.confirm('Supprimer ce bloc ?')) return;
    const { error: delErr } = await supabase.from('app_blocks').delete().eq('id', block.id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== block.id));
  };

  const moveBlock = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const arr = [...blocks];
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setBlocks(arr);
    // Persist new positions
    await Promise.all(
      arr.map((b, i) =>
        supabase.from('app_blocks').update({ position: i }).eq('id', b.id)
      )
    );
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

      {/* Palette */}
      <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
        <p className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-3">Ajouter un bloc</p>
        <div className="flex flex-wrap gap-2">
          {BLOCK_TYPES.map((bt) => (
            <button
              key={bt.type}
              onClick={() => addBlock(bt.type)}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-2 rounded-full border border-background-200/70 bg-background-50 text-sm text-foreground-700 hover:border-primary-300 hover:bg-primary-50/50 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <i className={`${bt.icon} text-foreground-500`}></i>
              {bt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Blocks */}
      {blocks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-background-200/70 rounded-lg">
          <i className="ri-layout-line text-3xl text-foreground-300 block mb-2"></i>
          <p className="text-sm text-foreground-500">Aucun bloc sur cette page</p>
          <p className="text-xs text-foreground-400 mt-1">Ajoutez votre premier bloc ci-dessus</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              index={index}
              total={blocks.length}
              forms={forms}
              tables={tables}
              onChange={(patch) => updateBlock(block, patch)}
              onDelete={() => deleteBlock(block)}
              onMove={(dir) => moveBlock(index, dir)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function defaultContent(type: string): Record<string, unknown> {
  switch (type) {
    case 'heading': return { text: 'Nouveau titre' };
    case 'text': return { text: '' };
    case 'image': return { url: '', caption: '' };
    case 'list': return { title: '', items: [] };
    case 'form': return { formId: null };
    case 'table': return { tableId: null };
    case 'spacer': return { height: 32 };
    default: return {};
  }
}

// ── Bloc éditable ────────────────────────────────────────────

interface BlockCardProps {
  block: AppBlock;
  index: number;
  total: number;
  forms: { id: number; name: string }[];
  tables: { id: number; name: string }[];
  onChange: (patch: Partial<AppBlock>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}

function BlockCard({ block, index, total, forms, tables, onChange, onDelete, onMove }: BlockCardProps) {
  const content = block.content || {};

  const setContent = (key: string, value: unknown) => {
    onChange({ content: { ...content, [key]: value } });
  };

  return (
    <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-background-100/60 border-b border-background-200/70">
        <i className="ri-draggable text-foreground-300"></i>
        <span className="text-xs font-semibold text-foreground-600 uppercase tracking-wide">{getBlockLabel(block.type)}</span>
        <span className="text-[11px] text-foreground-400">{index + 1}/{total}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:bg-background-100 cursor-pointer disabled:opacity-30">
            <i className="ri-arrow-up-s-line"></i>
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:bg-background-100 cursor-pointer disabled:opacity-30">
            <i className="ri-arrow-down-s-line"></i>
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer">
            <i className="ri-delete-bin-line"></i>
          </button>
        </div>
      </div>

      {/* Content editor */}
      <div className="p-4 space-y-3">
        {block.type === 'heading' && (
          <input
            type="text"
            value={(content.text as string) || ''}
            onChange={(e) => setContent('text', e.target.value)}
            placeholder="Titre de la section"
            className="w-full px-3 py-2 border border-background-200/70 rounded-md text-lg font-bold font-heading text-foreground-900 focus:outline-none focus:border-primary-300"
          />
        )}

        {block.type === 'text' && (
          <textarea
            value={(content.text as string) || ''}
            onChange={(e) => setContent('text', e.target.value)}
            rows={4}
            placeholder="Votre texte..."
            className="w-full px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300 resize-y"
          />
        )}

        {block.type === 'image' && (
          <div className="space-y-2">
            <input
              type="text"
              value={(content.url as string) || ''}
              onChange={(e) => setContent('url', e.target.value)}
              placeholder="URL de l image (https://...)"
              className="w-full px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
            />
            <input
              type="text"
              value={(content.caption as string) || ''}
              onChange={(e) => setContent('caption', e.target.value)}
              placeholder="Légende (optionnel)"
              className="w-full px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
            />
            {(content.url as string) && (
              <img src={content.url as string} alt="" className="w-full h-40 object-cover object-top rounded-md border border-background-200/70" />
            )}
          </div>
        )}

        {block.type === 'list' && (
          <ListEditor
            title={(content.title as string) || ''}
            items={(content.items as string[]) || []}
            onTitle={(v) => setContent('title', v)}
            onItems={(v) => setContent('items', v)}
          />
        )}

        {block.type === 'form' && (
          <select
            value={String((content.formId as number) ?? '')}
            onChange={(e) => setContent('formId', e.target.value ? parseInt(e.target.value, 10) : null)}
            className="w-full px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
          >
            <option value="">— Choisir un formulaire —</option>
            {forms.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}

        {block.type === 'table' && (
          <select
            value={String((content.tableId as number) ?? '')}
            onChange={(e) => setContent('tableId', e.target.value ? parseInt(e.target.value, 10) : null)}
            className="w-full px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
          >
            <option value="">— Choisir un tableau —</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}

        {block.type === 'spacer' && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground-600">Hauteur</span>
            <input
              type="number"
              min="8"
              max="200"
              value={(content.height as number) ?? 32}
              onChange={(e) => setContent('height', parseInt(e.target.value, 10) || 0)}
              className="w-24 px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
            />
            <span className="text-sm text-foreground-400">px</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Éditeur de liste ─────────────────────────────────────────

function ListEditor({ title, items, onTitle, onItems }: {
  title: string;
  items: string[];
  onTitle: (v: string) => void;
  onItems: (v: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="Titre de la liste (optionnel)"
        className="w-full px-3 py-2 border border-background-200/70 rounded-md text-sm font-medium text-foreground-900 focus:outline-none focus:border-primary-300"
      />
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <i className="ri-subtract-line text-foreground-300"></i>
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onItems(next);
            }}
            placeholder={`Élément ${i + 1}`}
            className="flex-1 px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
          />
          <button
            onClick={() => onItems(items.filter((_, idx) => idx !== i))}
            className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:text-red-500 cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
      ))}
      <button
        onClick={() => onItems([...items, ''])}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-primary-600 hover:bg-primary-50 cursor-pointer"
      >
        <i className="ri-add-line"></i>
        Ajouter un élément
      </button>
    </div>
  );
}