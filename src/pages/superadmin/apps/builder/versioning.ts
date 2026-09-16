import { supabase } from '@/lib/supabase';
import { clearAppContent } from './blueprint';

// ── Système de versioning des apps ──────────────────────────
// Chaque app a un « brouillon » (les tables live app_pages / app_blocks /
// app_forms / app_tables / app_settings) sur lequel on travaille dans le
// builder, et une série de « versions » publiées (snapshots JSON).
//
//   brouillon ──publier──▶ version N (published)
//                              ▲
//              ┌───────────────┴───────────────┐
//        « revenir » (re-publier)       « restaurer » (recharger dans le brouillon)
//
// Le public (DynamicAppPage) rend la version publiée (snapshot), pas le
// brouillon, pour que l'on puisse continuer à améliorer sans rien casser.

export interface AppVersionRow {
  id: number;
  app_id: number;
  version_number: number;
  label: string | null;
  note: string | null;
  status: string;
  created_at: string;
  published_at: string | null;
}

export interface SnapshotBlock {
  type: string;
  content: Record<string, unknown>;
  position: number;
}

export interface SnapshotPage {
  title: string;
  slug: string;
  icon: string;
  position: number;
  visibility: string;
  native: boolean;
  blocks: SnapshotBlock[];
}

export interface SnapshotField {
  label: string;
  type: string;
  required: boolean;
  options: string[];
  position: number;
}

export interface SnapshotForm {
  id: number;
  name: string;
  title: string;
  description: string;
  position: number;
  fields: SnapshotField[];
}

export interface SnapshotTableField {
  label: string;
  type: string;
  position: number;
}

export interface SnapshotTable {
  id: number;
  name: string;
  slug: string;
  position: number;
  fields: SnapshotTableField[];
  rows: Record<string, unknown>[];
}

export interface SnapshotSetting {
  key: string;
  label: string;
  type: string;
  value: string;
  options: string[];
  position: number;
}

export interface AppSnapshot {
  schema_version: number;
  pages: SnapshotPage[];
  forms: SnapshotForm[];
  tables: SnapshotTable[];
  settings: SnapshotSetting[];
}

// ── Capture du brouillon courant en un snapshot JSON ────────

export async function captureSnapshot(appId: number): Promise<AppSnapshot> {
  const { data: pages } = await supabase
    .from('app_pages')
    .select('*')
    .eq('app_id', appId)
    .order('position', { ascending: true });
  const pageList = (pages as Record<string, any>[]) || [];
  const pageIds = pageList.map((p) => p.id as number);

  const { data: blocks } = pageIds.length
    ? await supabase.from('app_blocks').select('*').in('page_id', pageIds).order('position', { ascending: true })
    : { data: [] };
  const blockList = (blocks as Record<string, any>[]) || [];

  const { data: forms } = await supabase
    .from('app_forms')
    .select('*')
    .eq('app_id', appId)
    .order('position', { ascending: true });
  const formList = (forms as Record<string, any>[]) || [];
  const formIds = formList.map((f) => f.id as number);

  const { data: formFields } = formIds.length
    ? await supabase.from('app_form_fields').select('*').in('form_id', formIds).order('position', { ascending: true })
    : { data: [] };
  const formFieldList = (formFields as Record<string, any>[]) || [];

  const { data: tables } = await supabase
    .from('app_tables')
    .select('*')
    .eq('app_id', appId)
    .order('position', { ascending: true });
  const tableList = (tables as Record<string, any>[]) || [];
  const tableIds = tableList.map((t) => t.id as number);

  const { data: tableFields } = tableIds.length
    ? await supabase.from('app_table_fields').select('*').in('table_id', tableIds).order('position', { ascending: true })
    : { data: [] };
  const tableFieldList = (tableFields as Record<string, any>[]) || [];

  const { data: tableRows } = tableIds.length
    ? await supabase.from('app_table_rows').select('*').in('table_id', tableIds).order('created_at', { ascending: true })
    : { data: [] };
  const tableRowList = (tableRows as Record<string, any>[]) || [];

  const { data: settings } = await supabase
    .from('app_settings')
    .select('*')
    .eq('app_id', appId)
    .order('position', { ascending: true });
  const settingList = (settings as Record<string, any>[]) || [];

  const snapshotPages: SnapshotPage[] = pageList.map((page) => ({
    title: page.title,
    slug: page.slug,
    icon: page.icon || 'ri-file-text-line',
    position: page.position ?? 0,
    visibility: page.visibility || 'visible',
    native: !!page.native,
    blocks: blockList
      .filter((b) => b.page_id === page.id)
      .map((b) => ({
        type: b.type,
        content: (b.content as Record<string, unknown>) || {},
        position: b.position ?? 0,
      })),
  }));

  const snapshotForms: SnapshotForm[] = formList.map((form) => ({
    id: form.id as number,
    name: form.name,
    title: form.title || form.name,
    description: form.description || '',
    position: form.position ?? 0,
    fields: formFieldList
      .filter((f) => f.form_id === form.id)
      .map((f) => ({
        label: f.label,
        type: f.type || 'text',
        required: !!f.required,
        options: (f.options as string[]) || [],
        position: f.position ?? 0,
      })),
  }));

  const snapshotTables: SnapshotTable[] = tableList.map((table) => {
    const tableFields = tableFieldList.filter((f) => f.table_id === table.id);
    const labelById = new Map<number, string>();
    tableFields.forEach((f) => labelById.set(f.id as number, f.label as string));

    const fields: SnapshotTableField[] = tableFields.map((f) => ({
      label: f.label,
      type: f.type || 'text',
      position: f.position ?? 0,
    }));

    // Résout les clés numériques (id de champ) vers les libellés.
    const rows = tableRowList
      .filter((r) => r.table_id === table.id)
      .map((r) => {
        const data = (r.data as Record<string, unknown>) || {};
        const resolved: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
          resolved[labelById.get(Number(key)) || key] = value;
        });
        return resolved;
      });

    return {
      id: table.id as number,
      name: table.name,
      slug: table.slug,
      position: table.position ?? 0,
      fields,
      rows,
    };
  });

  const snapshotSettings: SnapshotSetting[] = settingList.map((s) => ({
    key: s.key,
    label: s.label,
    type: s.type || 'text',
    value: s.value ?? '',
    options: (s.options as string[]) || [],
    position: s.position ?? 0,
  }));

  return {
    schema_version: 1,
    pages: snapshotPages,
    forms: snapshotForms,
    tables: snapshotTables,
    settings: snapshotSettings,
  };
}

