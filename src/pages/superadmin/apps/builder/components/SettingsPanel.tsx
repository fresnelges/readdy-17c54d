import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SETTING_TYPES, type AppSetting } from '../constants';

interface SettingsPanelProps {
  appId: number;
}

export default function SettingsPanel({ appId }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('text');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('app_settings')
        .select('*')
        .eq('app_id', appId)
        .order('position', { ascending: true });
      if (fetchError) throw fetchError;
      setSettings((data as AppSetting[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const createSetting = async () => {
    if (!newLabel.trim()) return;
    const key = newLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const { data, error: insErr } = await supabase
      .from('app_settings')
      .insert({
        app_id: appId,
        key,
        label: newLabel.trim(),
        type: newType,
        value: newType === 'toggle' ? '0' : '',
        options: newType === 'select' ? ['', ''] : [],
        position: settings.length,
      })
      .select('*')
      .single();
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setSettings((prev) => [...prev, data as AppSetting]);
    setCreating(false);
    setNewLabel('');
    setNewType('text');
  };

  const updateSetting = async (setting: AppSetting, patch: Partial<AppSetting>) => {
    const next = { ...setting, ...patch };
    setSettings((prev) => prev.map((s) => (s.id === setting.id ? next : s)));
    await supabase.from('app_settings').update(patch).eq('id', setting.id);
  };

  const deleteSetting = async (setting: AppSetting) => {
    if (!window.confirm(`Supprimer le réglage "${setting.label}" ?`)) return;
    const { error: delErr } = await supabase.from('app_settings').delete().eq('id', setting.id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setSettings((prev) => prev.filter((s) => s.id !== setting.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm rounded-lg">
          <i className="ri-error-warning-line"></i>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="cursor-pointer"><i className="ri-close-line"></i></button>
        </div>
      )}

      <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
        <p className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-3">Réglages de l'application</p>
        <p className="text-sm text-foreground-500 mb-4">
          Définissez les options de configuration que le commerçant pourra ajuster une fois l'app installée.
        </p>

        {creating ? (
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Libellé du réglage (ex: Activer les notifications)"
              autoFocus
              className="flex-1 px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
            >
              {SETTING_TYPES.map((st) => (
                <option key={st.type} value={st.type}>{st.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button onClick={createSetting} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap">Ajouter</button>
              <button onClick={() => { setCreating(false); setNewLabel(''); }} className="px-3 py-2 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap">Annuler</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-foreground-950 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-foreground-800 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line"></i>
            Ajouter un réglage
          </button>
        )}
      </div>

      {/* Settings list */}
      {settings.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-background-200/70 rounded-lg">
          <i className="ri-settings-3-line text-3xl text-foreground-300 block mb-2"></i>
          <p className="text-sm text-foreground-500">Aucun réglage défini</p>
        </div>
      ) : (
        <div className="space-y-2">
          {settings.map((setting) => (
            <div key={setting.id} className="bg-background-50 border border-background-200/70 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary-50 text-secondary-700 whitespace-nowrap">
                  {SETTING_TYPES.find((st) => st.type === setting.type)?.label || setting.type}
                </span>
                <input
                  type="text"
                  value={setting.label}
                  onChange={(e) => updateSetting(setting, { label: e.target.value })}
                  className="flex-1 px-2 py-1 border border-background-200/70 rounded text-sm text-foreground-900 focus:outline-none focus:border-primary-300 min-w-0"
                />
                <button onClick={() => deleteSetting(setting)} className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer flex-shrink-0">
                  <i className="ri-delete-bin-line"></i>
                </button>
              </div>

              <div className="mt-2 pl-2">
                {setting.type === 'toggle' && (
                  <button
                    onClick={() => updateSetting(setting, { value: setting.value === '1' ? '0' : '1' })}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${setting.value === '1' ? 'bg-accent-500' : 'bg-background-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background-50 transition-transform ${setting.value === '1' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                )}
                {(setting.type === 'text' || setting.type === 'number') && (
                  <input
                    type={setting.type}
                    value={setting.value || ''}
                    onChange={(e) => updateSetting(setting, { value: e.target.value })}
                    placeholder="Valeur par défaut"
                    className="w-full px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                  />
                )}
                {setting.type === 'select' && (
                  <div className="space-y-1.5">
                    {(setting.options || []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const next = [...(setting.options || [])];
                            next[oi] = e.target.value;
                            updateSetting(setting, { options: next });
                          }}
                          placeholder={`Option ${oi + 1}`}
                          className="flex-1 px-2 py-1 border border-background-200/70 rounded text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                        />
                        <button
                          onClick={() => updateSetting(setting, { options: (setting.options || []).filter((_, i) => i !== oi) })}
                          className="w-6 h-6 rounded flex items-center justify-center text-foreground-400 hover:text-red-500 cursor-pointer"
                        >
                          <i className="ri-close-line text-sm"></i>
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => updateSetting(setting, { options: [...(setting.options || []), ''] })}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-primary-600 hover:bg-primary-50 cursor-pointer"
                    >
                      <i className="ri-add-line"></i>
                      Ajouter une option
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}