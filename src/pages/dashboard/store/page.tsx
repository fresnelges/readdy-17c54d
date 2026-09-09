import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function StorePage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    nomcommerce: user?.nomcommerce || '',
    description: user?.description || '',
    aboutus: user?.aboutus || '',
    telephone: user?.telephone || '',
    adresse: user?.adresse || '',
    pays: user?.['Pays'] || '',
    ville: user?.['Ville'] || '',
    monaie: user?.monaie || 'MAD',
    langue: user?.langue || 'fr',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          nomcommerce: form.nomcommerce,
          description: form.description,
          aboutus: form.aboutus,
          telephone: form.telephone,
          adresse: form.adresse,
          Pays: form.pays,
          Ville: form.ville,
          monaie: form.monaie,
          langue: form.langue,
        })
        .eq('id', user.id);

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Ma boutique</h2>
        <p className="text-sm text-foreground-500 mt-1">Personnalisez les informations de votre boutique</p>
      </div>

      <div className="max-w-2xl">
        {/* Store info form */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 md:p-6 mb-4">
          <h3 className="text-sm font-semibold text-foreground-700 mb-4 flex items-center gap-2">
            <i className="ri-store-2-line text-primary-500"></i>
            Informations générales
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1.5">Nom de la boutique</label>
              <input
                type="text"
                value={form.nomcommerce}
                onChange={(e) => handleChange('nomcommerce', e.target.value)}
                className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1.5">Description courte</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors resize-none"
              />
              <div className="text-xs text-foreground-400 mt-1">{(form.description || '').length}/500</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1.5">À propos</label>
              <textarea
                value={form.aboutus}
                onChange={(e) => handleChange('aboutus', e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors resize-none"
              />
              <div className="text-xs text-foreground-400 mt-1">{(form.aboutus || '').length}/500</div>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 md:p-6 mb-4">
          <h3 className="text-sm font-semibold text-foreground-700 mb-4 flex items-center gap-2">
            <i className="ri-phone-line text-accent-500"></i>
            Contact
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1.5">Téléphone</label>
              <input
                type="text"
                value={form.telephone}
                onChange={(e) => handleChange('telephone', e.target.value)}
                className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1.5">Adresse</label>
              <input
                type="text"
                value={form.adresse}
                onChange={(e) => handleChange('adresse', e.target.value)}
                className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1.5">Pays</label>
              <input
                type="text"
                value={form.pays}
                onChange={(e) => handleChange('pays', e.target.value)}
                className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1.5">Ville</label>
              <input
                type="text"
                value={form.ville}
                onChange={(e) => handleChange('ville', e.target.value)}
                className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 md:p-6 mb-4">
          <h3 className="text-sm font-semibold text-foreground-700 mb-4 flex items-center gap-2">
            <i className="ri-settings-3-line text-secondary-700"></i>
            Préférences
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1.5">Devise</label>
              <select
                value={form.monaie}
                onChange={(e) => handleChange('monaie', e.target.value)}
                className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors cursor-pointer"
              >
                <option value="MAD">MAD - Dirham marocain</option>
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - Dollar US</option>
                <option value="XOF">XOF - Franc CFA</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1.5">Langue</label>
              <select
                value={form.langue}
                onChange={(e) => handleChange('langue', e.target.value)}
                className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors cursor-pointer"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? (
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
          {saved && (
            <span className="text-sm text-accent-600 flex items-center gap-1">
              <i className="ri-checkbox-circle-line"></i>
              Sauvegardé !
            </span>
          )}
        </div>
      </div>
    </div>
  );
}