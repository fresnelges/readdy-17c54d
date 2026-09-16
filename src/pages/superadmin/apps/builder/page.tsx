import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import PagesPanel from './components/PagesPanel';
import FormsPanel from './components/FormsPanel';
import DataPanel from './components/DataPanel';
import SettingsPanel from './components/SettingsPanel';
import AiBuilderModal from './components/AiBuilderModal';
import ImportModal from './components/ImportModal';
import AppPreviewPanel from './components/AppPreviewPanel';
import VersionsPanel from './components/VersionsPanel';
import { exportAppToZip } from './exportApp';

type Tab = 'preview' | 'pages' | 'forms' | 'data' | 'versions' | 'settings';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'preview', label: 'Aperçu', icon: 'ri-eye-line' },
  { key: 'pages', label: 'Pages', icon: 'ri-pages-line' },
  { key: 'forms', label: 'Formulaires', icon: 'ri-survey-line' },
  { key: 'data', label: 'Données', icon: 'ri-database-2-line' },
  { key: 'versions', label: 'Versions', icon: 'ri-git-branch-line' },
  { key: 'settings', label: 'Réglages', icon: 'ri-settings-3-line' },
];

interface AppInfo {
  id: number;
  nom: string;
  nompage: string;
}

export default function AppBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const appId = id ? parseInt(id, 10) : NaN;
  const navigate = useNavigate();

  const [app, setApp] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('preview');
  const [aiOpen, setAiOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!appId || isNaN(appId)) {
      setError('Application introuvable.');
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('appstore')
          .select('id, nom, nompage')
          .eq('id', appId)
          .maybeSingle();
        if (fetchError) throw fetchError;
        if (!data) {
          setError('Application introuvable.');
        } else {
          setApp(data as AppInfo);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [appId]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportAppToZip(appId);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <i className="ri-error-warning-line text-4xl text-foreground-300 mb-3"></i>
        <p className="text-foreground-500 text-sm mb-4">{error || 'Application introuvable'}</p>
        <button
          onClick={() => navigate('/superadmin/apps')}
          className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap"
        >
          Retour aux apps
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/superadmin/apps')}
            className="w-9 h-9 rounded-full border border-background-200/70 flex items-center justify-center text-foreground-500 hover:text-foreground-800 hover:bg-background-100 transition-colors cursor-pointer flex-shrink-0"
            title="Retour"
          >
            <i className="ri-arrow-left-line"></i>
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">{app.nom}</h2>
            <p className="text-sm text-foreground-500 mt-0.5">
              Builder d'application · page <span className="font-medium text-foreground-700">/dashboard/{app.nompage}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-background-200/70 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-100 transition-colors cursor-pointer"
          >
            <i className="ri-upload-2-line"></i>
            Importer
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 border border-background-200/70 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <i className={exporting ? 'ri-loader-4-line animate-spin' : 'ri-download-2-line'}></i>
            {exporting ? 'Export…' : 'Exporter'}
          </button>
          <button
            onClick={() => setAiOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 transition-colors cursor-pointer"
          >
            <i className="ri-sparkling-2-line"></i>
            Générer avec l'IA
          </button>
          <button
            onClick={() => setTab('versions')}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent-600 transition-colors cursor-pointer"
          >
            <i className="ri-rocket-2-line"></i>
            Publier
          </button>
          <a
            href={`/dashboard/${app.nompage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-foreground-950 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer"
          >
            <i className="ri-eye-line"></i>
            Prévisualiser
          </a>
        </div>
      </div>

      {exportError && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-5">
          <i className="ri-error-warning-line"></i>
          {exportError}
          <button onClick={() => setExportError(null)} className="ml-auto text-red-500 hover:text-red-700 cursor-pointer" title="Fermer">
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-background-100 rounded-full p-1 w-fit mb-6 overflow-x-auto max-w-full">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
              tab === t.key ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'
            }`}
          >
            <i className={t.icon}></i>
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {tab === 'preview' && <AppPreviewPanel appId={appId} nompage={app.nompage} />}
      {tab === 'pages' && <PagesPanel key={refreshKey} appId={appId} nompage={app.nompage} />}
      {tab === 'forms' && <FormsPanel key={refreshKey} appId={appId} />}
      {tab === 'data' && <DataPanel key={refreshKey} appId={appId} />}
      {tab === 'versions' && <VersionsPanel key={refreshKey} appId={appId} />}
      {tab === 'settings' && <SettingsPanel key={refreshKey} appId={appId} />}

      {/* AI builder modal */}
      {aiOpen && (
        <AiBuilderModal
          appId={appId}
          appName={app.nom}
          onClose={() => setAiOpen(false)}
          onBuilt={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {/* Import modal */}
      {importOpen && (
        <ImportModal
          appId={appId}
          appName={app.nom}
          onClose={() => setImportOpen(false)}
          onRestored={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}