import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function PayPalPage() {
  const { user } = useAuth();
  const [clientId, setClientId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<'sandbox' | 'live'>('sandbox');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('paypal_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setClientId(config.clientId || '');
        setEnabled(config.enabled ?? false);
        setMode(config.mode || 'sandbox');
      } catch { /* ignore */ }
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem('paypal_config', JSON.stringify({ clientId, enabled, mode }));
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
          <i className="ri-paypal-line mr-2 text-blue-600"></i>
          PayPal
        </h2>
        <p className="text-sm text-foreground-500 mt-1">
          Acceptez les paiements par PayPal sur votre boutique en ligne
        </p>
      </div>

      <div className="space-y-6">
        {/* Enable */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground-800">Activer PayPal</h3>
              <p className="text-xs text-foreground-500 mt-0.5">Afficher PayPal comme option de paiement</p>
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

        {/* Mode */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <label className="block text-sm font-semibold text-foreground-800 mb-3">Mode</label>
          <div className="flex items-center gap-1 bg-background-100 rounded-full p-1 w-fit">
            <button
              onClick={() => setMode('sandbox')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                mode === 'sandbox' ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500'
              }`}
            >
              <i className="ri-flask-line mr-1.5"></i>Sandbox (Test)
            </button>
            <button
              onClick={() => setMode('live')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                mode === 'live' ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500'
              }`}
            >
              <i className="ri-global-line mr-1.5"></i>Production
            </button>
          </div>
        </div>

        {/* Client ID */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <label className="block text-sm font-semibold text-foreground-800 mb-2">
            PayPal Client ID
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Votre Client ID PayPal"
            className="w-full px-4 py-3 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 font-mono"
          />
          <p className="text-xs text-foreground-400 mt-1.5">
            Obtenez votre Client ID depuis le PayPal Developer Dashboard
          </p>
        </div>

        {/* Info */}
        <div className="bg-background-100 border border-background-200/70 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-foreground-700 mb-2">Comment ça marche</h4>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Créez un compte PayPal Business et obtenez votre Client ID' },
              { step: '2', text: 'Entrez votre Client ID ci-dessus et activez PayPal' },
              { step: '3', text: 'PayPal apparaîtra comme option de paiement sur votre boutique' },
              { step: '4', text: 'Les paiements sont traités de manière sécurisée par PayPal' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-background-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-foreground-600">{item.step}</span>
                </div>
                <p className="text-sm text-foreground-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

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
            <span className="text-sm text-accent-600 flex items-center gap-1">
              <i className="ri-check-line"></i>
              Configuration sauvegardée !
            </span>
          )}
        </div>
      </div>
    </div>
  );
}