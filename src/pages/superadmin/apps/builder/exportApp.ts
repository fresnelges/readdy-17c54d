import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';

// ── Export d'une app complète en fichier ZIP ────────────────
// L'app est sérialisée en un ensemble de fichiers JSON séparés :
//   manifest.json            → métadonnées + résumé
//   pages/<slug>.json        → une page + ses blocs
//   forms/<nom>.json         → un formulaire + ses champs
//   tables/<slug>.json       → une table + champs + lignes
//   settings.json            → tous les réglages
// Les réponses de formulaires (données utilisateurs) ne sont pas incluses.

interface AppRow {
  id: number;
  nom: string;
  nompage: string;
  description?: string | null;
  image?: string | null;
  typeapp?: string | null;
  prix?: string | null;
  free?: number | null;
  active?: number | null;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'element';

export async function exportAppToZip(appId: number): Promise<void> {
  // 1. Métadonnées de l'app
  const { data: app } = await supabase.from('appstore').select('*').eq('id', appId).maybeSingle();
  const meta = (app as AppRow | null) || null;

  // 2. Pages + blocs
  const { data: pages } = await supabase
    .from('app_pages')
    .select('*')
    .eq('app_id', appId)
    .order('position', { ascending: true });
  const pageList = (pages as Record<string, unknown>[]) || [];
  const pageIds = pageList.map((p) => p.id as number);

  const { data: blocks } = pageIds.length
    ? await supabase.from('app_blocks').select('*').in('page_id', pageIds).order('position', { ascending: true })
    : { data: [] };
  const blockList = (blocks as Record<string, unknown>[]) || [];

  // 3. Formulaires + champs
  const { data: forms } = await supabase
    .from('app_forms')
    .select('*')
    .eq('app_id', appId)
    .order('position', { ascending: true });
  const formList = (forms as Record<string, unknown>[]) || [];
  const formIds = formList.map((f) => f.id as number);

  const { data: formFields } = formIds.length
    ? await supabase.from('app_form_fields').select('*').in('form_id', formIds).order('position', { ascending: true })
    : { data: [] };
  const formFieldList = (formFields as Record<string, unknown>[]) || [];

  // 4. Tables + champs + lignes
  const { data: tables } = await supabase
    .from('app_tables')
    .select('*')
    .eq('app_id', appId)
    .order('position', { ascending: true });
  const tableList = (tables as Record<string, unknown>[]) || [];
  const tableIds = tableList.map((t) => t.id as number);

  const { data: tableFields } = tableIds.length
    ? await supabase.from('app_table_fields').select('*').in('table_id', tableIds).order('position', { ascending: true })
    : { data: [] };
  const tableFieldList = (tableFields as Record<string, unknown>[]) || [];

  const { data: tableRows } = tableIds.length
    ? await supabase.from('app_table_rows').select('*').in('table_id', tableIds).order('created_at', { ascending: true })
    : { data: [] };
  const tableRowList = (tableRows as Record<string, unknown>[]) || [];

  // 5. Réglages
  const { data: settings } = await supabase
    .from('app_settings')
    .select('*')
    .eq('app_id', appId)
    .order('position', { ascending: true });
  const settingList = (settings as Record<string, unknown>[]) || [];

  // ── Construction du ZIP ────────────────────────────────────

  const zip = new JSZip();

  // manifest.json
  const manifest = {
    format: 'zifek-app-export',
    version: 1,
    name: meta?.nom || '',
    nompage: meta?.nompage || '',
    description: meta?.description || '',
    image: meta?.image || '',
    typeapp: meta?.typeapp || 'seo',
    prix: meta?.prix || '0',
    free: meta?.free === 1,
    active: meta?.active === 1,
    exported_at: new Date().toISOString(),
    summary: {
      pages: pageList.length,
      blocks: blockList.length,
      forms: formList.length,
      tables: tableList.length,
      table_rows: tableRowList.length,
      settings: settingList.length,
    },
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // pages/<slug>.json
  const pagesFolder = zip.folder('pages');
  const usedPageSlugs = new Set<string>();
  pageList.forEach((page, i) => {
    const base = slugify(String(page.slug || page.title || ''));
    let slug = base;
    let n = 1;
    while (usedPageSlugs.has(slug)) {
      slug = `${base}-${n++}`;
    }
    usedPageSlugs.add(slug);

    const pageBlocks = blockList
      .filter((b) => b.page_id === page.id)
      .map((b) => ({
        type: b.type,
        content: b.content,
        position: b.position,
      }));

    pagesFolder?.file(
      `${slug}.json`,
      JSON.stringify(
        {
          title: page.title,
          slug: page.slug,
          icon: page.icon,
          visibility: page.visibility,
          position: page.position ?? i,
          blocks: pageBlocks,
        },
        null,
        2,
      ),
    );
  });

  // forms/<nom>.json
  const formsFolder = zip.folder('forms');
  const usedFormNames = new Set<string>();
  formList.forEach((form, i) => {
    const base = slugify(String(form.name || form.title || ''));
    let name = base;
    let n = 1;
    while (usedFormNames.has(name)) {
      name = `${base}-${n++}`;
    }
    usedFormNames.add(name);

    const fields = formFieldList
      .filter((f) => f.form_id === form.id)
      .map((f) => ({
        label: f.label,
        type: f.type,
        required: !!f.required,
        options: f.options || [],
        position: f.position,
      }));

    formsFolder?.file(
      `${name}.json`,
      JSON.stringify(
        {
          id: form.id,
          name: form.name,
          title: form.title,
          description: form.description,
          position: form.position ?? i,
          fields,
        },
        null,
        2,
      ),
    );
  });

  // tables/<slug>.json
  const tablesFolder = zip.folder('tables');
  const usedTableSlugs = new Set<string>();
  tableList.forEach((table, i) => {
    const base = slugify(String(table.slug || table.name || ''));
    let slug = base;
    let n = 1;
    while (usedTableSlugs.has(slug)) {
      slug = `${base}-${n++}`;
    }
    usedTableSlugs.add(slug);

    const fields = tableFieldList
      .filter((f) => f.table_id === table.id)
      .map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        position: f.position,
      }));

    // Résoudre les clés numériques (id de champ) vers les libellés
    const labelById = new Map<number, string>();
    fields.forEach((f) => labelById.set(f.id as number, f.label as string));

    const rows = tableRowList
      .filter((r) => r.table_id === table.id)
      .map((r) => {
        const data = (r.data as Record<string, unknown>) || {};
        const resolved: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
          const label = labelById.get(Number(key)) || key;
          resolved[label] = value;
        });
        return resolved;
      });

    tablesFolder?.file(
      `${slug}.json`,
      JSON.stringify(
        {
          id: table.id,
          name: table.name,
          slug: table.slug,
          position: table.position ?? i,
          fields: fields.map(({ id: _id, ...rest }) => rest),
          rows,
        },
        null,
        2,
      ),
    );
  });

  // settings.json
  zip.file(
    'settings.json',
    JSON.stringify(
      settingList.map((s, i) => ({
        key: s.key,
        label: s.label,
        type: s.type,
        value: s.value,
        options: s.options || [],
        position: s.position ?? i,
      })),
      null,
      2,
    ),
  );

  // ── Téléchargement ─────────────────────────────────────────
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slugify(meta?.nom || meta?.nompage || 'app')}-export.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}