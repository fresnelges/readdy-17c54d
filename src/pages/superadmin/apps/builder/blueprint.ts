import { supabase } from '@/lib/supabase';

// ── Modèle de "blueprint" : description déclarative d'une app complète ──
// Ce format est produit par l'IA (edge function) OU rédigé à la main
// (génération depuis le chat). buildAppFromBlueprint le transforme en
// lignes dans les tables du builder.

export interface BlueprintBlock {
  type: string; // heading | text | image | list | form | table | spacer
  content: Record<string, unknown>;
}

export interface BlueprintPage {
  title: string;
  slug: string;
  icon?: string;
  visibility?: string;
  blocks: BlueprintBlock[];
}

export interface BlueprintField {
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

export interface BlueprintForm {
  name: string;
  title?: string;
  description?: string;
  fields: BlueprintField[];
}

export interface BlueprintTableField {
  label: string;
  type: string;
}

export interface BlueprintTable {
  name: string;
  slug: string;
  fields: BlueprintTableField[];
  rows?: Record<string, string>[]; // chaque clé = libellé de champ
}

export interface BlueprintSetting {
  key: string;
  label: string;
  type: string; // text | number | toggle | select
  value?: string;
  options?: string[];
}

export interface AppBlueprint {
  name?: string;
  pages: BlueprintPage[];
  forms?: BlueprintForm[];
  tables?: BlueprintTable[];
  settings?: BlueprintSetting[];
}

export interface BuildResult {
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
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';

// ── Suppression du contenu existant d'une app (dans l'ordre des dépendances) ──

async function deleteInWhere(table: string, column: string, values: number[]) {
  if (values.length === 0) return;
  await supabase.from(table).delete().in(column, values);
}

export async function clearAppContent(appId: number): Promise<void> {
  const pageIds = (await supabase.from('app_pages').select('id').eq('app_id', appId)).data?.map((r) => r.id) || [];
  const formIds = (await supabase.from('app_forms').select('id').eq('app_id', appId)).data?.map((r) => r.id) || [];
  const tableIds = (await supabase.from('app_tables').select('id').eq('app_id', appId)).data?.map((r) => r.id) || [];

  await deleteInWhere('app_blocks', 'page_id', pageIds);
  await deleteInWhere('app_pages', 'id', pageIds);

  await deleteInWhere('app_form_fields', 'form_id', formIds);
  await deleteInWhere('app_form_responses', 'form_id', formIds);
  await deleteInWhere('app_forms', 'id', formIds);

  await deleteInWhere('app_table_fields', 'table_id', tableIds);
  await deleteInWhere('app_table_rows', 'table_id', tableIds);
  await deleteInWhere('app_tables', 'id', tableIds);

  await supabase.from('app_settings').delete().eq('app_id', appId);
}

// ── Construction d'une app complète à partir d'un blueprint ──

export async function buildAppFromBlueprint(appId: number, bp: AppBlueprint): Promise<BuildResult> {
  const result: BuildResult = {
    pages: 0,
    blocks: 0,
    forms: 0,
    formFields: 0,
    tables: 0,
    tableFields: 0,
    tableRows: 0,
    settings: 0,
  };

  // 1. Formulaires + champs
  const formIdByName = new Map<string, number>();
  for (const [i, form] of (bp.forms || []).entries()) {
    const { data, error } = await supabase
      .from('app_forms')
      .insert({
        app_id: appId,
        name: form.name,
        title: form.title || form.name,
        description: form.description || null,
        position: i,
      })
      .select('id')
      .single();
    if (error) throw error;
    formIdByName.set(form.name, data.id);
    result.forms += 1;

    for (const [fi, field] of (form.fields || []).entries()) {
      const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);
      const { error: fErr } = await supabase.from('app_form_fields').insert({
        form_id: data.id,
        label: field.label,
        type: field.type,
        required: !!field.required,
        options: hasOptions ? field.options || [] : [],
        position: fi,
      });
      if (fErr) throw fErr;
      result.formFields += 1;
    }
  }

  // 2. Tables + champs + lignes
  const tableIdBySlug = new Map<string, number>();
  for (const [i, table] of (bp.tables || []).entries()) {
    const { data, error } = await supabase
      .from('app_tables')
      .insert({ app_id: appId, name: table.name, slug: table.slug, position: i })
      .select('id')
      .single();
    if (error) throw error;
    tableIdBySlug.set(table.slug, data.id);
    result.tables += 1;

    const fieldIdByLabel = new Map<string, number>();
    for (const [fi, field] of (table.fields || []).entries()) {
      const { data: fd, error: fErr } = await supabase
        .from('app_table_fields')
        .insert({ table_id: data.id, label: field.label, type: field.type, position: fi })
        .select('id')
        .single();
      if (fErr) throw fErr;
      fieldIdByLabel.set(field.label, fd.id);
      result.tableFields += 1;
    }

    for (const row of table.rows || []) {
      const rowData: Record<string, unknown> = {};
      for (const [label, value] of Object.entries(row)) {
        const fid = fieldIdByLabel.get(label);
        if (fid !== undefined) rowData[String(fid)] = value;
      }
      const { error: rErr } = await supabase.from('app_table_rows').insert({
        table_id: data.id,
        data: rowData,
      });
      if (rErr) throw rErr;
      result.tableRows += 1;
    }
  }

  // 3. Réglages
  for (const [i, s] of (bp.settings || []).entries()) {
    const { error } = await supabase.from('app_settings').insert({
      app_id: appId,
      key: s.key,
      label: s.label,
      type: s.type,
      value: s.value ?? (s.type === 'toggle' ? '0' : ''),
      options: s.type === 'select' ? s.options || [] : [],
      position: i,
    });
    if (error) throw error;
    result.settings += 1;
  }

  // 4. Pages + blocs
  for (const [i, page] of (bp.pages || []).entries()) {
    const { data, error } = await supabase
      .from('app_pages')
      .insert({
        app_id: appId,
        title: page.title,
        slug: page.slug || slugify(page.title),
        icon: page.icon || 'ri-file-text-line',
        position: i,
        visibility: page.visibility || 'visible',
      })
      .select('id')
      .single();
    if (error) throw error;
    result.pages += 1;

    for (const [bi, block] of (page.blocks || []).entries()) {
      let content: Record<string, unknown> = { ...(block.content || {}) };
      if (block.type === 'form') {
        const name = block.content?.form as string;
        content = { formId: formIdByName.get(name) ?? null };
      } else if (block.type === 'table') {
        const slug = block.content?.table as string;
        content = { tableId: tableIdBySlug.get(slug) ?? null };
      }
      const { error: bErr } = await supabase.from('app_blocks').insert({
        page_id: data.id,
        type: block.type,
        content,
        position: bi,
      });
      if (bErr) throw bErr;
      result.blocks += 1;
    }
  }

  return result;
}