import { useState } from 'react';

export default function AIShopperPage() {
  const [welcomeMessage, setWelcomeMessage] = useState('Bonjour ! Je suis votre assistant shopping. Posez-moi vos questions sur nos produits !');
  const [enabled, setEnabled] = useState(false);
  const [position, setPosition] = useState<'right' | 'left'>('right');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem('ai_shopper_config', JSON.stringify({ welcomeMessage, enabled, position }));
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
          <i className="ri-robot-2-line mr-2 text-primary-500"></i>
          AI Shopper Assistant
        </h2>
        <p className="text-sm text-foreground-500 mt-1">Assistant IA qui répond aux questions des visiteurs sur votre site</p>
      </div>

      <div className="space-y-6">
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground-800">Activer l assistant</h3>
              <p className="text-xs text-foreground-500">Affiche le chat IA sur votre site public</p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${enabled ? 'bg-accent-500' : 'bg-background-200'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <label className="block text-sm font-semibold text-foreground-800 mb-2">Message d accueil</label>
          <textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={3}
            maxLength={300}
            className="w-full px-4 py-3 bg-background-50 border border-background-200/70 rounded-lg text-sm resize-none focus:outline-none focus:border-primary-300"
          />
        </div>

        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <label className="block text-sm font-semibold text-foreground-800 mb-3">Position</label>
          <div className="flex items-center gap-1 bg-background-100 rounded-full p-1 w-fit">
            {(['right', 'left'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPosition(p)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer ${position === p ? 'bg-background-50 shadow-sm text-foreground-900' : 'text-foreground-500'}`}
              >
                {p === 'right' ? 'Droite' : 'Gauche'}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-background-100 border border-background-200/70 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-foreground-700 mb-3">Prévisualisation</h4>
          <div className="bg-background-50 rounded-lg border border-background-200/70 p-4 max-w-sm">
            <div className="flex items-start gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <i className="ri-robot-2-line text-xs text-primary-600"></i>
              </div>
              <div className="bg-background-100 rounded-lg px-3 py-2 text-xs text-foreground-700">
                {welcomeMessage}
              </div>
            </div>
            <div className="flex items-start gap-2 justify-end">
              <div className="bg-primary-50 rounded-lg px-3 py-2 text-xs text-foreground-700">
                Avez-vous ce produit en rouge ?
              </div>
              <div className="w-7 h-7 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                <i className="ri-user-line text-xs text-accent-600"></i>
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-primary-500 text-background-50 rounded-full text-sm font-bold cursor-pointer hover:bg-primary-600 disabled:opacity-50 transition-colors">
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}