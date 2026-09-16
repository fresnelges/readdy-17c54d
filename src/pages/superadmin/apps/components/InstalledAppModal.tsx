import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { InstalledApp } from './InstalledAppsTab';

interface InstalledAppModalProps {
  inst: InstalledApp;
  commerceName: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function InstalledAppModal({ inst, commerceName, onClose, onSaved }: InstalledAppModalProps) {
  const [nompage, setNompage] = useState(inst.nompage || '');
  const [prix, setPrix] = useState(String(inst.prix || 0));
  const [status, setStatus] = useState(inst.status === 1);
  const [contenu, setContenu] = useState(inst.contenu || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('appvendeur')
        .update({
          nompage: nompage.trim(),
          prix: parseInt(prix, 10) || 0,
          status: status ? 1 : 0,
          contenu,
        })
        .eq('id', inst.id);
      if (updateError) throw updateError;
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background-50 rounded-lg border border-background-200/70 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground-950">Détails de l'installation</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer">
            <i className="ri-close-line text-foreground-500"></i>
          </button>
        </div>

        {/* Read-only info */}
        <div className="p-4 rounded-lg bg-background-100/60 border border-background-200/70 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground-900">{inst.nomapp}</span>
            <span className="text-[11px] text-foreground-400">#{inst.id}</span>
          </div>
          <p className="text-xs text-foreground-500">
            Commerçant : <span className="font-medium text-foreground-700">{commerceName}</span>
          </p>
        </div>

        <div className="space-y-4">
          {/* Page slug */}
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">Slug de page</label>
            <input
              type="text"
              value={nompage}
              onChange={(e) => setNompage(e.target.value)}
              placeholder="nom-de-page"
              className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">Prix (MAD)</label>
            <input
              type="number"
              min="0"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
            />
          </div>

          {/* Status */}
          <div className="flex items-center justify-between rounded-md border border-background-200/70 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground-800">Activée</p>
              <p className="text-[11px] text-foreground-400">Visible et active pour ce commerçant</p>
            </div>
            <button
              onClick={() => setStatus((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${status ? 'bg-accent-500' : 'bg-background-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background-50 transition-transform ${status ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Contenu */}
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">Contenu / Configuration</label>
            <textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              rows={5}
              placeholder="Configuration de l'application..."
              className="w-full px-3 py-2 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200/60 text-red-600 text-xs">
              <i className="ri-error-warning-line flex-shrink-0"></i>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-full text-sm font-medium text-foreground-600 hover:text-foreground-800 transition-colors cursor-pointer whitespace-nowrap">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-foreground-950 text-background-50 whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-save-line"></i>}
            Enregistrer
          </button>
        </div>
      </div>
    </>
  );
}