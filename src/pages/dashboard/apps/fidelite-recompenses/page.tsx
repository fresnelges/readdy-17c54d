import { useState, useEffect } from 'react';

export default function FideliteRecompensesPage() {
  const [enabled, setEnabled] = useState(false);
  const [tier, setTier] = useState<'basic' | 'premium'>('basic');

  useEffect(() => {
    const saved = localStorage.getItem('fidelite_recompenses_config');
    if (saved) {
      try {
        const cfg = JSON.parse(saved);
        setEnabled(cfg.enabled || false);
        setTier(cfg.tier || 'basic');
      } catch { /* ignore */ }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('fidelite_recompenses_config', JSON.stringify({ enabled, tier }));
  };

  const features = {
    basic: ['Points par achat (1 MAD = 1 point)', 'Réductions à partir de 100 points', 'Email de bienvenue', 'Historique des points'],
    premium: ['Tout le plan Basic', 'Cartes cadeaux', 'Programme de parrainage', 'Offres anniversaire', 'Statistiques avancées', 'Segmentation clients'],
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
          <i className="ri-vip-crown-line mr-2 text-amber-500"></i>
          Fidélité & Récompenses
        </h2>
        <p className="text-sm text-foreground-500 mt-1">Programme de fidélité avancé · 179 MAD</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic */}
        <div className={`bg-background-50 border rounded-lg p-6 ${tier === 'basic' ? 'border-primary-300 ring-2 ring-primary-100' : 'border-background-200/70'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold font-heading text-foreground-950">Basic</h3>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-background-100 text-foreground-600">Inclus</span>
          </div>
          <ul className="space-y-2 mb-6">
            {features.basic.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-foreground-700">
                <i className="ri-check-line text-accent-500"></i>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => { setTier('basic'); handleSave(); }}
            className={`w-full py-2.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              tier === 'basic' ? 'bg-primary-500 text-background-50' : 'bg-background-100 text-foreground-600 hover:bg-background-200/70'
            }`}
          >
            {tier === 'basic' ? 'Actif' : 'Choisir Basic'}
          </button>
        </div>

        {/* Premium */}
        <div className={`bg-background-50 border rounded-lg p-6 ${tier === 'premium' ? 'border-primary-300 ring-2 ring-primary-100' : 'border-background-200/70'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold font-heading text-foreground-950">Premium</h3>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-500 text-background-50">179 MAD</span>
          </div>
          <ul className="space-y-2 mb-6">
            {features.premium.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-foreground-700">
                <i className="ri-check-line text-accent-500"></i>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => { setTier('premium'); handleSave(); }}
            className={`w-full py-2.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              tier === 'premium' ? 'bg-primary-500 text-background-50' : 'bg-background-100 text-foreground-600 hover:bg-background-200/70'
            }`}
          >
            {tier === 'premium' ? 'Actif' : 'Passer à Premium'}
          </button>
        </div>
      </div>
    </div>
  );
}