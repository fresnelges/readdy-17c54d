import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { SECTION_DEFS, splitTitle } from '@/lib/sectionContent';

export interface ResolvedSection {
  title: string;
  subtitle: string;
  before: string;
  highlight: string | null;
}

/**
 * Lit le titre et le sous-titre d'une section publique depuis la base,
 * avec repli sur les valeurs par défaut si la boutique n'a rien personnalisé.
 */
export function useSectionContent(sectionKey: string): ResolvedSection {
  const { tenant, isTenant } = useTenant();
  const def = SECTION_DEFS.find((s) => s.key === sectionKey);
  const fallbackTitle = def?.title || '';
  const fallbackSubtitle = def?.subtitle || '';

  const [title, setTitle] = useState(fallbackTitle);
  const [subtitle, setSubtitle] = useState(fallbackSubtitle);

  useEffect(() => {
    if (!isTenant || !tenant) {
      setTitle(fallbackTitle);
      setSubtitle(fallbackSubtitle);
      return;
    }

    let cancelled = false;

    supabase
      .from('siteweb_section_content')
      .select('title, subtitle')
      .eq('idcommerce', tenant.id)
      .eq('section_key', sectionKey)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setTitle(data?.title || fallbackTitle);
        setSubtitle(data?.subtitle || fallbackSubtitle);
      })
      .catch(() => {
        if (!cancelled) {
          setTitle(fallbackTitle);
          setSubtitle(fallbackSubtitle);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isTenant, tenant, sectionKey, fallbackTitle, fallbackSubtitle]);

  const { before, highlight } = splitTitle(title);
  return { title, subtitle, before, highlight };
}