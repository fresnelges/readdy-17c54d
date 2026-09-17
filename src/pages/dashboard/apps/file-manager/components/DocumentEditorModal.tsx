import { useState, useEffect, useRef } from 'react';
import {
  docTypeMeta,
  getDocumentRole,
  pdfBase64ToBlob,
  type DocDocument,
  type WordContent,
  type ExcelContent,
  type PowerPointContent,
  type PdfContent,
  type CollabRole,
} from '@/lib/documents';
import {
  exportWordAsDocx,
  exportExcelAsXlsx,
  exportPowerPointAsPptx,
  exportWordAsPdf,
  exportWordAsHtml,
  exportWordAsTxt,
  exportExcelAsCsv,
  exportExcelAsPdf,
  exportPowerPointAsPdf,
} from '@/lib/documentExport';
import WordEditor from './WordEditor';
import ExcelEditor from './ExcelEditor';
import PowerPointEditor from './PowerPointEditor';
import PdfViewer from './PdfViewer';
import ShareModal from './ShareModal';
import HistoryModal from './HistoryModal';

interface DocumentEditorModalProps {
  document: DocDocument;
  saving: boolean;
  currentUser: { id: number; name: string };
  onSave: (content: Record<string, unknown>, name: string) => void;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: (content: Record<string, unknown>, name: string) => Promise<void> | void;
}

interface ExportOption {
  key: string;
  label: string;
  run: () => void | Promise<void>;
}

