import { useState, useEffect } from 'react';
import { useHomepageContent } from '@/hooks/useHomepageContent';
import {
  SECTION_KEYS,
  SECTION_LABELS,
  DEFAULT_HOMEPAGE_CONTENT,
  type HomepageContent,
  type SectionKey,
} from '@/lib/homepageContent';
import HeroEditor from './components/HeroEditor';
import StatsEditor from './components/StatsEditor';
import FeaturesEditor from './components/FeaturesEditor';
import HowItWorksEditor from './components/HowItWorksEditor';
import TestimonialsEditor from './components/TestimonialsEditor';
import PricingEditor from './components/PricingEditor';
import FaqEditor from './components/FaqEditor';
import CtaEditor from './components/CtaEditor';
import FooterEditor from './components/FooterEditor';

export default function SuperAdminHomepagePage() {
  const { content, loading, saving, error, save } = useHomepageContent();
  const [draft, setDraft] = useState<HomepageContent>(content);
  const [activeSection, setActiveSection] = useState<SectionKey>('hero');
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState<SectionKey | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  useEffect(() => {
    setDraft(content);
  }, [content]);

  const updateDraft = <K extends SectionKey>(key: K, value: HomepageContent[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    const ok = await save(draft);
    if (ok) {
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  // Annule automatiquement la demande de confirmation après quelques secondes
  useEffect(() => {
    if (!confirmReset && !confirmResetAll) return;
    const t = setTimeout(() => {
      setConfirmReset(null);
      setConfirmResetAll(false);
    }, 5000);
    return () => clearTimeout(t);
  }, [confirmReset, confirmResetAll]);

  const resetSection = (key: SectionKey) => {
    const defaultValue = DEFAULT_HOMEPAGE_CONTENT[key];
    const clone = JSON.parse(JSON.stringify(defaultValue)) as HomepageContent[SectionKey];
    setDraft((prev) => ({ ...prev, [key]: clone }));
    setDirty(true);
    setConfirmReset(null);
  };

  const resetAll = () => {
    const clone = JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE_CONTENT)) as HomepageContent;
    setDraft(clone);
    setDirty(true);
    setConfirmResetAll(false);
  };

  const renderEditor = () => {
    switch (activeSection) {
      case 'hero':
        return <HeroEditor value={draft.hero} onChange={(v) => updateDraft('hero', v)} />;
      case 'stats':
        return <StatsEditor value={draft.stats} onChange={(v) => updateDraft('stats', v)} />;
      case 'features':
        return <FeaturesEditor value={draft.features} onChange={(v) => updateDraft('features', v)} />;
      case 'how_it_works':
        return (
          <HowItWorksEditor
            value={draft.how_it_works}
            onChange={(v) => updateDraft('how_it_works', v)}
          />
        );
      case 'testimonials':
        return (
          <TestimonialsEditor
            value={draft.testimonials}
            onChange={(v) => updateDraft('testimonials', v)}
          />
        );
      case 'pricing':
        return <PricingEditor value={draft.pricing} onChange={(v) => updateDraft('pricing', v)} />;
      case 'faq':
        return <FaqEditor value={draft.faq} onChange={(v) => updateDraft('faq', v)} />;
      case 'cta':
        return <CtaEditor value={draft.cta} onChange={(v) => updateDraft('cta', v)} />;
      case 'footer':
        return <FooterEditor value={draft.footer} onChange={(v) => updateDraft('footer', v)} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950 mb-1">
            Page d&apos;accueil
          </h2>
          <p className="text-sm text-foreground-500">
            Modifiez tout le contenu affiché sur la landing page publique ZIFEK (page /)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {confirmResetAll ? (
            <>
              <span className="text-xs text-red-600 font-medium whitespace-nowrap">
                Tout restaurer par défaut ?
              </span>
              <button
                onClick={resetAll}
                className="h-10 px-4 rounded-full bg-red-600 text-white text-sm font-semibold whitespace-nowrap hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <i className="ri-check-line"></i>
                Oui, tout réinitialiser
              </button>
              <button
                onClick={() => setConfirmResetAll(false)}
                className="h-10 px-4 rounded-full border border-background-200/70 text-sm font-medium text-foreground-500 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                Annuler
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setConfirmResetAll(true);
                setConfirmReset(null);
              }}
              className="h-10 px-4 rounded-full border border-background-200/70 text-sm font-medium text-foreground-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50/60 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <i className="ri-restart-line"></i>
              Tout réinitialiser
            </button>
          )}
          {dirty && (
            <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full font-medium whitespace-nowrap">
              Modifications non enregistrées
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className={`h-10 px-5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-foreground-950 text-background-50 hover:bg-foreground-800'
            }`}
          >
            {saving ? (
              <>
                <i className="ri-loader-4-line animate-spin text-xs"></i>
                Enregistrement...
              </>
            ) : saved ? (
              <>
                <i className="ri-check-line text-xs"></i>
                Enregistré
              </>
            ) : (
              <>
                <i className="ri-save-line text-xs"></i>
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
          <i className="ri-error-warning-line"></i>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-3 mb-5 border-b border-background-200/70">
        {SECTION_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeSection === key
                ? 'bg-foreground-950 text-background-50'
                : 'text-foreground-600 hover:text-foreground-950 hover:bg-background-100'
            }`}
          >
            {SECTION_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Section header with reset button */}
      <div className="max-w-4xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground-950">
            {SECTION_LABELS[activeSection]}
          </h3>
          <p className="text-xs text-foreground-500">
            Modifiez le contenu de cette section
          </p>
        </div>
        {confirmReset === activeSection ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 font-medium whitespace-nowrap">
              Restaurer le contenu par défaut ?
            </span>
            <button
              onClick={() => resetSection(activeSection)}
              className="h-9 px-4 rounded-full bg-red-600 text-white text-xs font-semibold whitespace-nowrap hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <i className="ri-check-line"></i>
              Oui, réinitialiser
            </button>
            <button
              onClick={() => setConfirmReset(null)}
              className="h-9 px-4 rounded-full border border-background-200/70 text-xs font-medium text-foreground-500 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(activeSection)}
            className="h-9 px-4 rounded-full border border-background-200/70 text-xs font-medium text-foreground-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50/60 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 self-start sm:self-auto"
          >
            <i className="ri-restart-line"></i>
            Réinitialiser aux valeurs par défaut
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="max-w-4xl">{renderEditor()}</div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 mt-8 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background-50/95 backdrop-blur-md border-t border-background-200/70">
        <div className="flex items-center justify-end gap-3">
          {dirty && (
            <span className="text-xs text-foreground-400">
              Pensez à enregistrer vos changements
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="h-10 px-6 rounded-full bg-foreground-950 text-background-50 text-sm font-semibold whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <i className="ri-loader-4-line animate-spin text-xs"></i>
                Enregistrement...
              </>
            ) : saved ? (
              <>
                <i className="ri-check-line text-xs"></i>
                Enregistré
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}