import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import {
  DEFAULT_HOMEPAGE_CONTENT,
  mergeHomepageContent,
  type HomepageContent,
} from '@/lib/homepageContent';

interface HomepageContentContextType {
  content: HomepageContent;
  loading: boolean;
  saving: boolean;
  error: string | null;
  save: (next: HomepageContent) => Promise<boolean>;
  refresh: () => void;
}

const HomepageContentContext = createContext<HomepageContentContextType | null>(null);

export function HomepageContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('homepage_content')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      setContent(mergeHomepageContent(data as Partial<HomepageContent> | null));
    } catch {
      // On conserve les valeurs par défaut en cas d'échec de lecture.
      setContent(DEFAULT_HOMEPAGE_CONTENT);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const save = useCallback(async (next: HomepageContent): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const { error: upsertError } = await supabase
        .from('homepage_content')
        .upsert({ id: 1, ...next }, { onConflict: 'id' });

      if (upsertError) throw upsertError;

      setContent(next);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <HomepageContentContext.Provider
      value={{ content, loading, saving, error, save, refresh: fetchContent }}
    >
      {children}
    </HomepageContentContext.Provider>
  );
}

export function useHomepageContent(): HomepageContentContextType {
  const context = useContext(HomepageContentContext);
  if (!context) {
    throw new Error('useHomepageContent must be used within a HomepageContentProvider');
  }
  return context;
}