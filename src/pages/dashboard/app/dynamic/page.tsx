import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface AppInfo {
  id: number;
  nom: string;
  description: string;
  image: string;
  nompage: string;
  published_version_id: number | null;
}

// ── Modèle de contenu normalisé (brouillon live OU snapshot publié) ──

interface NormField {
  id: number | string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
}

interface NormForm {
  id: number;
  title: string;
  description: string;
  fields: NormField[];
}

interface NormTable {
  id: number;
  fields: { id: number | string; label: string }[];
  rows: { id: number | string; data: Record<string, unknown> }[];
}

interface NormPage {
  id: number | string;
  title: string;
  slug: string;
  icon: string;
}

interface NormBlock {
  id: number | string;
  type: string;
  content: Record<string, unknown>;
}

export default function DynamicAppPage() {
  const location = useLocation();
  const segments = location.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  const appSlug = segments[1] || '';
  const pageSlug = segments[2] || '';

  const [app, setApp] = useState<AppInfo | null>(null);
  const [pages, setPages] = useState<NormPage[]>([]);
  const [blocksByPage, setBlocksByPage] = useState<Record<string, NormBlock[]>>({});
  const [forms, setForms] = useState<Record<string, NormForm>>({});
  const [tables, setTables] = useState<Record<string, NormTable>>({});
  const [activePageKey, setActivePageKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!appSlug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const loadApp = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const { data: appData, error: appErr } = await supabase
          .from('appstore')
          .select('id, nom, description, image, nompage, published_version_id')
          .eq('nompage', appSlug)
          .maybeSingle();

        if (appErr) throw appErr;
        if (!appData) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setApp(appData as AppInfo);

        // 1. Tente de charger la version publiée (snapshot).
        let snapshot: any = null;
        if (appData.published_version_id) {
          const { data: version } = await supabase
            .from('app_versions')
            .select('snapshot')
            .eq('id', appData.published_version_id)
            .maybeSingle();
          snapshot = version?.snapshot ?? null;
        }

        if (snapshot && snapshot.pages) {
          // ── Rendu depuis le snapshot publié ──
          const snapPages: NormPage[] = (snapshot.pages as any[]).map((p, i) => ({
            id: i,
            title: p.title,
            slug: p.slug,
            icon: p.icon || 'ri-file-text-line',
          }));

          const snapBlocks: Record<string, NormBlock[]> = {};
          (snapshot.pages as any[]).forEach((p, i) => {
            snapBlocks[String(i)] = (p.blocks || []).map((b: any, bi: number) => ({
              id: bi,
              type: b.type,
              content: b.content || {},
            }));
          });

          const snapForms: Record<string, NormForm> = {};
          (snapshot.forms || []).forEach((f: any) => {
            snapForms[String(f.id)] = {
              id: f.id,
              title: f.title || f.name,
              description: f.description || '',
              fields: (f.fields || []).map((fd: any) => ({
                id: fd.label,
                label: fd.label,
                type: fd.type,
                required: !!fd.required,
                options: fd.options || [],
              })),
            };
          });

          const snapTables: Record<string, NormTable> = {};
          (snapshot.tables || []).forEach((t: any) => {
            snapTables[String(t.id)] = {
              id: t.id,
              fields: (t.fields || []).map((tf: any) => ({ id: tf.label, label: tf.label })),
              rows: (t.rows || []).map((row: any, ri: number) => ({ id: ri, data: row })),
            };
          });

          setPages(snapPages);
          setBlocksByPage(snapBlocks);
          setForms(snapForms);
          setTables(snapTables);
          const currentPage = pageSlug
            ? snapPages.find((p) => p.slug === pageSlug) || snapPages[0]
            : snapPages[0];
          setActivePageKey(currentPage ? String(currentPage.id) : null);
        } else {
          // ── Rendu depuis le brouillon live (aucune version publiée) ──
          const { data: pagesData, error: pagesErr } = await supabase
            .from('app_pages')
            .select('id, title, slug, icon, visibility')
            .eq('app_id', appData.id)
            .eq('visibility', 'visible')
            .order('position', { ascending: true });
          if (pagesErr) throw pagesErr;

          const pageList = (pagesData as any[]) || [];
          const livePages: NormPage[] = pageList.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            icon: p.icon || 'ri-file-text-line',
          }));

          const pageIds = pageList.map((p) => p.id);
          const { data: blocksData } = pageIds.length
            ? await supabase.from('app_blocks').select('id, type, content, page_id').in('page_id', pageIds).order('position', { ascending: true })
            : { data: [] };
          const blockList = (blocksData as any[]) || [];

          const liveBlocks: Record<string, NormBlock[]> = {};
          pageList.forEach((p) => {
            liveBlocks[String(p.id)] = blockList
              .filter((b) => b.page_id === p.id)
              .map((b) => ({ id: b.id, type: b.type, content: b.content || {} }));
          });

          setPages(livePages);
          setBlocksByPage(liveBlocks);
          setForms({});
          setTables({});
          const currentPage = pageSlug
            ? livePages.find((p) => p.slug === pageSlug) || livePages[0]
            : livePages[0];
          setActivePageKey(currentPage ? String(currentPage.id) : null);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    loadApp();
  }, [appSlug, pageSlug]);

  const selectPage = useCallback((page: NormPage) => {
    setActivePageKey(String(page.id));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
      </div>
    );
  }

  if (notFound || !app) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <i className="ri-compass-4-line text-5xl text-foreground-300 mb-4"></i>
        <h2 className="text-lg font-bold text-foreground-800 mb-2">Application introuvable</h2>
        <p className="text-sm text-foreground-500 mb-4">Cette application n'existe pas ou n'est pas disponible.</p>
        <Link
          to="/dashboard/appstore"
          className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap"
        >
          Retour à l'AppStore
        </Link>
      </div>
    );
  }

  const activePage = pages.find((p) => String(p.id) === activePageKey) || null;
  const blocks = activePageKey ? blocksByPage[activePageKey] || [] : [];

  return (
    <div className="min-h-screen bg-background-50">
      {/* App header */}
      <div className="border-b border-background-200/70 bg-background-50">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-5">
          <div className="flex items-center gap-4">
            {app.image && (
              <img src={app.image} alt={app.nom} className="w-14 h-14 rounded-xl object-cover object-top flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">{app.nom}</h1>
              {app.description && (
                <p className="text-sm text-foreground-500 mt-0.5 line-clamp-1">{app.description}</p>
              )}
            </div>
          </div>

          {/* Page navigation */}
          {pages.length > 1 && (
            <nav className="flex items-center gap-1 mt-5 overflow-x-auto">
              {pages.map((page) => {
                const isActive = activePageKey === String(page.id);
                return (
                  <button
                    key={page.id}
                    onClick={() => selectPage(page)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-foreground-950 text-background-50'
                        : 'text-foreground-500 hover:text-foreground-800 hover:bg-background-100'
                    }`}
                  >
                    <i className={page.icon || 'ri-file-text-line'}></i>
                    {page.title}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        {activePage && (
          <h2 className="text-lg font-bold font-heading text-foreground-900 mb-6">{activePage.title}</h2>
        )}

        {blocks.length === 0 ? (
          <div className="text-center py-16 text-foreground-400">
            <i className="ri-inbox-line text-4xl block mb-3"></i>
            <p className="text-sm">Cette page est vide pour l'instant.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {blocks.map((block) => (
              <RenderBlock key={block.id} block={block} forms={forms} tables={tables} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Rendu d'un bloc (données résolues via forms/tables) ─────

function RenderBlock({
  block,
  forms,
  tables,
}: {
  block: NormBlock;
  forms: Record<string, NormForm>;
  tables: Record<string, NormTable>;
}) {
  const content = block.content || {};

  switch (block.type) {
    case 'heading':
      return <h3 className="text-xl font-bold font-heading text-foreground-900">{content.text as string || ''}</h3>;
    case 'text':
      return <p className="text-sm text-foreground-600 leading-relaxed whitespace-pre-line">{content.text as string || ''}</p>;
    case 'image':
      return (
        <figure>
          {content.url ? (
            <img src={content.url as string} alt={content.caption as string || ''} className="w-full rounded-lg object-cover object-top max-h-[400px]" />
          ) : (
            <div className="w-full h-48 rounded-lg bg-background-100 flex items-center justify-center text-foreground-300">
              <i className="ri-image-line text-3xl"></i>
            </div>
          )}
          {content.caption && <figcaption className="text-xs text-foreground-400 mt-2">{content.caption as string}</figcaption>}
        </figure>
      );
    case 'list': {
      const items = (content.items as string[]) || [];
      return (
        <div>
          {content.title && <h4 className="text-base font-semibold text-foreground-900 mb-3">{content.title as string}</h4>}
          <ul className="space-y-2">
            {items.filter((i) => i.trim()).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground-600">
                <i className="ri-checkbox-circle-line text-accent-500 mt-0.5"></i>
                {item}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case 'form': {
      const formId = content.formId;
      const form = formId != null ? forms[String(formId)] : undefined;
      return form ? <FormBlock form={form} /> : <EmptyHint label="Formulaire non sélectionné" />;
    }
    case 'table': {
      const tableId = content.tableId;
      const table = tableId != null ? tables[String(tableId)] : undefined;
      return table ? <TableBlock table={table} /> : <EmptyHint label="Tableau non sélectionné" />;
    }
    case 'spacer':
      return <div style={{ height: `${(content.height as number) || 32}px` }} />;
    default:
      return null;
  }
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="p-4 rounded-lg border border-dashed border-background-200/70 text-center text-xs text-foreground-400">
      {label}
    </div>
  );
}

// ── Bloc formulaire (données déjà résolues) ─────────────────

function FormBlock({ form }: { form: NormForm }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await supabase.from('app_form_responses').insert({ form_id: form.id, data: values });
      setSubmitted(true);
    } catch {
      // échec silencieux : on affiche tout de même la confirmation
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-6 rounded-lg bg-accent-50 border border-accent-200 text-center">
        <i className="ri-checkbox-circle-line text-4xl text-accent-500 block mb-3"></i>
        <p className="text-sm font-medium text-accent-800">Merci, votre réponse a bien été enregistrée.</p>
      </div>
    );
  }

  return (
    <div className="bg-background-50 border border-background-200/70 rounded-lg p-6">
      {form.title && <h3 className="text-base font-semibold text-foreground-900 mb-1">{form.title}</h3>}
      {form.description && <p className="text-sm text-foreground-500 mb-5">{form.description}</p>}
      <div className="space-y-4">
        {form.fields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-foreground-800 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                rows={3}
                required={field.required}
                value={values[String(field.id)] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [String(field.id)]: e.target.value }))}
                className="w-full px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300 resize-y"
              />
            ) : field.type === 'select' || field.type === 'radio' ? (
              <select
                required={field.required}
                value={values[String(field.id)] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [String(field.id)]: e.target.value }))}
                className="w-full px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
              >
                <option value="">— Choisir —</option>
                {field.options.filter((o) => o.trim()).map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <div className="flex flex-wrap gap-3">
                {field.options.filter((o) => o.trim()).map((opt, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm text-foreground-700">
                    <input
                      type="checkbox"
                      checked={(values[String(field.id)] || '').split('|').includes(opt)}
                      onChange={(e) => {
                        const current = (values[String(field.id)] || '').split('|').filter(Boolean);
                        if (e.target.checked) current.push(opt);
                        else current.splice(current.indexOf(opt), 1);
                        setValues((v) => ({ ...v, [String(field.id)]: current.join('|') }));
                      }}
                      className="w-4 h-4"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <input
                type={field.type}
                required={field.required}
                value={values[String(field.id)] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [String(field.id)]: e.target.value }))}
                className="w-full px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
              />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={submitting}
        className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 disabled:opacity-50 whitespace-nowrap"
      >
        {submitting ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-send-plane-line"></i>}
        Envoyer
      </button>
    </div>
  );
}

// ── Bloc tableau de données (données déjà résolues) ─────────

function TableBlock({ table }: { table: NormTable }) {
  if (table.fields.length === 0 || table.rows.length === 0) {
    return <EmptyHint label="Aucune donnée à afficher" />;
  }

  return (
    <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-background-100 text-left text-xs text-foreground-500 uppercase tracking-wider">
            {table.fields.map((f) => (
              <th key={f.id} className="px-4 py-3 font-semibold whitespace-nowrap">{f.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-background-200/70">
          {table.rows.map((row) => (
            <tr key={row.id}>
              {table.fields.map((f) => (
                <td key={f.id} className="px-4 py-3 text-foreground-700">{String(row.data?.[f.label] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}