export default function DocumentEditorModal({
  document,
  saving,
  currentUser,
  onSave,
  onClose,
  onDelete,
  onDuplicate,
}: DocumentEditorModalProps) {
  const [name, setName] = useState(document.name);
  const [content, setContent] = useState<Record<string, unknown>>(document.content || {});
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [role, setRole] = useState<CollabRole | 'owner' | null>(null);
  const [dirty, setDirty] = useState(false);
  const onSaveRef = useRef(onSave);
  const firstRenderRef = useRef(true);

  const isOwner = document.user_id === String(currentUser.id);
  const canEdit = role === 'owner' || role === 'editor';

  useEffect(() => {
    let mounted = true;
    getDocumentRole(document.id, currentUser.id, document.user_id)
      .then((r) => {
        if (mounted) setRole(r);
      })
      .catch(() => {
        if (mounted) setRole(isOwner ? 'owner' : 'viewer');
      });
    return () => {
      mounted = false;
    };
  }, [document.id, currentUser.id, document.user_id, isOwner]);

  const meta = docTypeMeta[document.doc_type] || docTypeMeta.word;

  // Garde toujours la dernière version de onSave à jour (évite les sauvegardes fantômes)
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Sauvegarde avec Ctrl/Cmd + S
  useEffect(() => {
    if (!canEdit) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSave(content, name);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [content, name, onSave, canEdit]);

  // Auto-sauvegarde : dès qu'une modification survient, on enregistre après un court délai
  useEffect(() => {
    if (!canEdit) return;
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    setDirty(true);
    const timer = setTimeout(() => {
      onSaveRef.current(content, name);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1200);
    return () => clearTimeout(timer);
  }, [content, name, canEdit]);

  const handleSave = () => {
    onSave(content, name);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const downloadPdf = () => {
    const pdfBase64 = (content as PdfContent).pdfBase64;
    if (!pdfBase64) return;
    const blob = pdfBase64ToBlob(pdfBase64);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'document'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const buildExportOptions = (): ExportOption[] => {
    if (document.doc_type === 'word') {
      return [
        { key: 'docx', label: 'Word (.docx)', run: () => exportWordAsDocx(name, content as WordContent) },
        { key: 'pdf', label: 'PDF (.pdf)', run: () => exportWordAsPdf(name, content as WordContent) },
        { key: 'html', label: 'HTML (.html)', run: () => exportWordAsHtml(name, content as WordContent) },
        { key: 'txt', label: 'Texte brut (.txt)', run: () => exportWordAsTxt(name, content as WordContent) },
      ];
    }
    if (document.doc_type === 'excel') {
      return [
        { key: 'xlsx', label: 'Excel (.xlsx)', run: () => exportExcelAsXlsx(name, content as ExcelContent) },
        { key: 'pdf', label: 'PDF (.pdf)', run: () => exportExcelAsPdf(name, content as ExcelContent) },
        { key: 'csv', label: 'CSV (.csv)', run: () => exportExcelAsCsv(name, content as ExcelContent) },
      ];
    }
    if (document.doc_type === 'pdf') {
      return [
        { key: 'pdf', label: 'Télécharger (.pdf)', run: () => downloadPdf() },
      ];
    }
    return [
      { key: 'pptx', label: 'PowerPoint (.pptx)', run: () => exportPowerPointAsPptx(name, content as PowerPointContent) },
      { key: 'pdf', label: 'PDF (.pdf)', run: () => exportPowerPointAsPdf(name, content as PowerPointContent) },
    ];
  };

  const runExport = async (opt: ExportOption) => {
    setShowExportMenu(false);
    setExporting(true);
    setExportError(null);
    try {
      await opt.run();
    } catch (err) {
      setExportError(
        err instanceof Error ? `Erreur lors de l'export : ${err.message}` : "Erreur lors de l'export du document",
      );
    }
    setExporting(false);
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      await onDuplicate(content, name);
    } finally {
      setDuplicating(false);
    }
  };

  const handleRestore = async (restoredContent: Record<string, unknown>) => {
    setContent(restoredContent);
    onSave(restoredContent, name);
  };

  const exportOptions = buildExportOptions();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background-50">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-background-200/70 bg-background-50">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <i className={`${meta.icon} text-2xl ${meta.iconClass} flex-shrink-0`}></i>
          <div className="flex flex-col min-w-0">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={!canEdit}
              className="text-base font-semibold text-foreground-950 bg-transparent border-b border-transparent focus:border-primary-300 focus:outline-none w-full"
            />
            <span className="text-xs text-foreground-400">
              {meta.label}
              {!canEdit && ' · Lecture seule'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isOwner && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-foreground-600 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors whitespace-nowrap"
              title="Supprimer le document"
            >
              <i className="ri-delete-bin-line"></i>
              <span className="hidden sm:inline">Supprimer</span>
            </button>
          )}
          {isOwner && (
            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-background-200/70 bg-white text-foreground-700 text-sm font-medium hover:bg-background-100 disabled:opacity-50 cursor-pointer whitespace-nowrap transition-colors"
              title="Dupliquer le document"
            >
              <i className={`ri-${duplicating ? 'loader-4-line animate-spin' : 'file-copy-line'}`}></i>
              <span className="hidden sm:inline">Dupliquer</span>
            </button>
          )}
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-background-200/70 bg-white text-foreground-700 text-sm font-medium hover:bg-background-100 cursor-pointer whitespace-nowrap transition-colors"
            title="Partager avec des membres"
          >
            <i className="ri-share-line"></i>
            <span className="hidden sm:inline">Partager</span>
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-background-200/70 bg-white text-foreground-700 text-sm font-medium hover:bg-background-100 cursor-pointer whitespace-nowrap transition-colors"
            title="Historique des modifications"
          >
            <i className="ri-history-line"></i>
            <span className="hidden sm:inline">Historique</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-background-200/70 bg-white text-foreground-700 text-sm font-medium hover:bg-background-100 disabled:opacity-50 cursor-pointer whitespace-nowrap transition-colors"
              title="Exporter"
            >
              <i className={`ri-${exporting ? 'loader-4-line animate-spin' : 'download-2-line'}`}></i>
              <span className="hidden sm:inline">Exporter</span>
              <i className="ri-arrow-down-s-line text-xs"></i>
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>
                <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-white border border-background-200/70 rounded-lg shadow-lg overflow-hidden">
                  {exportOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => runExport(opt)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground-700 hover:bg-background-50 text-left cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-download-line text-foreground-400"></i>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {canEdit && document.doc_type !== 'pdf' && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap transition-colors"
            >
              <i className={`ri-${saving || dirty ? 'loader-4-line animate-spin' : saved ? 'check-line' : 'save-line'}`}></i>
              {saving ? 'Sauvegarde...' : dirty ? 'Enregistrement...' : saved ? 'Sauvegardé' : 'Sauvegarder'}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 hover:text-foreground-800 cursor-pointer transition-colors"
            title="Fermer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>
      </div>

      {exportError && (
        <div className="flex items-center gap-2 px-5 py-2 bg-red-50 text-red-700 text-sm">
          <i className="ri-error-warning-line"></i>
          {exportError}
          <button onClick={() => setExportError(null)} className="ml-auto cursor-pointer hover:text-red-900">
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* Corps de l'éditeur */}
      <div className="flex-1 overflow-hidden">
        {document.doc_type === 'word' && (
          <WordEditor
            content={content as unknown as WordContent}
            onChange={(c) => setContent(c)}
            readOnly={!canEdit}
            docName={name}
            canManage={isOwner}
            currentUser={currentUser}
            onSave={handleSave}
            onRename={(newName) => setName(newName)}
            onDuplicate={handleDuplicate}
            onDelete={onDelete}
            onClose={onClose}
            onShare={() => setShowShare(true)}
            onHistory={() => setShowHistory(true)}
            onExport={(format) => {
              const option = exportOptions.find((opt) => opt.key === format);
              if (option) void runExport(option);
            }}
          />
        )}
        {document.doc_type === 'excel' && (
          <ExcelEditor
            content={content as unknown as ExcelContent}
            onChange={(c) => setContent(c)}
            readOnly={!canEdit}
            docName={name}
            canManage={isOwner}
            onSave={handleSave}
            onRename={(newName) => setName(newName)}
            onDuplicate={handleDuplicate}
            onDelete={onDelete}
            onClose={onClose}
            onShare={() => setShowShare(true)}
            onHistory={() => setShowHistory(true)}
            onExport={(format) => {
              const option = exportOptions.find((opt) => opt.key === format);
              if (option) void runExport(option);
            }}
          />
        )}
        {document.doc_type === 'powerpoint' && (
          <PowerPointEditor
            content={content as unknown as PowerPointContent}
            onChange={(c) => setContent(c)}
            readOnly={!canEdit}
            docName={name}
            canManage={isOwner}
            onSave={handleSave}
            onRename={(newName) => setName(newName)}
            onDuplicate={handleDuplicate}
            onDelete={onDelete}
            onClose={onClose}
            onShare={() => setShowShare(true)}
            onHistory={() => setShowHistory(true)}
            onExport={(format) => {
              const option = exportOptions.find((opt) => opt.key === format);
              if (option) void runExport(option);
            }}
          />
        )}
        {document.doc_type === 'pdf' && (
          <PdfViewer pdfBase64={(content as PdfContent).pdfBase64 || ''} fileName={name} />
        )}
      </div>

      {showShare && (
        <ShareModal
          document={document}
          currentUserId={currentUser.id}
          isOwner={isOwner}
          onClose={() => setShowShare(false)}
        />
      )}

      {showHistory && (
        <HistoryModal
          document={document}
          canEdit={canEdit}
          onClose={() => setShowHistory(false)}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
}