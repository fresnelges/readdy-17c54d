import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useBrand } from '@/hooks/useBrand';
import { uploadMediaFile } from '@/hooks/useUpload';

interface ApiKeys {
  xai: string;
  openrouter: string;
  ollama: string;
  openai: string;
  ollama_endpoint: string;
}

export default function SuperAdminSettingsPage() {
  const { brand, refresh: refreshBrand } = useBrand();
  const [keys, setKeys] = useState<ApiKeys>({
    xai: '', openrouter: '', ollama: '', openai: '', ollama_endpoint: 'http://localhost:11434',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  // Brand state
  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  // Default theme state
  const [defaultThemeId, setDefaultThemeId] = useState<number>(1);
  const [themes, setThemes] = useState<{ id: number; titre: string; active: number }[]>([]);
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);

  useEffect(() => {
    fetchKeys();
    fetchThemesAndDefault();
  }, []);

  useEffect(() => {
    setBrandName(brand.name);
    setBrandLogo(brand.logo);
  }, [brand]);

  const fetchThemesAndDefault = async () => {
    try {
      const { data: themeData } = await supabase
        .from('sitewebtheme')
        .select('id, titre, active')
        .order('id');
      setThemes((themeData || []) as { id: number; titre: string; active: number }[]);

      const { data: zifekData } = await supabase
        .from('zifek')
        .select('default_theme_id')
        .limit(1)
        .maybeSingle();
      if (zifekData?.default_theme_id) {
        const tid = parseInt(String(zifekData.default_theme_id), 10);
        if (!isNaN(tid)) setDefaultThemeId(tid);
      }
    } catch { /* */ }
  };

  const saveDefaultTheme = async () => {
    setSavingTheme(true);
    setThemeSaved(false);
    try {
      await supabase
        .from('zifek')
        .upsert({ id: 1, default_theme_id: defaultThemeId }, { onConflict: 'id' });
      setThemeSaved(true);
      setTimeout(() => setThemeSaved(false), 2000);
    } catch (err: unknown) {
      console.error('Save default theme error:', err);
    } finally {
      setSavingTheme(false);
    }
  };

  const fetchKeys = async () => {
    try {
      const { data } = await supabase
        .from('zifek')
        .select('xai_api_key, openrouter_api_key, ollama_api_key, openai_api_key, ollama_endpoint')
        .limit(1)
        .maybeSingle();

      if (data) {
        setKeys({
          xai: data.xai_api_key || '',
          openrouter: data.openrouter_api_key || '',
          ollama: data.ollama_api_key || '',
          openai: data.openai_api_key || '',
          ollama_endpoint: data.ollama_endpoint || 'http://localhost:11434',
        });
      }
    } catch { /* keep defaults */ }
    finally { setLoading(false); }
  };

  const saveKey = async (provider: string, value: string) => {
    setSaving(provider);
    setSavedKey(null);
    try {
      const columnMap: Record<string, string> = {
        xai: 'xai_api_key',
        openrouter: 'openrouter_api_key',
        ollama: 'ollama_api_key',
        openai: 'openai_api_key',
        ollama_endpoint: 'ollama_endpoint',
      };

      const column = columnMap[provider];
      if (!column) return;

      const { error } = await supabase.rpc('save_zifek_api_key', {
        key_column: column,
        key_value: value || '',
      });

      if (error) throw error;

      setSavedKey(provider);
      const { data: refreshed } = await supabase
        .from('zifek')
        .select('xai_api_key, openrouter_api_key, ollama_api_key, openai_api_key, ollama_endpoint')
        .limit(1)
        .maybeSingle();
      if (refreshed) {
        setKeys({
          xai: refreshed.xai_api_key || '',
          openrouter: refreshed.openrouter_api_key || '',
          ollama: refreshed.ollama_api_key || '',
          openai: refreshed.openai_api_key || '',
          ollama_endpoint: refreshed.ollama_endpoint || 'http://localhost:11434',
        });
      }
      setTimeout(() => setSavedKey(null), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setSavedKey(`err:${provider}`);
      console.error('Save key error:', msg);
      setTimeout(() => setSavedKey(null), 3000);
    }
    finally { setSaving(null); }
  };

  const toggleShow = (provider: string) => {
    setShowKey((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  // ── Brand save ──
  const saveBrand = async () => {
    setSavingBrand(true);
    setBrandSaved(false);
    setBrandError(null);
    try {
      const { error } = await supabase.rpc('save_zifek_brand', {
        brand_name: brandName.trim() || 'ZIFEK',
        brand_logo: brandLogo || '',
      });

      if (error) throw error;

      setBrandSaved(true);
      refreshBrand();
      setTimeout(() => setBrandSaved(false), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setBrandError(msg);
      setTimeout(() => setBrandError(null), 4000);
    } finally {
      setSavingBrand(false);
    }
  };

  // ── Logo upload ──
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setBrandError("Seules les images sont acceptées (JPEG, PNG, WebP)");
      setTimeout(() => setBrandError(null), 4000);
      return;
    }

    // Validate size (1MB max)
    if (file.size > 1024 * 1024) {
      setBrandError("L'image dépasse la limite de 1 Mo");
      setTimeout(() => setBrandError(null), 4000);
      return;
    }

    setUploadingLogo(true);
    setBrandError(null);
    try {
      const url = await uploadMediaFile(file, 'brand');
      setBrandLogo(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Échec de l'upload";
      setBrandError(msg);
      setTimeout(() => setBrandError(null), 4000);
    } finally {
      setUploadingLogo(false);
      // Reset input so same file can be re-uploaded
      e.target.value = '';
    }
  };

  const apiProviders = [
    {
      id: 'xai',
      name: 'xAI (Grok)',
      icon: 'ri-brain-line',
      color: 'bg-foreground-100 text-foreground-700',
      desc: "Clé API pour xAI Grok — utilisé pour les assistants IA avancés",
      placeholder: 'xai-...',
      docsUrl: 'https://x.ai/api',
    },
    {
      id: 'openai',
      name: 'OpenAI',
      icon: 'ri-openai-line',
      color: 'bg-accent-100 text-accent-700',
      desc: "Clé API OpenAI — GPT-4, GPT-4o, DALL-E, etc.",
      placeholder: 'sk-...',
      docsUrl: 'https://platform.openai.com/api-keys',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      icon: 'ri-router-line',
      color: 'bg-primary-100 text-primary-700',
      desc: "Clé API OpenRouter — accès unifié à tous les modèles (Claude, Gemini, etc.)",
      placeholder: 'sk-or-v1-...',
      docsUrl: 'https://openrouter.ai/keys',
    },
    {
      id: 'ollama',
      name: 'Ollama (Local)',
      icon: 'ri-computer-line',
      color: 'bg-secondary-100 text-secondary-700',
      desc: "Ollama local — pas de clé API requise, uniquement l'endpoint",
      placeholder: 'Laissez vide si pas de clé requise',
      docsUrl: 'https://ollama.com',
      isOptional: true,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Paramètres</h2>
        <p className="text-sm text-foreground-500 mt-1">
          Configurez les paramètres globaux de la plateforme Zifek
        </p>
      </div>

      {/* ─── Brand Section ─── */}
      <div className="mb-8 max-w-3xl">
        <h3 className="text-base font-semibold text-foreground-950 mb-3 flex items-center gap-2">
          <i className="ri-building-2-line text-foreground-500"></i>
          Marque &amp; Logo
        </h3>
        <p className="text-xs text-foreground-500 mb-4">
          Ce brand sera affiché dans toute la plateforme (dashboard client, superadmin, emails).
        </p>

        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 space-y-4">
          {/* Brand name */}
          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">
              Nom de la marque
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="ZIFEK"
              className="w-full max-w-md h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
            />
          </div>

          {/* Logo upload */}
          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">
              Logo
            </label>
            <p className="text-xs text-foreground-400 mb-3">
              Format recommandé : PNG ou WebP, au moins 256px de large. Max 1 Mo.
            </p>

            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="w-20 h-20 rounded-lg border border-background-200/70 bg-background-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {uploadingLogo ? (
                  <i className="ri-loader-4-line animate-spin text-foreground-400 text-xl"></i>
                ) : brandLogo ? (
                  <img
                    src={brandLogo}
                    alt="Logo"
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <i className="ri-image-line text-foreground-300 text-xl"></i>
                    <span className="text-[9px] text-foreground-400">Aucun logo</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-foreground-100 text-foreground-700 text-xs font-medium cursor-pointer hover:bg-foreground-200/70 transition-colors whitespace-nowrap">
                  <i className="ri-upload-cloud-line text-sm"></i>
                  {brandLogo ? "Changer l'image" : "Uploader un logo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {brandLogo && (
                  <button
                    onClick={() => setBrandLogo(null)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs text-foreground-500 hover:text-red-600 hover:bg-red-50/60 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-delete-bin-line text-xs"></i>
                    Retirer le logo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error / Success */}
          {brandError && (
            <p className="text-xs text-red-600 bg-red-50/70 px-3 py-2 rounded-md flex items-center gap-1.5">
              <i className="ri-error-warning-line"></i>
              {brandError}
            </p>
          )}

          {/* Save button */}
          <div className="pt-1">
            <button
              onClick={saveBrand}
              disabled={savingBrand}
              className="h-10 px-5 rounded-full bg-foreground-950 text-background-50 text-sm font-semibold whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {savingBrand ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-xs"></i>
                  Enregistrement...
                </>
              ) : brandSaved ? (
                <>
                  <i className="ri-check-line text-xs"></i>
                  Enregistré
                </>
              ) : (
                'Enregistrer la marque'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* API Cards */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground-950 mb-3 flex items-center gap-2">
          <i className="ri-key-2-line text-foreground-500"></i>
          Clés API IA
        </h3>
        <p className="text-xs text-foreground-500 mb-4">
          Configurez les clés API utilisées par toute la plateforme Zifek
        </p>
      </div>

      <div className="space-y-4 max-w-3xl">
        {apiProviders.map((provider) => (
          <div key={provider.id} className="bg-background-50 border border-background-200/70 rounded-lg p-5">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center flex-shrink-0`}>
                <i className={`${provider.icon} text-lg`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground-900">{provider.name}</h3>
                  {provider.isOptional && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background-100 text-foreground-500 font-medium">Optionnel</span>
                  )}
                </div>
                <p className="text-xs text-foreground-500 mb-3">{provider.desc}</p>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey[provider.id] ? 'text' : 'password'}
                      value={keys[provider.id as keyof ApiKeys] || ''}
                      onChange={(e) => setKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                      placeholder={provider.placeholder}
                      className="w-full h-10 px-3 pr-10 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 font-mono"
                    />
                    <button
                      onClick={() => toggleShow(provider.id)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
                      title={showKey[provider.id] ? 'Cacher' : 'Afficher'}
                    >
                      <i className={`text-sm ${showKey[provider.id] ? 'ri-eye-off-line' : 'ri-eye-line'}`}></i>
                    </button>
                  </div>
                  <button
                    onClick={() => saveKey(provider.id, keys[provider.id as keyof ApiKeys] || '')}
                    disabled={saving === provider.id}
                    className={`h-10 px-4 rounded-md text-sm font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ${
                      savedKey === `err:${provider.id}` ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-foreground-950 text-background-50 hover:bg-foreground-800'
                    }`}
                  >
                    {saving === provider.id ? (
                      <>
                        <i className="ri-loader-4-line animate-spin text-xs"></i>
                        ...
                      </>
                    ) : savedKey === `err:${provider.id}` ? (
                      <>
                        <i className="ri-error-warning-line text-xs"></i>
                        Erreur
                      </>
                    ) : savedKey === provider.id ? (
                      <>
                        <i className="ri-check-line text-xs"></i>
                        OK
                      </>
                    ) : (
                      'Enregistrer'
                    )}
                  </button>
                </div>

                {provider.id === 'ollama' && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-foreground-600 mb-1.5">Endpoint Ollama</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={keys.ollama_endpoint || 'http://localhost:11434'}
                        onChange={(e) => setKeys((prev) => ({ ...prev, ollama_endpoint: e.target.value }))}
                        placeholder="http://localhost:11434"
                        className="flex-1 h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 font-mono"
                      />
                      <button
                        onClick={() => saveKey('ollama_endpoint', keys.ollama_endpoint)}
                        disabled={saving === 'ollama_endpoint'}
                        className={`h-10 px-4 rounded-md text-sm font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 ${
                          savedKey === 'err:ollama_endpoint' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-foreground-950 text-background-50 hover:bg-foreground-800'
                        }`}
                      >
                        {saving === 'ollama_endpoint' ? (
                          <i className="ri-loader-4-line animate-spin text-xs"></i>
                        ) : savedKey === 'err:ollama_endpoint' ? (
                          <i className="ri-error-warning-line text-xs"></i>
                        ) : savedKey === 'ollama_endpoint' ? (
                          <i className="ri-check-line text-xs"></i>
                        ) : (
                          'OK'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-foreground-400 hover:text-primary-500 transition-colors flex items-center gap-1"
                  >
                    <i className="ri-external-link-line"></i>
                    Documentation
                  </a>
                  <span className="text-[10px] text-foreground-300">|</span>
                  <span className="text-[10px] text-foreground-400">
                    {keys[provider.id as keyof ApiKeys] ? '✓ Configuré' : 'Non configuré'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Security Note */}
      <div className="mt-6 max-w-3xl p-4 bg-background-100 rounded-lg border border-background-200/70">
        <div className="flex items-start gap-3">
          <i className="ri-shield-check-line text-accent-500 mt-0.5"></i>
          <div>
            <h4 className="text-sm font-medium text-foreground-900 mb-1">Sécurité</h4>
            <p className="text-xs text-foreground-500 leading-relaxed">
              Ces clés sont stockées de manière sécurisée et sont utilisées par tous les modules IA de la plateforme (agents, chatbots, génération de contenu, etc.). Ne partagez jamais ces clés.
            </p>
          </div>
        </div>
      </div>

      {/* Default Theme */}
      <div className="mt-8 max-w-3xl">
        <h3 className="text-base font-semibold text-foreground-950 mb-3 flex items-center gap-2">
          <i className="ri-palette-line text-foreground-500"></i>
          Th&egrave;me par d&eacute;faut
        </h3>
        <p className="text-xs text-foreground-500 mb-4">
          Ce th&egrave;me sera automatiquement install&eacute; pour chaque nouvel utilisateur qui cr&eacute;e un compte sur la plateforme.
        </p>

        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">
                S&eacute;lectionner le th&egrave;me par d&eacute;faut
              </label>
              <select
                value={defaultThemeId}
                onChange={(e) => setDefaultThemeId(parseInt(e.target.value, 10))}
                className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 cursor-pointer"
              >
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titre} {t.active === 0 ? '(inactif)' : ''}
                  </option>
                ))}
              </select>
              {defaultThemeId && (
                <p className="text-[11px] text-foreground-400 mt-1.5">
                  Th&egrave;me actuel : <strong className="text-foreground-600">{themes.find((t) => t.id === defaultThemeId)?.titre || 'Inconnu'}</strong>
                  &nbsp;&mdash;&nbsp; sera attribu&eacute; &agrave; chaque nouveau compte Zifek
                </p>
              )}
            </div>
            <button
              onClick={saveDefaultTheme}
              disabled={savingTheme}
              className="h-10 px-5 rounded-full bg-foreground-950 text-background-50 text-sm font-semibold whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0 self-end"
            >
              {savingTheme ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-xs"></i>
                  ...
                </>
              ) : themeSaved ? (
                <>
                  <i className="ri-check-line text-xs"></i>
                  OK
                </>
              ) : (
                'D&eacute;finir par d&eacute;faut'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}