import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  fetchThemeReferences,
  uploadReferenceTheme,
  deleteThemeReference,
  type ThemeReference,
} from '@/lib/themeReference';
import ReferenceThemesPanel from './components/ReferenceThemesPanel';
import GenerationPanel from './components/GenerationPanel';

export default function ThemeGeneratePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [references, setReferences] = useState<ThemeReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [userIdcommerce, setUserIdcommerce] = useState<string>('');

  const userIdInt = user?.id ? (() => { const p = parseInt(String(user.id), 10); return Number.isNaN(p) ? 1 : p; })() : 1;

  const loadReferences = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchThemeReferences();
      setReferences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('users')
      .select('idcommerce')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setUserIdcommerce(data && data.idcommerce != null ? String(data.idcommerce) : String(user.id));
      })
      .catch(() => setUserIdcommerce(String(user.id)));
  }, [user]);

  const handleUpload = async (
    files: File[],
    type: string,
    name: string,
    onProgress?: (current: number, total: number, label: string) => void,
  ) => {
    const created = await uploadReferenceTheme(files, type, name, onProgress);
    await loadReferences();
    setSelectedId(created.id);
  };

  const handleDelete = async (id: number) => {
    await deleteThemeReference(id);
    if (selectedId === id) setSelectedId(null);
    await loadReferences();
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <button
            onClick={() => navigate('/superadmin/themes')}
            className="flex items-center gap-1.5 text-xs text-foreground-500 hover:text-foreground-800 transition-colors cursor-pointer mb-2"
          >
            <i className="ri-arrow-left-line"></i>
            Retour aux thèmes
          </button>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Génération de thèmes IA</h2>
          <p className="text-sm text-foreground-500 mt-1">
            Importe un thème PHP de référence, puis génère un nouveau thème en conservant le code dynamique et en changeant uniquement le design.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2.5 rounded-md bg-red-50 border border-red-100 flex items-start gap-2">
          <i className="ri-error-warning-line text-red-500 text-sm flex-shrink-0 mt-0.5"></i>
          <span className="text-xs text-red-700">{error}</span>
        </div>
      )}

      {/* Deux colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche : thèmes de référence */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <ReferenceThemesPanel
            references={references}
            selectedId={selectedId}
            loading={loading}
            onSelect={setSelectedId}
            onUpload={handleUpload}
            onDelete={handleDelete}
          />
        </div>

        {/* Colonne droite : génération */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <GenerationPanel
            references={references}
            selectedId={selectedId}
            onSelect={setSelectedId}
            userId={userIdInt}
            userIdcommerce={userIdcommerce}
          />
        </div>
      </div>
    </div>
  );
}