import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function WhatsAppButtonPage() {
  const { user } = useAuth();
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Bonjour ! Je suis intéressé par vos produits.');
  const [position, setPosition] = useState<'right' | 'left'>('right');
  const [showOnMobile, setShowOnMobile] = useState(true);
  const [showOnDesktop, setShowOnDesktop] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('whatsapp_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setWhatsappNumber(config.number || '');
        setWelcomeMessage(config.message || 'Bonjour ! Je suis intéressé par vos produits.');
        setPosition(config.position || 'right');
        setShowOnMobile(config.showOnMobile ?? true);
        setShowOnDesktop(config.showOnDesktop ?? true);
      } catch { /* ignore */ }
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const config = {
      number: whatsappNumber,
      message: welcomeMessage,
      position,
      showOnMobile,
      showOnDesktop,
    };
    localStorage.setItem('whatsapp_config', JSON.stringify(config));
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const getPreviewUrl = () => {
    if (!whatsappNumber) return '#';
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(welcomeMessage);
    return `https://wa.me/${cleanNumber}?text=${encoded}`;
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
          <i className="ri-whatsapp-line mr-2 text-accent-600"></i>
          Bouton WhatsApp
        </h2>
        <p className="text-sm text-foreground-500 mt-1">
          Configurez le bouton WhatsApp qui apparaîtra sur votre site public
        </p>
      </div>

      <div className="space-y-6">
        {/* WhatsApp Number */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <label className="block text-sm font-semibold text-foreground-800 mb-2">
            Numéro WhatsApp
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-foreground-400">+</span>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="212600000000"
              className="w-full pl-8 pr-4 py-3 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300"
            />
          </div>
          <p className="text-xs text-foreground-400 mt-1.5">
            Entrez votre numéro avec l indicatif pays (ex: 212600000000 pour le Maroc)
          </p>
        </div>

        {/* Welcome Message */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <label className="block text-sm font-semibold text-foreground-800 mb-2">
            Message de bienvenue
          </label>
          <textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 resize-none"
          />
          <p className="text-xs text-foreground-400 mt-1.5">
            {welcomeMessage.length}/500 caractères. Ce message sera pré-rempli quand un visiteur cliquera sur le bouton.
          </p>
        </div>

        {/* Position */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <label className="block text-sm font-semibold text-foreground-800 mb-3">
            Position du bouton
          </label>
          <div className="flex items-center gap-1 bg-background-100 rounded-full p-1 w-fit">
            <button
              onClick={() => setPosition('right')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                position === 'right' ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'
              }`}
            >
              <i className="ri-layout-right-line mr-1.5"></i>
              Droite
            </button>
            <button
              onClick={() => setPosition('left')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                position === 'left' ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'
              }`}
            >
              <i className="ri-layout-left-line mr-1.5"></i>
              Gauche
            </button>
          </div>
        </div>

        {/* Visibility */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <label className="block text-sm font-semibold text-foreground-800 mb-3">
            Visibilité
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnDesktop}
                onChange={(e) => setShowOnDesktop(e.target.checked)}
                className="w-4 h-4 rounded border-background-300 text-primary-500 focus:ring-primary-400"
              />
              <span className="text-sm text-foreground-700">Afficher sur desktop</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnMobile}
                onChange={(e) => setShowOnMobile(e.target.checked)}
                className="w-4 h-4 rounded border-background-300 text-primary-500 focus:ring-primary-400"
              />
              <span className="text-sm text-foreground-700">Afficher sur mobile</span>
            </label>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-background-100 border border-background-200/70 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-foreground-700 mb-3 flex items-center gap-2">
            <i className="ri-eye-line"></i>
            Prévisualisation
          </h4>
          <div className="relative h-48 bg-background-50 rounded-lg border border-background-200/70 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs text-foreground-400">Aperçu du site</p>
            </div>
            <a
              href={getPreviewUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={`absolute bottom-4 ${position === 'right' ? 'right-4' : 'left-4'} w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 transition-all cursor-pointer`}
            >
              <i className="ri-whatsapp-line text-xl"></i>
            </a>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !whatsappNumber}
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