import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchDocuments,
  fetchFolders,
  createDocument,
  updateDocument,
  deleteDocument,
  duplicateDocument,
  createFolder,
  deleteFolder,
  renameDocument,
  moveDocument,
  docTypeMeta,
  type DocDocument,
  type DocFolder,
  type DocType,
} from '@/lib/documents';
import DocumentEditorModal from '../file-manager/components/DocumentEditorModal';

type SortKey = 'updated_desc' | 'name_asc' | 'name_desc' | 'created_desc' | 'type_asc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'updated_desc', label: 'Modifiés récemment' },
  { value: 'name_asc', label: 'Nom (A → Z)' },
  { value: 'name_desc', label: 'Nom (Z → A)' },
  { value: 'created_desc', label: 'Créés récemment' },
  { value: 'type_asc', label: 'Type de document' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [documents, setDocuments] = useState<DocDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('updated_desc');
  const [search, setSearch] = useState('');

  // Création de document
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState<DocType>('word');

  // Création de dossier
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Déplacement
  const [moveDoc, setMoveDoc] = useState<DocDocument | null>(null);

  // Renommage
  const [renameDoc, setRenameDoc] = useState<DocDocument | null>(null);
  const [renameName, setRenameName] = useState('');

  // Confirmation de suppression
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'folder' | 'doc'; id: number; name: string } | null>(null);

  // Éditeur
  const [activeDocument, setActiveDocument] = useState<DocDocument | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [f, d] = await Promise.all([fetchFolders(user.id), fetchDocuments(user.id)]);
      setFolders(f);
      setDocuments(d);
    } catch (err) {
      setError('Erreur lors du chargement des documents');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fil d'Ariane
  const breadcrumb = useMemo(() => {
    const chain: DocFolder[] = [];
    let id = currentFolderId;
    const guard = new Set<number>();
    while (id !== null && !guard.has(id)) {
      guard.add(id);
      const folder = folders.find((f) => f.id === id);
      if (!folder) break;
      chain.unshift(folder);
      id = folder.parent_id;
    }
    return chain;
  }, [currentFolderId, folders]);

  const currentSubfolders = useMemo(
    () => folders.filter((f) => f.parent_id === currentFolderId),
    [folders, currentFolderId],
  );

  const currentDocuments = useMemo(() => {
    let list = documents.filter((d) => d.folder_id === currentFolderId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }
    const sorted = [...list];
    switch (sortKey) {
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        break;
      case 'name_desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name, 'fr'));
        break;
      case 'created_desc':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'type_asc':
        sorted.sort((a, b) => a.doc_type.localeCompare(b.doc_type) || a.name.localeCompare(b.name, 'fr'));
        break;
      default:
        sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return sorted;
  }, [documents, currentFolderId, search, sortKey]);

  const docCountInFolder = (folderId: number) =>
    documents.filter((d) => d.folder_id === folderId).length;

  const handleCreateDocument = async () => {
    if (!user || !newDocName.trim()) return;
    try {
      const doc = await createDocument(user.id, newDocName.trim(), newDocType, currentFolderId);
      setDocuments((prev) => [doc, ...prev]);
      setShowCreateDoc(false);
      setNewDocName('');
      setNewDocType('word');
      setActiveDocument(doc);
    } catch (err) {
      setError('Erreur lors de la création du document');
    }
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    try {
      const folder = await createFolder(user.id, newFolderName.trim(), currentFolderId);
      setFolders((prev) => [...prev, folder]);
      setShowCreateFolder(false);
      setNewFolderName('');
    } catch (err) {
      setError('Erreur lors de la création du dossier');
    }
  };

  const handleSaveDocument = async (content: Record<string, unknown>, name: string) => {
    if (!activeDocument) return;
    setSavingDoc(true);
    try {
      await updateDocument(activeDocument.id, content, name, user ? { id: user.id, name: user.name } : undefined);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === activeDocument.id
            ? { ...d, name, content, updated_at: new Date().toISOString(), last_modified_by: user?.name || d.last_modified_by }
            : d,
        ),
      );
      setActiveDocument((prev) => (prev ? { ...prev, name, content } : prev));
    } catch (err) {
      setError('Erreur lors de la sauvegarde du document');
    }
    setSavingDoc(false);
  };

  const handleDeleteDocument = async () => {
    if (!activeDocument) return;
    try {
      await deleteDocument(activeDocument.id);
      setDocuments((prev) => prev.filter((d) => d.id !== activeDocument.id));
      setActiveDocument(null);
    } catch (err) {
      setError('Erreur lors de la suppression du document');
    }
  };

  const handleDuplicateDocument = async (doc: DocDocument) => {
    try {
      const copy = await duplicateDocument(doc);
      setDocuments((prev) => [copy, ...prev]);
    } catch (err) {
      setError('Erreur lors de la duplication du document');
    }
  };

  const handleDuplicateFromEditor = async (content: Record<string, unknown>, name: string) => {
    if (!activeDocument) return;
    try {
      const copy = await duplicateDocument({ ...activeDocument, content, name });
      setDocuments((prev) => [copy, ...prev]);
      setActiveDocument(copy);
    } catch (err) {
      setError('Erreur lors de la duplication du document');
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.kind === 'doc') {
        await deleteDocument(confirmDelete.id);
        setDocuments((prev) => prev.filter((d) => d.id !== confirmDelete.id));
        if (activeDocument?.id === confirmDelete.id) setActiveDocument(null);
      } else {
        await deleteFolder(confirmDelete.id);
        await loadData();
        if (currentFolderId === confirmDelete.id) setCurrentFolderId(null);
      }
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
    setConfirmDelete(null);
  };

  const handleMoveDocument = async (folderId: number | null) => {
    if (!moveDoc) return;
    try {
      await moveDocument(moveDoc.id, folderId);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === moveDoc.id
            ? { ...d, folder_id: folderId, updated_at: new Date().toISOString() }
            : d,
        ),
      );
    } catch (err) {
      setError('Erreur lors du déplacement du document');
    }
    setMoveDoc(null);
  };

  const handleRenameDocument = async () => {
    if (!renameDoc || !renameName.trim()) return;
    const trimmed = renameName.trim();
    try {
      await renameDocument(renameDoc.id, trimmed);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === renameDoc.id
            ? { ...d, name: trimmed, updated_at: new Date().toISOString() }
            : d,
        ),
      );
      if (activeDocument?.id === renameDoc.id) {
        setActiveDocument((prev) => (prev ? { ...prev, name: trimmed } : prev));
      }
    } catch (err) {
      setError('Erreur lors du renommage du document');
    }
    setRenameDoc(null);
    setRenameName('');
  };

  return (
    <div className="p-4 md:p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-file-text-line mr-2 text-primary-500"></i>
            Documents
          </h2>
          <p className="text-sm text-foreground-500 mt-1">
            {documents.length} document{documents.length !== 1 ? 's' : ''} · {folders.length} dossier{folders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-background-100 text-foreground-800 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-background-200/70 transition-colors"
          >
            <i className="ri-folder-add-line"></i>
            Nouveau dossier
          </button>
          <button
            onClick={() => setShowCreateDoc(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 transition-colors"
          >
            <i className="ri-file-add-line"></i>
            Nouveau document
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm rounded-lg mb-4">
          <i className="ri-error-warning-line"></i>
          {error}
          <button onClick={() => setError(null)} className="ml-auto cursor-pointer hover:text-red-900">
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* Fil d'Ariane + outils */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <nav className="flex items-center gap-1 text-sm flex-wrap" aria-label="Fil d'Ariane">
          <button
            onClick={() => setCurrentFolderId(null)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full cursor-pointer transition-colors whitespace-nowrap ${
              currentFolderId === null
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-foreground-600 hover:bg-background-100'
            }`}
          >
            <i className="ri-home-5-line"></i>
            Mes documents
          </button>
          {breadcrumb.map((folder) => (
            <span key={folder.id} className="flex items-center gap-1">
              <i className="ri-arrow-right-s-line text-foreground-300"></i>
              <button
                onClick={() => setCurrentFolderId(folder.id)}
                className="px-2.5 py-1.5 rounded-full cursor-pointer text-foreground-600 hover:bg-background-100 hover:text-foreground-900 transition-colors whitespace-nowrap"
              >
                {folder.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-52 pl-9 pr-4 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <i className="ri-sort-desc text-foreground-400"></i>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-800 cursor-pointer focus:outline-none focus:border-primary-300"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      ) : (
        <>
          {/* Dossiers */}
          {currentSubfolders.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-500 mb-3">
                Dossiers
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {currentSubfolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group relative bg-background-50 border border-background-200/70 rounded-lg p-3 cursor-pointer hover:border-accent-300 transition-colors"
                  >
                    <button
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="w-full flex flex-col items-start gap-2 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
                        <i className="ri-folder-3-fill text-accent-600 text-xl"></i>
                      </div>
                      <div className="w-full min-w-0">
                        <p className="text-sm font-medium text-foreground-800 truncate">{folder.name}</p>
                        <p className="text-xs text-foreground-400">
                          {docCountInFolder(folder.id)} document{docCountInFolder(folder.id) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setConfirmDelete({ kind: 'folder', id: folder.id, name: folder.name })
                      }
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-foreground-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Supprimer le dossier"
                    >
                      <i className="ri-delete-bin-line text-sm"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-500 mb-3">
              Documents
            </h3>
            {currentDocuments.length === 0 ? (
              <div className="flex flex-col items-center py-16 bg-background-50 border border-background-200/70 rounded-lg text-center px-6">
                <i className="ri-file-list-3-line text-4xl text-foreground-300 mb-3"></i>
                <p className="text-foreground-600 font-medium">
                  {search ? 'Aucun résultat' : 'Aucun document ici'}
                </p>
                <p className="text-sm text-foreground-400 mt-1">
                  {search
                    ? 'Essayez un autre terme de recherche.'
                    : 'Créez un document texte, une feuille de calcul ou une présentation.'}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowCreateDoc(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    <i className="ri-file-add-line"></i>
                    Nouveau document
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {currentDocuments.map((doc) => {
                  const meta = docTypeMeta[doc.doc_type] || docTypeMeta.word;
                  return (
                    <div
                      key={doc.id}
                      className="group relative bg-background-50 border border-background-200/70 rounded-lg overflow-hidden cursor-pointer hover:border-primary-300 transition-colors"
                    >
                      <button
                        onClick={() => setActiveDocument(doc)}
                        className="w-full cursor-pointer"
                      >
                        <div className="aspect-square bg-background-100 flex items-center justify-center relative">
                          <i className={`${meta.icon} text-4xl ${meta.iconClass}`}></i>
                        </div>
                        <div className="p-2.5 text-left">
                          <p className="text-xs font-medium text-foreground-800 truncate">{doc.name}</p>
                          <p className="text-[10px] text-foreground-400 mt-0.5 truncate">
                            {meta.label} · {formatDate(doc.updated_at)}
                            {doc.last_modified_by ? ` · ${doc.last_modified_by}` : ''}
                          </p>
                        </div>
                      </button>
                      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setRenameDoc(doc); setRenameName(doc.name); }}
                          className="w-7 h-7 rounded-full bg-background-50/90 border border-background-200/70 flex items-center justify-center text-foreground-500 hover:text-foreground-800 cursor-pointer"
                          title="Renommer"
                        >
                          <i className="ri-edit-line text-xs"></i>
                        </button>
                        <button
                          onClick={() => handleDuplicateDocument(doc)}
                          className="w-7 h-7 rounded-full bg-background-50/90 border border-background-200/70 flex items-center justify-center text-foreground-500 hover:text-accent-600 cursor-pointer"
                          title="Dupliquer"
                        >
                          <i className="ri-file-copy-line text-xs"></i>
                        </button>
                        <button
                          onClick={() => setMoveDoc(doc)}
                          className="w-7 h-7 rounded-full bg-background-50/90 border border-background-200/70 flex items-center justify-center text-foreground-500 hover:text-primary-600 cursor-pointer"
                          title="Déplacer"
                        >
                          <i className="ri-folder-transfer-line text-xs"></i>
                        </button>
                        <button
                          onClick={() =>
                            setConfirmDelete({ kind: 'doc', id: doc.id, name: doc.name })
                          }
                          className="w-7 h-7 rounded-full bg-background-50/90 border border-background-200/70 flex items-center justify-center text-foreground-500 hover:text-red-500 cursor-pointer"
                          title="Supprimer"
                        >
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Éditeur */}
      {activeDocument && (
        <DocumentEditorModal
          document={activeDocument}
          saving={savingDoc}
          currentUser={{ id: user?.id ?? 0, name: user?.name ?? '' }}
          onSave={handleSaveDocument}
          onClose={() => setActiveDocument(null)}
          onDelete={handleDeleteDocument}
          onDuplicate={handleDuplicateFromEditor}
        />
      )}

      {/* Modal création de document */}
      {showCreateDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateDoc(false)}></div>
          <div className="relative w-full max-w-md bg-background-50 rounded-xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold font-heading text-foreground-950">Nouveau document</h3>
              <button
                onClick={() => setShowCreateDoc(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            <p className="text-sm text-foreground-500 mb-3">Type de document</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {(['word', 'excel', 'powerpoint'] as DocType[]).map((t) => {
                const meta = docTypeMeta[t];
                return (
                  <button
                    key={t}
                    onClick={() => setNewDocType(t)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      newDocType === t
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-background-200/70 bg-white hover:bg-background-50'
                    }`}
                  >
                    <i className={`${meta.icon} text-2xl ${meta.iconClass}`}></i>
                    <span className="text-xs font-medium text-foreground-700">{meta.label}</span>
                  </button>
                );
              })}
            </div>

            <label className="block text-sm text-foreground-500 mb-1.5">Nom du document</label>
            <input
              type="text"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateDocument();
              }}
              placeholder="Document sans titre"
              autoFocus
              className="w-full px-4 py-2.5 bg-white border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 mb-5"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCreateDoc(false)}
                className="px-4 py-2 rounded-full text-sm text-foreground-600 hover:bg-background-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateDocument}
                disabled={!newDocName.trim()}
                className="px-5 py-2 rounded-full bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal création de dossier */}
      {showCreateFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateFolder(false)}></div>
          <div className="relative w-full max-w-sm bg-background-50 rounded-xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold font-heading text-foreground-950">Nouveau dossier</h3>
              <button
                onClick={() => setShowCreateFolder(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            <label className="block text-sm text-foreground-500 mb-1.5">Nom du dossier</label>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
              }}
              placeholder="Mon dossier"
              autoFocus
              className="w-full px-4 py-2.5 bg-white border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 mb-5"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCreateFolder(false)}
                className="px-4 py-2 rounded-full text-sm text-foreground-600 hover:bg-background-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-5 py-2 rounded-full bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal déplacement */}
      {moveDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMoveDoc(null)}></div>
          <div className="relative w-full max-w-sm bg-background-50 rounded-xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold font-heading text-foreground-950">Déplacer</h3>
              <button
                onClick={() => setMoveDoc(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
            <p className="text-sm text-foreground-500 mb-4 truncate">
              <span className="font-medium text-foreground-700">{moveDoc.name}</span>
            </p>

            <div className="max-h-72 overflow-y-auto space-y-1">
              <button
                onClick={() => handleMoveDocument(null)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                  moveDoc.folder_id === null
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-foreground-700 hover:bg-background-100'
                }`}
              >
                <i className="ri-home-5-line text-lg"></i>
                Mes documents (racine)
              </button>
              {folders
                .filter((f) => f.id !== moveDoc.folder_id)
                .map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleMoveDocument(f.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-foreground-700 hover:bg-background-100 cursor-pointer transition-colors"
                  >
                    <i className="ri-folder-3-fill text-lg text-accent-500"></i>
                    <span className="truncate">{f.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal renommage */}
      {renameDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setRenameDoc(null); setRenameName(''); }}></div>
          <div className="relative w-full max-w-sm bg-background-50 rounded-xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold font-heading text-foreground-950">Renommer le document</h3>
              <button
                onClick={() => { setRenameDoc(null); setRenameName(''); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            <label className="block text-sm text-foreground-500 mb-1.5">Nom du document</label>
            <input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameDocument();
                else if (e.key === 'Escape') { setRenameDoc(null); setRenameName(''); }
              }}
              placeholder="Nom du document"
              autoFocus
              className="w-full px-4 py-2.5 bg-white border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 mb-5"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setRenameDoc(null); setRenameName(''); }}
                className="px-4 py-2 rounded-full text-sm text-foreground-600 hover:bg-background-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleRenameDocument}
                disabled={!renameName.trim() || renameName.trim() === renameDoc.name}
                className="px-5 py-2 rounded-full bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                Renommer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}></div>
          <div className="relative w-full max-w-sm bg-background-50 rounded-xl p-6 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <i className="ri-delete-bin-line text-xl text-red-500"></i>
            </div>
            <h3 className="text-lg font-semibold font-heading text-foreground-950">
              Supprimer {confirmDelete.kind === 'folder' ? 'le dossier' : 'le document'} ?
            </h3>
            <p className="text-sm text-foreground-500 mt-1.5">
              <span className="font-medium text-foreground-700">{confirmDelete.name}</span>
              {confirmDelete.kind === 'folder'
                ? ' — les documents à l\'intérieur seront replacés à la racine.'
                : ' — cette action est définitive.'}
            </p>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-full text-sm text-foreground-600 hover:bg-background-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-full bg-red-500 text-white text-sm font-medium hover:bg-red-600 cursor-pointer whitespace-nowrap"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}