// ── Publier le brouillon courant comme nouvelle version ─────

export async function publishVersion(appId: number, note: string): Promise<AppVersionRow> {
  const snapshot = await captureSnapshot(appId);

  const { data: lastVersions } = await supabase
    .from('app_versions')
    .select('version_number')
    .eq('app_id', appId)
    .order('version_number', { ascending: false })
    .limit(1);
  const nextNumber = ((lastVersions?.[0]?.version_number as number) || 0) + 1;

  const label = `v${nextNumber}`;

  // Archive la version actuellement publiée.
  await supabase
    .from('app_versions')
    .update({ status: 'archived' })
    .eq('app_id', appId)
    .eq('status', 'published');

  const { data, error } = await supabase
    .from('app_versions')
    .insert({
      app_id: appId,
      version_number: nextNumber,
      label,
      note: note || null,
      status: 'published',
      snapshot,
      published_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabase
    .from('appstore')
    .update({ published_version_id: (data as AppVersionRow).id })
    .eq('id', appId);

  return data as AppVersionRow;
}

// ── Lister les versions d'une app ───────────────────────────

export async function listVersions(appId: number): Promise<AppVersionRow[]> {
  const { data, error } = await supabase
    .from('app_versions')
    .select('id, app_id, version_number, label, note, status, created_at, published_at')
    .eq('app_id', appId)
    .order('version_number', { ascending: false });
  if (error) throw error;
  return (data as AppVersionRow[]) || [];
}

// ── Re-publier une version précédente (rollback) ────────────

export async function rollbackToVersion(appId: number, versionId: number): Promise<void> {
  await supabase
    .from('app_versions')
    .update({ status: 'archived' })
    .eq('app_id', appId)
    .eq('status', 'published');

  const { error } = await supabase
    .from('app_versions')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', versionId);
  if (error) throw error;

  await supabase
    .from('appstore')
    .update({ published_version_id: versionId })
    .eq('id', appId);
}

// ── Restaurer une version dans le brouillon (pour la reprendre) ──

export async function restoreVersionToDraft(appId: number, versionId: number): Promise<void> {
  const { data } = await supabase
    .from('app_versions')
    .select('snapshot')
    .eq('id', versionId)
    .maybeSingle();
  if (!data?.snapshot) throw new Error('Version introuvable.');
  await restoreSnapshotToDraft(appId, data.snapshot as AppSnapshot);
}

export async function restoreSnapshotToDraft(appId: number, snapshot: AppSnapshot): Promise<void> {
  await clearAppContent(appId);

  // 1. Formulaires + champs (map ancien id → nouveau id)
  const formIdMap = new Map<number, number>();
  for (const [i, form] of (snapshot.forms || []).entries()) {
    const { data, error } = await supabase
      .from('app_forms')
      .insert({
        app_id: appId,
        name: form.name,
        title: form.title || form.name,
        description: form.description || null,
        position: form.position ?? i,
      })
      .select('id')
      .single();
    if (error) throw error;
    if (form.id != null) formIdMap.set(form.id, data.id as number);

    for (const [fi, field] of (form.fields || []).entries()) {
      const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);
      const { error: fErr } = await supabase.from('app_form_fields').insert({
        form_id: data.id,
        label: field.label,
        type: field.type,
        required: !!field.required,
        options: hasOptions ? field.options || [] : [],
        position: field.position ?? fi,
      });
      if (fErr) throw fErr;
    }
  }

  // 2. Tables + champs + lignes (map ancien id → nouveau id)
  const tableIdMap = new Map<number, number>();
  for (const [i, table] of (snapshot.tables || []).entries()) {
    const { data, error } = await supabase
      .from('app_tables')
      .insert({ app_id: appId, name: table.name, slug: table.slug, position: table.position ?? i })
      .select('id')
      .single();
    if (error) throw error;
    if (table.id != null) tableIdMap.set(table.id, data.id as number);

    const labelToFieldId = new Map<string, number>();
    for (const [fi, field] of (table.fields || []).entries()) {
      const { data: fd, error: fErr } = await supabase
        .from('app_table_fields')
        .insert({ table_id: data.id, label: field.label, type: field.type, position: field.position ?? fi })
        .select('id')
        .single();
      if (fErr) throw fErr;
      labelToFieldId.set(field.label, fd.id as number);
    }

    for (const row of table.rows || []) {
      const rowData: Record<string, unknown> = {};
      for (const [label, value] of Object.entries(row)) {
        const fid = labelToFieldId.get(label);
        if (fid !== undefined) rowData[String(fid)] = value;
      }
      const { error: rErr } = await supabase.from('app_table_rows').insert({ table_id: data.id, data: rowData });
      if (rErr) throw rErr;
    }
  }

  // 3. Réglages
  for (const [i, s] of (snapshot.settings || []).entries()) {
    const { error } = await supabase.from('app_settings').insert({
      app_id: appId,
      key: s.key,
      label: s.label,
      type: s.type,
      value: s.value ?? (s.type === 'toggle' ? '0' : ''),
      options: s.type === 'select' ? s.options || [] : [],
      position: s.position ?? i,
    });
    if (error) throw error;
  }

  // 4. Pages + blocs (résolution formId / tableId)
  for (const [i, page] of (snapshot.pages || []).entries()) {
    const { data, error } = await supabase
      .from('app_pages')
      .insert({
        app_id: appId,
        title: page.title,
        slug: page.slug,
        icon: page.icon || 'ri-file-text-line',
        position: page.position ?? i,
        visibility: page.visibility || 'visible',
        native: page.native,
      })
      .select('id')
      .single();
    if (error) throw error;

    for (const [bi, block] of (page.blocks || []).entries()) {
      let content: Record<string, unknown> = { ...(block.content || {}) };
      if (block.type === 'form' && typeof content.formId === 'number') {
        content = { formId: formIdMap.get(content.formId) ?? null };
      } else if (block.type === 'table' && typeof content.tableId === 'number') {
        content = { tableId: tableIdMap.get(content.tableId) ?? null };
      }
      const { error: bErr } = await supabase.from('app_blocks').insert({
        page_id: data.id,
        type: block.type,
        content,
        position: block.position ?? bi,
      });
      if (bErr) throw bErr;
    }
  }
}

// ── Récupérer la version publiée (pour le rendu public) ─────

export async function getPublishedSnapshot(appId: number): Promise<AppSnapshot | null> {
  const { data: app } = await supabase
    .from('appstore')
    .select('published_version_id')
    .eq('id', appId)
    .maybeSingle();
  const versionId = app?.published_version_id as number | null | undefined;
  if (!versionId) return null;

  const { data: version } = await supabase
    .from('app_versions')
    .select('snapshot')
    .eq('id', versionId)
    .maybeSingle();
  return version?.snapshot ? (version.snapshot as AppSnapshot) : null;
}