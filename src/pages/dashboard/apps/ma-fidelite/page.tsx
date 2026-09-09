import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function MaFidelitePage() {
  const { user } = useAuth();
  const [pointsPerOrder, setPointsPerOrder] = useState(10);
  const [pointsValue, setPointsValue] = useState(100);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ma_fidelite_config');
    if (saved) {
      try {
        const cfg = JSON.parse(saved);
        setPointsPerOrder(cfg.pointsPerOrder || 10);
        setPointsValue(cfg.pointsValue || 100);
        setEnabled(cfg.enabled || false);
      } catch { /* ignore */ }
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem('ma_fidelite_config', JSON.stringify({ pointsPerOrder, pointsValue, enabled }));
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
          <i className="ri-heart-line mr-2 text-red-400"></i>
          Ma Fidélité
        </h2>
        <p className="text-sm text-foreground-500 mt-1">Programme de fidélité simplifié pour récompenser vos clients</p>
      </div>

      <div className="space-y-6">
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground-800">Activer le programme</h3>
              <p className="text-xs text-foreground-500">Les clients cumuleront des points à chaque commande</p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                enabled ? 'bg-accent-500' : 'bg-background-200'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {enabled && (
            <div className="space-y-4 pt-4 border-t border-background-200/70">
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-2">Points par commande</label>
                <input
                  type="number"
                  value={pointsPerOrder}
                  onChange={(e) => setPointsPerOrder(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-2">Points pour 1 MAD de remise</label>
                <input
                  type="number"
                  value={pointsValue}
                  onChange={(e) => setPointsValue(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm"
                />
                <p className="text-xs text-foreground-400 mt-1">{pointsValue} points = 1 MAD de réduction</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-primary-500 text-background-50 rounded-full text-sm font-bold cursor-pointer hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}