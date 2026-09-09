import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import TemplateRenderer from '@/components/feature/TemplateRenderer';

interface ThemePage {
  id: number;
  idtheme: number;
  page_key: string;
  title: string;
  content: string;
}

export default function TenantThemePage() {
  const { pageKey } = useParams<{ pageKey: string }>();
  const { tenant, theme } = useTenant();
  const [page, setPage] = useState<ThemePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pageKey || !theme?.idtheme) {
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('sitewebthemepage')
      .select('*')
      .eq('idtheme', theme.idtheme)
      .eq('page_key', pageKey)
      .maybeSingle()
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) setError(fetchErr.message);
        else if (!data) setError('Page introuvable');
        else setPage(data as ThemePage);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [pageKey, theme?.idtheme]);

  // Update document title
  useEffect(() => {
    if (page?.title) {
      document.title = `${page.title} - ${tenant?.nomcommerce || tenant?.name || ''}`;
    }
  }, [page, tenant]);

  if (!pageKey) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
          <i className="ri-file-unknow-line text-2xl text-foreground-400"></i>
        </div>
        <h2 className="text-xl font-bold font-heading text-foreground-950 mb-2">Page introuvable</h2>
        <p className="text-sm text-foreground-500 text-center max-w-md mb-6">
          Cette page n&apos;existe pas ou a &eacute;t&eacute; supprim&eacute;e.
        </p>
        <Link
          to="/"
          className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer no-underline whitespace-nowrap hover:bg-primary-600 transition-colors"
        >
          Retour &agrave; l&apos;accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      {/* Page Hero */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background-100/50 to-transparent"></div>
        <div className="relative w-full px-4 md:px-6 max-w-7xl mx-auto text-center">
          <h1 className="text-2xl md:text-4xl font-bold font-heading text-foreground-950 mb-3">
            {page.title}
          </h1>
        </div>
      </section>

      {/* Page Content rendered via template engine */}
      <section className="py-8 md:py-12">
        <div className="w-full px-4 md:px-6 max-w-7xl mx-auto">
          <TemplateRenderer content={page.content} />
        </div>
      </section>
    </div>
  );
}