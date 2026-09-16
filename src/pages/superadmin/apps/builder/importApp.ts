import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';
import { clearAppContent } from './blueprint';

// ── Import d'une app depuis un fichier ZIP (export) ─────────
// Lit le ZIP, valide le manifest, puis reconstruit l'app dans le Backend.
// Deux modes : restaurer (écraser une app existante) ou dupliquer
// (créer une nouvelle app).

export interface ParsedBlock {
  type: string;
  content: Record<string, unknown>;
  position?: number;
}

export interface ParsedPage {
  title: string;
  slug: string;
  icon?: string;
  visibility?: string;
  position?: number;
  blocks: ParsedBlock[];
}

export interface ParsedField {
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  position?: number;
}

export interface ParsedForm {
  id?: number;
  name: string;
  title?: string;
  description?: string;
  position?: number;
  fields: ParsedField[];
}

export interface ParsedTableField {
  label: string;
  type: string;
  position?: number;
}

export interface ParsedTable {
  id?: number;
  name: string;
  slug: string;
  position?: number;
  fields: ParsedTableField[];
  rows: Record<string, unknown>[];
}

export interface ParsedSetting {
  key: string;
  label: string;
  type: string;
  value?: string;
  options?: string[];
  position?: number;
}

export interface ParsedManifest {
  name: string;
  nompage: string;
  description?: string;
  image?: string;
  typeapp?: string;
  prix?: string;
  free?: boolean;
  active?: boolean;
  summary?: Record<string, number>;
}

export interface ParsedApp {
  manifest: ParsedManifest;
  pages: ParsedPage[];
  forms: ParsedForm[];
  tables: ParsedTable[];
  settings: ParsedSetting[];
}

export interface ImportResult {
  pages: number;
  blocks: number;
  forms: number;
  formFields: number;
  tables: number;
  tableFields: number;
  tableRows: number;
  settings: number;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'app';

// ── Lecture + validation du ZIP ─────────────────────────────

export async function parseAppZip(file: File): Promise<ParsedApp> {
  const zip = await JSZip.loadAsync(file);

  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error("Fichier manifest.json introuvable — ce n'est pas un export d'app valide.");
  }
  const manifest = JSON.parse(await manifestFile.async('string')) as ParsedManifest;
  if (manifest.format !== 'zifek-app-export') {
    throw new Error("Format d'export non reconnu.");
  }

  const readJson = async (path: string): Promise<unknown> => {
    const f = zip.file(path);
    return f ? JSON.parse(await f.async('string')) : null;
  };

  const listFolder = (prefix: string) =>
    Object.keys(zip.files).filter((p) => p.startsWith(`${prefix}/`) && p.endsWith('.json')).sort();

  const pages: ParsedPage[] = [];
  for (const p of listFolder('pages')) {
    const data = await readJson(p);
    if (data) pages.push(data as ParsedPage);
  }

  const forms: ParsedForm[] = [];
  for (const p of listFolder('forms')) {
    const data = await readJson(p);
    if (data) forms.push(data as ParsedForm);
  }

  const tables: ParsedTable[] = [];
  for (const p of listFolder('tables')) {
    const data = await readJson(p);
    if (data) tables.push(data as ParsedTable);
  }

  const settingsData = await readJson('settings.json');
  const settings = Array.isArray(settingsData) ? (settingsData as ParsedSetting[]) : [];

  return { manifest, pages, forms, tables, settings };
}

// ── Écriture du contenu dans le Backend ─────────────────────

export async function buildAppFromParsed(appId: number, parsed: ParsedApp): Promise<ImportResult> {
  const result: ImportResult = {
    pages: 0,
    blocks: 0,
    forms: 0,
    formFields: 0,
    tables: 0,
    tableFields: 0,
    tableRows: 0,
    settings: 0,
  };

  // 1. Formulaires + champs (map ancien id → nouveau id)
  const formIdMap = new Map<number, number>();
  for (const [i, form] of parsed.forms.entries()) {
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
    if (form.id != null) formIdMap.set(form.id, data.id);
    result.forms += 1;

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
      result.formFields += 1;
    }
  }

  // 2. Tables + champs + lignes (map ancien id → nouveau id)
  const tableIdMap = new Map<number, number>();
  for (const [i, table] of parsed.tables.entries()) {
    const { data, error } = await supabase
      .from('app_tables')
      .insert({ app_id: appId, name: table.name, slug: table.slug, position: table.position ?? i })
      .select('id')
      .single();
    if (error) throw error;
    if (table.id != null) tableIdMap.set(table.id, data.id);
    result.tables += 1;

    const labelToFieldId = new Map<string, number>();
    for (const [fi, field] of (table.fields || []).entries()) {
      const { data: fd, error: fErr } = await supabase
        .from('app_table_fields')
        .insert({ table_id: data.id, label: field.label, type: field.type, position: field.position ?? fi })
        .select('id')
        .single();
      if (fErr) throw fErr;
      labelToFieldId.set(field.label, fd.id);
      result.tableFields += 1;
    }

    for (const row of table.rows || []) {
      const rowData: Record<string, unknown> = {};
      for (const [label, value] of Object.entries(row)) {
        const fid = labelToFieldId.get(label);
        if (fid !== undefined) rowData[String(fid)] = value;
      }
      const { error: rErr } = await supabase.from('app_table_rows').insert({ table_id: data.id, data: rowData });
      if (rErr) throw rErr;
      result.tableRows += 1;
    }
  }

  // 3. Réglages
  for (const [i, s] of parsed.settings.entries()) {
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
    result.settings += 1;
  }

  // 4. Pages + blocs (résolution des références formId / tableId)
  for (const [i, page] of parsed.pages.entries()) {
    const { data, error } = await supabase
      .from('app_pages')
      .insert({
        app_id: appId,
        title: page.title,
        slug: page.slug,
        icon: page.icon || 'ri-file-text-line',
        position: page.position ?? i,
        visibility: page.visibility || 'visible',
      })
      .select('id')
      .single();
    if (error) throw error;
    result.pages += 1;

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
      result.blocks += 1;
    }
  }

  return result;
}

// ── Restaurer (écraser le contenu d'une app existante) ──────

export async function restoreAppFromZip(appId: number, file: File): Promise<ImportResult> {
  const parsed = await parseAppZip(file);
  await clearAppContent(appId);
  return buildAppFromParsed(appId, parsed);
}

// ── Dupliquer (créer une nouvelle app à partir du ZIP) ──────

export async function duplicateAppFromZip(file: File): Promise<{ id: number; nompage: string }> {
  const parsed = await parseAppZip(file);

  let nompage = parsed.manifest.nompage || slugify(parsed.manifest.name);
  const { data: existing } = await supabase.from('appstore').select('nompage').eq('nompage', nompage);
  if (existing && existing.length > 0) {
    nompage = `${nompage}-${Date.now().toString(36)}`;
  }

  const { data, error } = await supabase
    .from('appstore')
    .insert({
      nom: parsed.manifest.name,
      nompage,
      description: parsed.manifest.description || '',
      image: parsed.manifest.image || '',
      typeapp: parsed.manifest.typeapp || 'seo',
      prix: parsed.manifest.prix || '0',
      free: parsed.manifest.free ? 1 : 0,
      active: parsed.manifest.active ? 1 : 0,
    })
    .select('id')
    .single();
  if (error) throw error;

  await buildAppFromParsed(data.id, parsed);
  return { id: data.id, nompage };
}