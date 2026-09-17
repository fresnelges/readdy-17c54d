import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { SECTION_DEFS } from '@/lib/sectionContent';

type SectionValues = Record<string, { title: string; subtitle: string }>;

export default function SiteContentPage() {
  const { user } = useAuth();
  const [sections, setSections] = useState<SectionValues>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const fetchSections = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('siteweb_section_content')
        .select('section_key, title, subtitle')
        .eq('idcommerce', user.id);

      const map: SectionValues = {};
      (data || []).forEach((row: { section_key: string; title: string; subtitle: string }) => {
        map[row.section_key] = { title: row.title || '', subtitle: row.subtitle || '' };
      });
      setSections(map);
    } catch {
      // On conserve les valeurs par défaut en cas d'échec de lecture.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const getValue = (key: string, field: 'title' | 'subtitle'): string => {
    const def = SECTION_DEFS.find((s) => s.key === key);
    return sections[key]?.[field] ?? def?.[field] ?? '';
  };

  const handleChange = (key: string, field: 'title' | 'subtitle', value: string) => {
    setSections((prev) => {
      const def = SECTION_DEFS.find((s) => s.key === key);
      const current = prev[key] || { title: def?.title || '', subtitle: def?.subtitle || '' };
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  };

  const handleSave = async (key: string) => {
    if (!user) return;
    setSavingKey(key);
    try {
      const value = sections[key];
      const { error } = await supabase
        .from('siteweb_section_content')
        .upsert(
          {
            idcommerce: user.id,
            section_key: key,
            title: value?.title || '',
            subtitle: value?.subtitle || '',
          },
          { onConflict: 'idcommerce,section_key' }
        );

      if (error) throw error;
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2500);
    } catch {
      // silent
    } finally {
      setSavingKey(null);
    }
  };

  const cancelReset = () => setConfirmReset(false);

  const handleReset = async () => {
    if (!user) return;
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase
        .from('siteweb_section_content')
        .delete()
        .eq('idcommerce', user.id);
      if (error) throw error;
      setSections({});
      setConfirmReset(false);
      setResetDone(true);
      setTimeout(() => setResetDone(false), 2500);
    } catch {
      // silent
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            Titres des sections
          </h2>
          <p className="text-sm text-foreground-500 mt-1">
            Personnalisez les titres et sous-titres affichés sur votre site public
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {resetDone && (
            <span className="text-sm text-accent-600 flex items-center gap-1 whitespace-nowrap">
              <i className="ri-checkbox-circle-line"></i>
              Réinitialisé !
            </span>
          )}
          {confirmReset && (
            <button
              onClick={cancelReset}
              className="px-4 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-900 whitespace-nowrap cursor-pointer"
            >
              Annuler
            </button>
          )}
          <button
            onClick={handleReset}
            disabled={Object.keys(sections).length === 0 || resetting}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 ${
              confirmReset
                ? 'bg-accent-500 text-background-50 hover:bg-accent-600'
                : 'border border-background-300/60 text-foreground-700 hover:bg-background-100'
            }`}
          >
            {resetting ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                Réinitialisation...
              </>
            ) : (
              <>
                <i className="ri-refresh-line"></i>
                {confirmReset ? 'Confirmer la réinitialisation' : 'Réinitialiser aux valeurs par défaut'}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {SECTION_DEFS.map((def) => (
          <div key={def.key} className="bg-background-50 border border-background-200/70 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                <i className={`${def.icon} text-lg text-primary-600`}></i>
              </div>
              <h3 className="text-sm font-semibold text-foreground-900">{def.label}</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1.5">
                  Titre
                </label>
                <input
                  type="text"
                  value={getValue(def.key, 'title')}
                  onChange={(e) => handleChange(def.key, 'title', e.target.value)}
                  placeholder={def.title}
                  maxLength={120}
                  className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
                />
                <p className="text-xs text-foreground-400 mt-1">
                  {def.note || 'Le dernier mot sera mis en couleur sur le site.'}
                </p>
              </div>
              {def.hasSubtitle !== false && (
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1.5">
                    Sous-titre
                  </label>
                  <input
                    type="text"
                    value={getValue(def.key, 'subtitle')}
                    onChange={(e) => handleChange(def.key, 'subtitle', e.target.value)}
                    placeholder={def.subtitle}
                    maxLength={200}
                    className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-background-200/70">
              <button
                onClick={() => handleSave(def.key)}
                disabled={savingKey === def.key}
                className="flex items-center gap-2 px-5 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingKey === def.key ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line"></i>
                    Enregistrer
                  </>
                )}
              </button>
              {savedKey === def.key && (
                <span className="text-sm text-accent-600 flex items-center gap-1">
                  <i className="ri-checkbox-circle-line"></i>
                  Sauvegardé !
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}