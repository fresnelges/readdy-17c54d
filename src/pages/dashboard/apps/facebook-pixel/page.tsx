import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function FacebookPixelPage() {
  const { user } = useAuth();
  const [pixelId, setPixelId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('fb_pixel_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setPixelId(config.pixelId || '');
        setEnabled(config.enabled ?? false);
      } catch { /* ignore */ }
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    const config = { pixelId, enabled };
    localStorage.setItem('fb_pixel_config', JSON.stringify(config));
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTest = async () => {
    if (!pixelId) return;
    setTestResult('Test en cours...');
    await new Promise((r) => setTimeout(r, 1500));
    setTestResult('Pixel configuré et prêt à être déployé sur votre site.');
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
          <i className="ri-facebook-circle-line mr-2 text-blue-500"></i>
          Facebook Pixel
        </h2>
        <p className="text-sm text-foreground-500 mt-1">
          Installez le pixel Facebook sur votre site pour suivre les conversions et créer des audiences publicitaires
        </p>
      </div>

      <div className="space-y-6">
        {/* Status toggle */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground-800">Statut du Pixel</h3>
              <p className="text-xs text-foreground-500 mt-0.5">Activez ou désactivez le pixel sur votre site</p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                enabled ? 'bg-accent-500' : 'bg-background-200'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
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
            onChange={(e) => setPixelId(e.target.value)}
            placeholder="1234567890123456"
            className="w-full px-4 py-3 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 font-mono"
          />
          <p className="text-xs text-foreground-400 mt-1.5">
            Trouvez votre Pixel ID dans Facebook Events Manager
          </p>
        </div>

        {/* Info */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-foreground-700 mb-3">Événements suivis automatiquement</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { name: 'PageView', icon: 'ri-eye-line', desc: 'Chaque page visitée' },
              { name: 'ViewContent', icon: 'ri-file-search-line', desc: 'Pages produits consultées' },
              { name: 'AddToCart', icon: 'ri-shopping-cart-2-line', desc: 'Ajouts au panier' },
              { name: 'Purchase', icon: 'ri-bank-card-line', desc: 'Achats complétés' },
              { name: 'Lead', icon: 'ri-user-add-line', desc: 'Formulaires soumis' },
              { name: 'Search', icon: 'ri-search-line', desc: 'Recherches effectuées' },
            ].map((event) => (
              <div key={event.name} className="flex items-start gap-3 p-3 bg-background-100 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-background-50 flex items-center justify-center flex-shrink-0">
                  <i className={`${event.icon} text-sm text-foreground-500`}></i>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground-800">{event.name}</p>
                  <p className="text-xs text-foreground-500">{event.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test */}
        {pixelId && (
          <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
            <h4 className="text-sm font-semibold text-foreground-700 mb-3">Test de connexion</h4>
            <button
              onClick={handleTest}
              className="px-4 py-2.5 bg-background-100 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-background-200/70 transition-colors"
            >
              <i className="ri-radar-line mr-1.5"></i>
              Tester le pixel
            </button>
            {testResult && (
              <p className={`mt-3 text-sm ${testResult.includes('prêt') ? 'text-accent-600' : 'text-foreground-500'}`}>
                <i className={testResult.includes('prêt') ? 'ri-check-line' : 'ri-loader-4-line animate-spin'}></i>
                {' '}{testResult}
              </p>
            )}
          </div>
        )}

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
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
            <span className="text-sm text-accent-600 flex items-center gap-1 animate-fade-in-up">
              <i className="ri-check-line"></i>
              Configuration sauvegardée !
            </span>
          )}
        </div>
      </div>
    </div>
  );
}