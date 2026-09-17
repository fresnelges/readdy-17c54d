import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { isValidPixelId, loadPixel, trackEvent } from '@/lib/facebookPixel';
import EventCounter from './components/EventCounter';

type TestStatus = 'idle' | 'running' | 'success' | 'error';

export default function FacebookPixelPage() {
  const { user } = useAuth();
  const [pixelId, setPixelId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const formatError = pixelId.trim() !== '' && !isValidPixelId(pixelId);

  const fetchConfig = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('facebook_pixel_config')
        .select('pixel_id, enabled')
        .eq('idcommerce', user.id)
        .maybeSingle();

      if (data) {
        setPixelId(data.pixel_id || '');
        setEnabled(data.enabled ?? true);
      }
    } catch {
      // On laisse les valeurs par défaut en cas d'échec de lecture.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    if (!user) return;
    if (!pixelId.trim()) {
      setSaveError('Veuillez renseigner un Pixel ID.');
      return;
    }
    if (!isValidPixelId(pixelId)) {
      setSaveError('Le Pixel ID doit contenir 15 ou 16 chiffres.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const { error } = await supabase
        .from('facebook_pixel_config')
        .upsert(
          {
            idcommerce: user.id,
            pixel_id: pixelId.trim(),
            enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'idcommerce' }
        );

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError('Impossible d\u2019enregistrer la configuration. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!pixelId.trim()) {
      setTestStatus('error');
      setTestMessage('Renseignez d\u2019abord un Pixel ID.');
      return;
    }
    if (!isValidPixelId(pixelId)) {
      setTestStatus('error');
      setTestMessage('Pixel ID invalide : il doit contenir 15 ou 16 chiffres.');
      return;
    }

    setTestStatus('running');
    setTestMessage('Chargement du script Facebook Pixel...');

    // Charge réellement le script fbevents.js, fait l'init et envoie un
    // événement de test (identique au bouton « Tester » de Meta).
    const ok = loadPixel(pixelId);
    trackEvent('PageView');

    await new Promise((r) => setTimeout(r, 1200));

    if (ok) {
      setTestStatus('success');
      setTestMessage('Pixel chargé et événement de test envoyé. Vérifiez-le dans Facebook Events Manager.');
    } else {
      setTestStatus('error');
      setTestMessage('Impossible de charger le pixel. Vérifiez votre Pixel ID.');
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
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
          <i className="ri-facebook-circle-line mr-2 text-accent-600"></i>
          Facebook Pixel
        </h2>
        <p className="text-sm text-foreground-500 mt-1">
          Installez le pixel Facebook sur votre site pour suivre les conversions et créer des audiences publicitaires
        </p>
      </div>

      <div className="space-y-6">
        {/* Statut */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground-800">Statut du Pixel</h3>
              <p className="text-xs text-foreground-500 mt-0.5">
                {enabled
                  ? 'Le pixel est actif et sera injecté sur votre site public.'
                  : 'Le pixel est désactivé : aucun suivi ne sera effectué.'}
              </p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                enabled ? 'bg-accent-500' : 'bg-background-200'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Pixel ID */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <label className="block text-sm font-semibold text-foreground-800 mb-2">
            Facebook Pixel ID
          </label>
          <input
            type="text"
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value.replace(/\D/g, ''))}
            placeholder="1234567890123456"
            maxLength={16}
            className={`w-full px-4 py-3 bg-background-100 border rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none font-mono transition-colors ${
              formatError ? 'border-red-400 focus:border-red-400' : 'border-background-200/70 focus:border-primary-300'
            }`}
          />
          {formatError ? (
            <p className="text-xs text-red-500 mt-1.5">
              Format invalide : le Pixel ID doit contenir 15 ou 16 chiffres.
            </p>
          ) : (
            <p className="text-xs text-foreground-400 mt-1.5">
              Trouvez votre Pixel ID dans Facebook Events Manager.
            </p>
          )}
        </div>

        {/* Événements suivis */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-foreground-700 mb-3">Événements suivis automatiquement</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { name: 'PageView', icon: 'ri-eye-line', desc: 'Chaque page visitée', active: true },
              { name: 'ViewContent', icon: 'ri-file-search-line', desc: 'Page produits consultée', active: true },
              { name: 'Lead', icon: 'ri-user-add-line', desc: 'Formulaire soumis', active: true },
            ].map((event) => (
              <div key={event.name} className="flex items-start gap-3 p-3 bg-background-100 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-background-50 flex items-center justify-center flex-shrink-0">
                  <i className={`${event.icon} text-sm text-foreground-500`}></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground-800">{event.name}</p>
                  <p className="text-xs text-foreground-500">{event.desc}</p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-700 font-medium whitespace-nowrap h-fit">
                  actif
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-foreground-400 mt-3">
            Les événements <strong>AddToCart</strong>, <strong>Purchase</strong> et <strong>Search</strong> seront
            suivis automatiquement dès que les fonctionnalités de panier et de recherche seront actives sur votre site.
          </p>
        </div>

        {/* Compteur d'événements captés */}
        <EventCounter storeId={user.id} />

        {/* Test */}
        {pixelId.trim() && (
          <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
            <h4 className="text-sm font-semibold text-foreground-700 mb-3">Test de connexion</h4>
            <button
              onClick={handleTest}
              disabled={testStatus === 'running'}
              className="px-4 py-2.5 bg-background-100 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-background-200/70 transition-colors disabled:opacity-50"
            >
              <i className="ri-radar-line mr-1.5"></i>
              Tester le pixel
            </button>
            {testMessage && (
              <p className={`mt-3 text-sm flex items-start gap-2 ${
                testStatus === 'success' ? 'text-accent-600'
                : testStatus === 'error' ? 'text-red-500'
                : 'text-foreground-500'
              }`}>
                <i className={`${
                  testStatus === 'success' ? 'ri-checkbox-circle-line'
                  : testStatus === 'error' ? 'ri-error-warning-line'
                  : 'ri-loader-4-line animate-spin'
                } mt-0.5`}></i>
                <span>{testMessage}</span>
              </p>
            )}
          </div>
        )}

        {/* Sauvegarde */}
        {saveError && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 text-sm rounded-lg">
            <i className="ri-error-warning-line"></i>
            {saveError}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-background-50 rounded-full text-sm font-bold whitespace-nowrap cursor-pointer hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                Enregistrement...
              </>
            ) : (
              <>
                <i className="ri-check-line"></i>
                Enregistrer
              </>
            )}
          </button>
          {saved && (
            <span className="text-sm text-accent-600 flex items-center gap-1">
              <i className="ri-checkbox-circle-line"></i>
              Configuration sauvegardée !
            </span>
          )}
        </div>
      </div>
    </div>
  );
}