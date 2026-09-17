import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  listFiles,
  uploadToSeaweedFS,
  deleteFile,
  getFileBytes,
  moveFile,
  formatFileSize,
  type SeaweedFile,
} from '@/lib/seaweedfs';
import {
  fetchDocuments,
  createDocument,
  createDocumentWithContent,
  updateDocument,
  deleteDocument,
  duplicateDocument,
  fetchFolders,
  createFolder,
  renameFolder,
  renameDocument,
  deleteFolder,
  moveFolder,
  moveDocument,
  docTypeMeta,
  pdfBase64ToBlob,
  type DocDocument,
  type DocFolder,
  type DocType,
  type WordContent,
  type ExcelContent,
  type PowerPointContent,
  type PdfContent,
} from '@/lib/documents';
import { detectDocType, importFileAsContent } from '@/lib/documentImport';
import {
  exportWordAsDocxBlob,
  exportExcelAsXlsxBlob,
  exportPowerPointAsPptxBlob,
  safeFileName,
} from '@/lib/documentExport';
import JSZip from 'jszip';
import DocumentEditorModal from './components/DocumentEditorModal';

// Icône et couleur par type de fichier (extension)
function getFileTypeMeta(extension: string): { icon: string; iconClass: string } {
  const ext = (extension || '').toLowerCase();
  if (['doc', 'docx', 'docm', 'dotx', 'dotm', 'odt', 'rtf'].includes(ext)) return { icon: 'ri-file-word-2-line', iconClass: 'text-blue-600' };
  if (['xls', 'xlsx', 'xlsm', 'xlsb', 'xltx', 'csv', 'ods'].includes(ext)) return { icon: 'ri-file-excel-2-line', iconClass: 'text-green-600' };
  if (['ppt', 'pptx', 'pptm', 'ppsx', 'potx', 'odp'].includes(ext)) return { icon: 'ri-file-ppt-2-line', iconClass: 'text-orange-500' };
  if (['pdf'].includes(ext)) return { icon: 'ri-file-pdf-2-line', iconClass: 'text-red-600' };
  if (['txt', 'md', 'log'].includes(ext)) return { icon: 'ri-file-text-line', iconClass: 'text-foreground-500' };
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { icon: 'ri-file-zip-line', iconClass: 'text-amber-600' };
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return { icon: 'ri-file-music-line', iconClass: 'text-pink-500' };
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(ext)) return { icon: 'ri-video-line', iconClass: 'text-teal-600' };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return { icon: 'ri-image-line', iconClass: 'text-foreground-500' };
  return { icon: 'ri-file-3-line', iconClass: 'text-foreground-400' };
}

// Extrait l'identifiant de dossier depuis la clé S3 d'un fichier (segment "f-<id>")
function getFileFolderId(file: SeaweedFile): number | null {
  const seg = file.folder.split('/').find((s) => s.startsWith('f-'));
  if (!seg) return null;
  const n = parseInt(seg.slice(2), 10);
  return Number.isNaN(n) ? null : n;
}

// Construit l'arborescence des dossiers en liste aplatie (avec profondeur)
function buildFolderTree(folders: DocFolder[]): { folder: DocFolder; depth: number }[] {
  const result: { folder: DocFolder; depth: number }[] = [];
  const visit = (parentId: number | null, depth: number) => {
    folders
      .filter((f) => (f.parent_id ?? null) === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((f) => {
        result.push({ folder: f, depth });
        visit(f.id, depth + 1);
      });
  };
  visit(null, 0);
  return result;
}

// Liste des identifiants de tous les descendants d'un dossier (pour éviter les cycles)
function getDescendantIds(folders: DocFolder[], id: number): Set<number> {
  const result = new Set<number>();
  const walk = (parentId: number) => {
    folders.forEach((f) => {
      if ((f.parent_id ?? null) === parentId) {
        result.add(f.id);
        walk(f.id);
      }
    });
  };
  walk(id);
  return result;
}

type MoveItem =
  | { type: 'doc'; doc: DocDocument }
  | { type: 'file'; file: SeaweedFile }
  | { type: 'folder'; folder: DocFolder };

type DeleteTarget =
  | { type: 'doc'; doc: DocDocument }
  | { type: 'file'; file: SeaweedFile }
  | { type: 'folder'; folder: DocFolder };

export default function FileManagerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [files, setFiles] = useState<SeaweedFile[]>([]);
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [documents, setDocuments] = useState<DocDocument[]>([]);
  const [totalSize, setTotalSize] = useState<string>('0 o');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<SeaweedFile | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const [activeDocument, setActiveDocument] = useState<DocDocument | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState<DocType>('word');

  // Dossiers
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<DocFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveItem, setMoveItem] = useState<MoveItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [draggingItem, setDraggingItem] = useState<MoveItem | null>(null);
  const [dropTargetFolder, setDropTargetFolder] = useState<number | null>(null);

  // Renommage d'un document depuis sa carte
  const [renameDocTarget, setRenameDocTarget] = useState<DocDocument | null>(null);
  const [renameDocName, setRenameDocName] = useState('');

  // Sélection multiple de documents pour téléchargement groupé
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());
  const [selectedFileKeys, setSelectedFileKeys] = useState<Set<string>>(new Set());
  const [downloadingDocs, setDownloadingDocs] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const prefix = `file-manager/${user.id}/`;
      const result = await listFiles(prefix);
      setFiles(result.files);
      setTotalSize(result.totalSizeFormatted);
    } catch (err) {
      setError('Erreur lors du chargement des fichiers');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const fetchDocs = useCallback(async () => {
    if (!user) return;
    try {
      const docs = await fetchDocuments(user.id);
      setDocuments(docs);
    } catch (err) {
      // silencieux
    }
  }, [user]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const fetchFolderList = useCallback(async () => {
    if (!user) return;
    try {
      const list = await fetchFolders(user.id);
      setFolders(list);
    } catch (err) {
      // silencieux
    }
  }, [user]);

  useEffect(() => { fetchFolderList(); }, [fetchFolderList]);

  // Masque automatiquement le message de confirmation après quelques secondes
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  // Réinitialise la sélection quand on change de dossier
  useEffect(() => {
    setSelectedDocIds(new Set());
    setSelectedFileKeys(new Set());
  }, [currentFolderId]);

  const targetFolderPath = useMemo(
    () => (currentFolderId != null ? `file-manager/${user?.id}/f-${currentFolderId}` : `file-manager/${user?.id}`),
    [currentFolderId, user?.id],
  );

  const processFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0 || !user) return;
    setUploading(true);
    setError(null);
    setNotice(null);
    setUploadProgress({ done: 0, total: selectedFiles.length });
    let importedDocs = 0;
    let uploadedFiles = 0;
    const folder = targetFolderPath;

    // Traite un fichier : document modifiable si possible, sinon upload direct.
    const uploadOne = async (file: File) => {
      const type = detectDocType(file.name);
      if (type) {
        try {
          const content = await importFileAsContent(file, type);
          const name = file.name.replace(/\.[^.]+$/, '') || file.name;
          const doc = await createDocumentWithContent(user.id, name, type, content, currentFolderId);
          setDocuments((prev) => [doc, ...prev]);
          importedDocs += 1;
        } catch (err) {
          const arrayBuffer = await file.arrayBuffer();
          await uploadToSeaweedFS(new Uint8Array(arrayBuffer), file.name, file.type, folder);
          uploadedFiles += 1;
        }
      } else {
        const arrayBuffer = await file.arrayBuffer();
        await uploadToSeaweedFS(new Uint8Array(arrayBuffer), file.name, file.type, folder);
        uploadedFiles += 1;
      }
    };

    try {
      // Upload en parallèle (par paquets) au lieu d'un enchaînement un par un.
      const CONCURRENCY = 4;
      let index = 0;
      const workers = Array.from({ length: Math.min(CONCURRENCY, selectedFiles.length) }, async () => {
        while (index < selectedFiles.length) {
          const file = selectedFiles[index];
          index += 1;
          await uploadOne(file);
          setUploadProgress((prev) => (prev ? { done: prev.done + 1, total: prev.total } : prev));
        }
      });
      await Promise.all(workers);

      await fetchFiles();
      if (importedDocs > 0) {
        setNotice(
          `${importedDocs} document${importedDocs > 1 ? 's' : ''} importé${importedDocs > 1 ? 's' : ''} et prêt${importedDocs > 1 ? 's' : ''} à modifier.`,
        );
      } else if (uploadedFiles > 0) {
        setNotice(`${uploadedFiles} fichier${uploadedFiles > 1 ? 's' : ''} uploadé${uploadedFiles > 1 ? 's' : ''}.`);
      }
    } catch (err) {
      setError("Erreur lors de l'import des fichiers");
    }
    setUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(Array.from(e.target.files || []));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    if (draggingItem) {
      setDraggingItem(null);
      setDropTargetFolder(null);
      return;
    }
    await processFiles(Array.from(e.dataTransfer.files || []));
  };

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

  // Convertit un fichier Office déjà présent en document modifiable
  const handleEditOfficeFile = async (file: SeaweedFile) => {
    if (!user) return;
    setError(null);
    setDeleting(file.key);
    try {
      const type = detectDocType(file.filename);
      if (!type) return;
      const bytes = await getFileBytes(file.key);
      const asFile = new File([bytes], file.filename);
      const content = await importFileAsContent(asFile, type);
      const name = file.filename.replace(/\.[^.]+$/, '') || file.filename;
      const doc = await createDocumentWithContent(user.id, name, type, content, currentFolderId);
      setDocuments((prev) => [doc, ...prev]);
      await deleteFile(file.key);
      setFiles((prev) => prev.filter((x) => x.key !== file.key));
      setNotice(`« ${name} » converti en document modifiable.`);
      setActiveDocument(doc);
    } catch (err) {
      console.error('Erreur conversion fichier → document :', err);
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Erreur lors de la conversion du fichier en document${detail ? ` (${detail})` : ''}.`);
    }
    setDeleting(null);
  };

  // ── Dossiers ────────────────────────────────────────────────

  const openCreateFolder = () => {
    setEditingFolder(null);
    setFolderName('');
    setShowFolderModal(true);
  };

  const openRenameFolder = (folder: DocFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setShowFolderModal(true);
  };

  const openRenameDocument = (doc: DocDocument) => {
    setRenameDocTarget(doc);
    setRenameDocName(doc.name);
  };

  const handleSubmitFolder = async () => {
    if (!user || !folderName.trim()) return;
    setError(null);
    try {
      if (editingFolder) {
        await renameFolder(editingFolder.id, folderName.trim());
      } else {
        await createFolder(user.id, folderName.trim(), currentFolderId);
      }
      await fetchFolderList();
      setShowFolderModal(false);
      setFolderName('');
      setEditingFolder(null);
    } catch (err) {
      setError('Erreur lors de la sauvegarde du dossier');
    }
  };

  const handleSubmitRenameDocument = async () => {
    const doc = renameDocTarget;
    if (!doc || !renameDocName.trim()) return;
    setError(null);
    try {
      await renameDocument(doc.id, renameDocName.trim());
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, name: renameDocName.trim(), updated_at: new Date().toISOString() } : d)),
      );
      setRenameDocTarget(null);
      setRenameDocName('');
    } catch (err) {
      setError('Erreur lors du renommage du document');
    }
  };

  const handleConfirmDelete = async () => {
    const target = deleteTarget;
    if (!target) return;
    setError(null);
    try {
      if (target.type === 'file') {
        setDeleting(target.file.key);
        await deleteFile(target.file.key);
        setDeleting(null);
        setFiles((prev) => prev.filter((f) => f.key !== target.file.key));
        setNotice(`Fichier « ${target.file.filename} » supprimé.`);
      } else if (target.type === 'doc') {
        await deleteDocument(target.doc.id);
        setDocuments((prev) => prev.filter((d) => d.id !== target.doc.id));
        setNotice(`Document « ${target.doc.name} » supprimé.`);
      } else {
        await deleteFolder(target.folder.id);
        await fetchFolderList();
        await fetchDocs();
        setNotice(`Dossier « ${target.folder.name} » supprimé, son contenu est revenu à la racine.`);
      }
      setDeleteTarget(null);
    } catch (err) {
      setDeleting(null);
      setError('Erreur lors de la suppression');
    }
  };

  const openMove = (item: MoveItem) => {
    setMoveItem(item);
    setShowMoveModal(true);
  };

  const performMove = async (item: MoveItem, targetId: number | null): Promise<boolean> => {
    if (!user) return false;
    setError(null);
    try {
      if (item.type === 'doc') {
        await moveDocument(item.doc.id, targetId);
        setDocuments((prev) =>
          prev.map((d) => (d.id === item.doc.id ? { ...d, folder_id: targetId, updated_at: new Date().toISOString() } : d)),
        );
      } else if (item.type === 'folder') {
        if (targetId === item.folder.id) {
          setError('Impossible de déplacer un dossier dans lui-même.');
          return false;
        }
        if (targetId != null && getDescendantIds(folders, item.folder.id).has(targetId)) {
          setError('Impossible de déplacer un dossier dans un de ses sous-dossiers.');
          return false;
        }
        await moveFolder(item.folder.id, targetId);
        await fetchFolderList();
      } else {
        const newFolder = targetId != null ? `file-manager/${user.id}/f-${targetId}` : `file-manager/${user.id}`;
        await moveFile(item.file.key, newFolder);
        await fetchFiles();
      }
      setNotice('Élément déplacé.');
      return true;
    } catch (err) {
      setError('Erreur lors du déplacement');
      return false;
    }
  };

  const handleConfirmMove = async (targetId: number | null) => {
    if (!moveItem) return;
    const ok = await performMove(moveItem, targetId);
    if (ok) {
      setShowMoveModal(false);
      setMoveItem(null);
    }
  };

  // Démarre le glisser-déposer d'un élément interne (fichier ou document)
  const startDrag = (e: React.DragEvent, item: MoveItem) => {
    e.stopPropagation();
    setDraggingItem(item);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData(
        'text/plain',
        item.type === 'doc' ? String(item.doc.id) : item.type === 'folder' ? String(item.folder.id) : item.file.key,
      );
    } catch {
      // certains navigateurs restreignent setData
    }
  };

  const endDrag = () => {
    setDraggingItem(null);
    setDropTargetFolder(null);
  };

  // ── Navigation ─────────────────────────────────────────────

  const openPreview = (file: SeaweedFile) => {
    setPreviewLoaded(false);
    setPreviewFile(file);
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewLoaded(false);
  };

  // Timer pour distinguer un simple clic (aperçu) d'un double clic (ouverture éditeur)
  const fileClickTimer = useRef<number | null>(null);

  const handleFileDoubleClick = (file: SeaweedFile) => {
    if (detectDocType(file.filename)) {
      handleEditOfficeFile(file);
    } else {
      openPreview(file);
    }
  };

  const handleFileClick = (file: SeaweedFile) => {
    if (fileClickTimer.current) {
      window.clearTimeout(fileClickTimer.current);
      fileClickTimer.current = null;
      handleFileDoubleClick(file);
      return;
    }
    fileClickTimer.current = window.setTimeout(() => {
      fileClickTimer.current = null;
      openPreview(file);
    }, 250);
  };

  // Timer pour distinguer un simple clic d'un double clic sur un document
  const docClickTimer = useRef<number | null>(null);

  // Double clic : ouvre le document, ou le referme s'il est déjà ouvert
  const handleDocDoubleClick = (doc: DocDocument) => {
    setActiveDocument((prev) => (prev && prev.id === doc.id ? null : doc));
  };

  const handleDocClick = (doc: DocDocument) => {
    if (docClickTimer.current) {
      window.clearTimeout(docClickTimer.current);
      docClickTimer.current = null;
      handleDocDoubleClick(doc);
      return;
    }
    docClickTimer.current = window.setTimeout(() => {
      docClickTimer.current = null;
    }, 250);
  };

  const isImage = (file: SeaweedFile) => file.type === 'image';
  const isVideo = (file: SeaweedFile) => file.type === 'video';

  // Tri : les plus récemment modifiés en premier
  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()),
    [files],
  );

  const childFolders = useMemo(
    () =>
      folders
        .filter((f) => (f.parent_id ?? null) === currentFolderId)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [folders, currentFolderId],
  );

  const filesInFolder = useMemo(
    () => sortedFiles.filter((f) => getFileFolderId(f) === currentFolderId),
    [sortedFiles, currentFolderId],
  );

  const docsInFolder = useMemo(
    () => documents.filter((d) => (d.folder_id ?? null) === currentFolderId),
    [documents, currentFolderId],
  );

  const filteredFolders = childFolders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
  const filteredFiles = filesInFolder.filter((f) => f.filename.toLowerCase().includes(search.toLowerCase()));
  const filteredDocs = docsInFolder.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  // ── Téléchargement groupé de documents ─────────────────────

  const toggleSelectDoc = (id: number) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllDocs = () => {
    const allSelected = filteredDocs.length > 0 && filteredDocs.every((d) => selectedDocIds.has(d.id));
    if (allSelected) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(filteredDocs.map((d) => d.id)));
    }
  };

  const clearAllSelection = () => {
    setSelectedDocIds(new Set());
    setSelectedFileKeys(new Set());
  };

  // Fichiers reconnus comme des documents (Word / Excel / PowerPoint / PDF)
  const documentFiles = useMemo(
    () => filesInFolder.filter((f) => detectDocType(f.filename) !== null),
    [filesInFolder],
  );

  const toggleSelectDocFile = (key: string) => {
    setSelectedFileKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAllDocFiles = () => {
    const allSelected = documentFiles.length > 0 && documentFiles.every((f) => selectedFileKeys.has(f.key));
    if (allSelected) {
      setSelectedFileKeys(new Set());
    } else {
      setSelectedFileKeys(new Set(documentFiles.map((f) => f.key)));
    }
  };

  const totalSelectedCount = selectedDocIds.size + selectedFileKeys.size;

  // Convertit un document en Blob prêt à télécharger (dans son format natif).
  const docToBlob = async (doc: DocDocument): Promise<{ blob: Blob; filename: string } | null> => {
    if (doc.doc_type === 'word') {
      const blob = await exportWordAsDocxBlob(doc.name, doc.content as WordContent);
      return { blob, filename: safeFileName(doc.name, 'docx') };
    }
    if (doc.doc_type === 'excel') {
      const blob = exportExcelAsXlsxBlob(doc.name, doc.content as ExcelContent);
      return { blob, filename: safeFileName(doc.name, 'xlsx') };
    }
    if (doc.doc_type === 'powerpoint') {
      const blob = await exportPowerPointAsPptxBlob(doc.name, doc.content as PowerPointContent);
      return { blob, filename: safeFileName(doc.name, 'pptx') };
    }
    if (doc.doc_type === 'pdf') {
      const pdfBase64 = (doc.content as PdfContent).pdfBase64;
      if (!pdfBase64) return null;
      return { blob: pdfBase64ToBlob(pdfBase64), filename: safeFileName(doc.name, 'pdf') };
    }
    return null;
  };

  const downloadSelected = async () => {
    const selectedDocs = filteredDocs.filter((d) => selectedDocIds.has(d.id));
    const selectedFiles = filesInFolder.filter(
      (f) => selectedFileKeys.has(f.key) && detectDocType(f.filename) !== null,
    );
    const totalCount = selectedDocs.length + selectedFiles.length;
    if (totalCount === 0) return;
    setDownloadingDocs(true);
    setError(null);
    try {
      const items: { blob: Blob; filename: string }[] = [];
      for (const doc of selectedDocs) {
        const result = await docToBlob(doc);
        if (result) items.push(result);
      }
      for (const file of selectedFiles) {
        const bytes = await getFileBytes(file.key);
        items.push({
          blob: new Blob([bytes], { type: file.type || 'application/octet-stream' }),
          filename: file.filename,
        });
      }

      // Évite qu'un fichier n'en écrase un autre portant le même nom dans le zip
      const usedNames = new Set<string>();
      const uniqueItems = items.map((item) => {
        let name = item.filename;
        if (usedNames.has(name)) {
          const dot = name.lastIndexOf('.');
          const base = dot > 0 ? name.slice(0, dot) : name;
          const ext = dot > 0 ? name.slice(dot) : '';
          let i = 2;
          while (usedNames.has(`${base} (${i})${ext}`)) i += 1;
          name = `${base} (${i})${ext}`;
        }
        usedNames.add(name);
        return { ...item, filename: name };
      });

      if (uniqueItems.length === 1) {
        const item = uniqueItems[0];
        const url = URL.createObjectURL(item.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else if (uniqueItems.length > 1) {
        const zip = new JSZip();
        uniqueItems.forEach((item) => zip.file(item.filename, item.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'documents.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      setNotice(
        `${totalCount} document${totalCount > 1 ? 's' : ''} téléchargé${totalCount > 1 ? 's' : ''}.`,
      );
      setSelectedDocIds(new Set());
      setSelectedFileKeys(new Set());
    } catch (err) {
      setError('Erreur lors du téléchargement des documents');
    }
    setDownloadingDocs(false);
  };

  const breadcrumb = useMemo(() => {
    const chain: DocFolder[] = [];
    let id = currentFolderId;
    while (id !== null) {
      const f = folders.find((x) => x.id === id);
      if (!f) break;
      chain.unshift(f);
      id = f.parent_id;
    }
    return chain;
  }, [currentFolderId, folders]);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const previewIndex = previewFile
    ? filteredFiles.findIndex((f) => f.key === previewFile.key)
    : -1;

  const navigatePreview = (direction: 1 | -1) => {
    if (!previewFile || previewIndex < 0) return;
    const next = filteredFiles[previewIndex + direction];
    if (next) {
      setPreviewLoaded(false);
      setPreviewFile(next);
    }
  };

  // Ferme l'aperçu avec la touche Échap et navigue avec les flèches
  useEffect(() => {
    if (!previewFile) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview();
      else if (e.key === 'ArrowLeft') navigatePreview(-1);
      else if (e.key === 'ArrowRight') navigatePreview(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewFile, previewIndex]);

  return (
    <div
      className="relative p-4 md:p-6 bg-white min-h-screen"
      onDragEnter={(e) => {
        e.preventDefault();
        if (draggingItem) return;
        dragCounter.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        if (draggingItem) return;
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className="absolute inset-0 z-[60] bg-primary-50/70 backdrop-blur-sm flex items-center justify-center pointer-events-none rounded-lg">
          <div className="flex flex-col items-center gap-3 px-8 py-10 bg-white border-2 border-dashed border-primary-400 rounded-2xl">
            <i className="ri-upload-cloud-2-line text-5xl text-primary-500"></i>
            <p className="text-lg font-semibold font-heading text-foreground-900">Déposez vos fichiers ici</p>
            <p className="text-sm text-foreground-500">Word, Excel, PowerPoint, images, vidéos…</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-foreground-500 hover:text-foreground-800 cursor-pointer transition-colors mb-2"
          >
            <i className="ri-arrow-left-line"></i>
            Retour
          </button>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-folder-line mr-2 text-primary-500"></i>
            File Manager
          </h2>
          <p className="text-sm text-foreground-500 mt-1">
            Gérez vos fichiers et médias — {files.length} fichier{files.length !== 1 ? 's' : ''} · {totalSize}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-background-50 border border-background-200/70 rounded-full p-1">
            <button onClick={() => setViewMode('grid')} className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${viewMode === 'grid' ? 'bg-background-100 text-foreground-900' : 'text-foreground-400'}`}>
              <i className="ri-layout-grid-line"></i>
            </button>
            <button onClick={() => setViewMode('list')} className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${viewMode === 'list' ? 'bg-background-100 text-foreground-900' : 'text-foreground-400'}`}>
              <i className="ri-list-check"></i>
            </button>
          </div>
          <button
            onClick={openCreateFolder}
            className="flex items-center gap-2 px-4 py-2.5 bg-background-100 text-foreground-800 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-background-200/70 transition-colors"
          >
            <i className="ri-folder-add-line"></i>
            Nouveau dossier
          </button>
          <button
            onClick={() => setShowCreateDoc(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-background-100 text-foreground-800 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-background-200/70 transition-colors"
          >
            <i className="ri-file-add-line"></i>
            Nouveau document
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            <i className={`ri-${uploading ? 'loader-4-line animate-spin' : 'upload-line'}`}></i>
            {uploading && uploadProgress
              ? `Upload... ${uploadProgress.done}/${uploadProgress.total}`
              : uploading
                ? 'Upload...'
                : 'Uploader'}
          </button>
          <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
        </div>
      </div>

      {/* Fil d'Ariane */}
      <div className="flex items-center gap-1.5 mb-4 text-sm flex-wrap">
        <button
          onClick={() => setCurrentFolderId(null)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${currentFolderId === null ? 'bg-primary-50 text-primary-700 font-medium' : 'text-foreground-600 hover:bg-background-50'}`}
        >
          <i className="ri-home-4-line"></i>
          Racine
        </button>
        {breadcrumb.map((f) => (
          <span key={f.id} className="flex items-center gap-1.5">
            <i className="ri-arrow-right-s-line text-foreground-300"></i>
            <button
              onClick={() => setCurrentFolderId(f.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${currentFolderId === f.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-foreground-600 hover:bg-background-50'}`}
            >
              <i className="ri-folder-line"></i>
              {f.name}
            </button>
          </span>
        ))}
      </div>

      {uploading && uploadProgress && uploadProgress.total > 1 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-foreground-600">Upload en cours…</span>
            <span className="text-xs text-foreground-500">{uploadProgress.done}/{uploadProgress.total}</span>
          </div>
          <div className="h-1.5 bg-background-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((uploadProgress.done / uploadProgress.total) * 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm rounded-lg mb-4">
          <i className="ri-error-warning-line"></i>
          {error}
          <button onClick={() => setError(null)} className="ml-auto cursor-pointer hover:text-red-900">
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 text-sm rounded-lg mb-4">
          <i className="ri-checkbox-circle-line"></i>
          {notice}
          <button onClick={() => setNotice(null)} className="ml-auto cursor-pointer hover:text-green-900">
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
        <input
          type="text"
          placeholder="Rechercher dans ce dossier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
        />
      </div>

      {totalSelectedCount > 0 && (
        <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg">
          <span className="text-sm font-medium text-foreground-800 whitespace-nowrap">
            {totalSelectedCount} sélectionné{totalSelectedCount > 1 ? 's' : ''}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={clearAllSelection}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-foreground-600 hover:bg-primary-100 cursor-pointer whitespace-nowrap transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={downloadSelected}
              disabled={downloadingDocs}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary-500 text-background-50 text-xs font-medium hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap transition-colors"
            >
              <i className={`ri-${downloadingDocs ? 'loader-4-line animate-spin' : 'download-2-line'}`}></i>
              {downloadingDocs ? 'Téléchargement...' : 'Télécharger'}
            </button>
          </div>
        </div>
      )}

      {/* Dossiers */}
      {filteredFolders.length > 0 && (
        <div className="mb-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground-700 mb-3">
            <i className="ri-folder-line text-primary-500"></i>
            Dossiers ({filteredFolders.length})
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
            {filteredFolders.map((folder) => (
              <div
                key={folder.id}
                draggable
                onDragStart={(e) => startDrag(e, { type: 'folder', folder })}
                onDragEnd={endDrag}
                onClick={() => setCurrentFolderId(folder.id)}
                title={folder.name}
                onDragOver={(e) => {
                  if (!draggingItem) return;
                  if (draggingItem.type === 'folder' && draggingItem.folder.id === folder.id) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDropTargetFolder(folder.id);
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  setDropTargetFolder((cur) => (cur === folder.id ? null : cur));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (draggingItem) performMove(draggingItem, folder.id);
                  endDrag();
                }}
                className={`aspect-square bg-white border rounded-lg flex flex-col items-center justify-center gap-2 p-2 group cursor-pointer transition-colors relative ${
                  dropTargetFolder === folder.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-background-200/70 hover:border-primary-300'
                }`}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50">
                  <i className="ri-folder-3-fill text-3xl text-primary-500"></i>
                </div>
                <p className="text-[11px] font-medium text-foreground-800 truncate w-full text-center">{folder.name}</p>
                <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openRenameFolder(folder); }}
                    className="w-5 h-5 rounded-full bg-background-100 text-foreground-600 flex items-center justify-center hover:bg-background-200/70 cursor-pointer"
                    title="Renommer"
                  >
                    <i className="ri-pencil-line text-[10px]"></i>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'folder', folder }); }}
                    className="w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center cursor-pointer"
                    title="Supprimer"
                  >
                    <i className="ri-delete-bin-line text-[10px]"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {filteredDocs.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground-700">
              <i className="ri-file-text-line text-primary-500"></i>
              Documents ({filteredDocs.length})
            </h3>
            <button
              onClick={toggleSelectAllDocs}
              className="text-xs font-medium text-foreground-500 hover:text-primary-600 cursor-pointer transition-colors whitespace-nowrap"
            >
              {filteredDocs.length > 0 && filteredDocs.every((d) => selectedDocIds.has(d.id))
                ? 'Tout désélectionner'
                : 'Tout sélectionner'}
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
            {filteredDocs.map((doc) => {
              const meta = docTypeMeta[doc.doc_type] || docTypeMeta.word;
              return (
                <div
                  key={doc.id}
                  draggable
                  onDragStart={(e) => startDrag(e, { type: 'doc', doc })}
                  onDragEnd={endDrag}
                  onClick={() => handleDocClick(doc)}
                  title={`${meta.label} — double-cliquez pour ouvrir ou fermer`}
                  className={`aspect-square bg-white border rounded-lg flex flex-col items-center justify-center gap-2 p-2 group cursor-pointer transition-colors relative ${
                    selectedDocIds.has(doc.id)
                      ? 'border-primary-400 ring-2 ring-primary-200'
                      : 'border-background-200/70 hover:border-accent-300'
                  }`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelectDoc(doc.id); }}
                    className={`absolute top-1 left-1 w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${
                      selectedDocIds.has(doc.id)
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'bg-white border-background-300 hover:border-primary-400'
                    }`}
                    title={selectedDocIds.has(doc.id) ? 'Désélectionner' : 'Sélectionner'}
                  >
                    {selectedDocIds.has(doc.id) && <i className="ri-check-line text-xs"></i>}
                  </button>
                  <i className={`${meta.icon} text-3xl ${meta.iconClass}`}></i>
                  <p className="text-[11px] font-medium text-foreground-800 truncate w-full text-center">{doc.name}</p>
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openRenameDocument(doc); }}
                      className="w-5 h-5 rounded-full bg-background-100 text-foreground-600 flex items-center justify-center hover:bg-background-200/70 cursor-pointer"
                      title="Renommer"
                    >
                      <i className="ri-pencil-line text-[10px]"></i>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openMove({ type: 'doc', doc }); }}
                      className="w-5 h-5 rounded-full bg-background-100 text-foreground-600 flex items-center justify-center hover:bg-background-200/70 cursor-pointer"
                      title="Déplacer"
                    >
                      <i className="ri-folder-transfer-line text-[10px]"></i>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'doc', doc }); }}
                      className="w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center cursor-pointer"
                      title="Supprimer"
                    >
                      <i className="ri-delete-bin-line text-[10px]"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>
      ) : filteredFolders.length === 0 && filteredDocs.length === 0 && filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <i className="ri-folder-open-line text-4xl text-foreground-300 mb-3"></i>
          <p className="text-foreground-500">
            {search ? 'Aucun résultat' : currentFolderId === null ? 'Dossier vide — créez un dossier ou uploadez un fichier !' : 'Ce dossier est vide.'}
          </p>
        </div>
      ) : (
        <>
          {filteredFiles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground-700">
                  <i className="ri-file-3-line text-primary-500"></i>
                  Fichiers ({filteredFiles.length})
                </h3>
                {documentFiles.length > 0 && (
                  <button
                    onClick={toggleSelectAllDocFiles}
                    className="text-xs font-medium text-foreground-500 hover:text-primary-600 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    {documentFiles.every((f) => selectedFileKeys.has(f.key))
                      ? 'Tout désélectionner'
                      : 'Tout sélectionner'}
                  </button>
                )}
              </div>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                  {filteredFiles.map((file) => {
                    const fileMeta = getFileTypeMeta(file.extension);
                    const isOffice = detectDocType(file.filename) !== null;
                    return (
                      <div key={file.key} onClick={() => handleFileClick(file)} className={`aspect-square bg-white border rounded-lg overflow-hidden group cursor-pointer relative ${selectedFileKeys.has(file.key) ? 'border-primary-400 ring-2 ring-primary-200' : 'border-background-200/70'}`}>
                        {isImage(file) ? (
                          <img src={file.url} alt={file.filename} className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <i className={`${fileMeta.icon} text-3xl ${fileMeta.iconClass}`}></i>
                          </div>
                        )}
                        {isOffice && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelectDocFile(file.key); }}
                            className={`absolute top-1 left-1 w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors z-10 ${
                              selectedFileKeys.has(file.key)
                                ? 'bg-primary-500 border-primary-500 text-white'
                                : 'bg-white border-background-300 hover:border-primary-400'
                            }`}
                            title={selectedFileKeys.has(file.key) ? 'Désélectionner' : 'Sélectionner'}
                          >
                            {selectedFileKeys.has(file.key) && <i className="ri-check-line text-xs"></i>}
                          </button>
                        )}
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          {isOffice && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditOfficeFile(file); }}
                              disabled={deleting === file.key}
                              className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center cursor-pointer"
                              title="Modifier"
                            >
                              <i className="ri-pencil-line text-[10px]"></i>
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); openMove({ type: 'file', file }); }}
                            className="w-5 h-5 rounded-full bg-background-100 text-foreground-600 flex items-center justify-center hover:bg-background-200/70 cursor-pointer"
                            title="Déplacer"
                          >
                            <i className="ri-folder-transfer-line text-[10px]"></i>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'file', file }); }}
                            disabled={deleting === file.key}
                            className="w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center cursor-pointer"
                            title="Supprimer"
                          >
                            {deleting === file.key ? (
                              <i className="ri-loader-4-line animate-spin text-[10px]"></i>
                            ) : (
                              <i className="ri-delete-bin-line text-[10px]"></i>
                            )}
                          </button>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 px-2 py-1.5 bg-white/90 backdrop-blur-sm">
                          <p className="text-[11px] font-medium text-foreground-800 truncate text-center">{file.filename}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-background-50 border border-background-200/70 rounded-lg divide-y divide-background-200/70">
                  {filteredFiles.map((file) => {
                    const isOffice = detectDocType(file.filename) !== null;
                    return (
                      <div key={file.key} draggable onDragStart={(e) => startDrag(e, { type: 'file', file })} onDragEnd={endDrag} onClick={() => handleFileClick(file)} className="flex items-center gap-3 px-4 py-3 hover:bg-background-50/50 cursor-pointer">
                        {isOffice && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelectDocFile(file.key); }}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 ${
                              selectedFileKeys.has(file.key)
                                ? 'bg-primary-500 border-primary-500 text-white'
                                : 'bg-white border-background-300 hover:border-primary-400'
                            }`}
                            title={selectedFileKeys.has(file.key) ? 'Désélectionner' : 'Sélectionner'}
                          >
                            {selectedFileKeys.has(file.key) && <i className="ri-check-line text-xs"></i>}
                          </button>
                        )}
                        <div className="w-8 h-8 rounded bg-background-100 flex items-center justify-center flex-shrink-0">
                          {isImage(file) ? (
                            <img src={file.url} alt="" className="w-full h-full object-cover rounded" loading="lazy" />
                          ) : (
                            <i className={`${getFileTypeMeta(file.extension).icon} ${getFileTypeMeta(file.extension).iconClass}`}></i>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground-800 truncate">{file.filename}</p>
                          <p className="text-xs text-foreground-400">{file.sizeFormatted} · {file.extension.toUpperCase()}</p>
                        </div>
                        {isOffice && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditOfficeFile(file); }}
                            disabled={deleting === file.key}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-400 hover:text-primary-600 cursor-pointer"
                            title="Modifier"
                          >
                            <i className="ri-pencil-line text-sm"></i>
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); openMove({ type: 'file', file }); }}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-400 hover:text-foreground-600 cursor-pointer"
                          title="Déplacer"
                        >
                          <i className="ri-folder-transfer-line text-sm"></i>
                        </button>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-400 hover:text-foreground-600 cursor-pointer"
                          title="Télécharger"
                        >
                          <i className="ri-download-line text-sm"></i>
                        </a>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'file', file }); }}
                          disabled={deleting === file.key}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-400 hover:text-red-500 cursor-pointer"
                          title="Supprimer"
                        >
                          {deleting === file.key ? (
                            <i className="ri-loader-4-line animate-spin text-sm"></i>
                          ) : (
                            <i className="ri-delete-bin-line text-sm"></i>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal d'aperçu */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closePreview}
          ></div>
          <div className="relative w-full max-w-3xl bg-background-50 rounded-xl overflow-hidden animate-scale-in">
            {previewIndex > 0 && (
              <button
                onClick={() => navigatePreview(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
                title="Fichier précédent"
              >
                <i className="ri-arrow-left-s-line text-xl"></i>
              </button>
            )}
            {previewIndex < filteredFiles.length - 1 && (
              <button
                onClick={() => navigatePreview(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
                title="Fichier suivant"
              >
                <i className="ri-arrow-right-s-line text-xl"></i>
              </button>
            )}
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-background-200/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <i className={`${isImage(previewFile) ? 'ri-image-line' : isVideo(previewFile) ? 'ri-video-line' : 'ri-file-3-line'} text-lg text-primary-500 flex-shrink-0`}></i>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground-950 truncate">{previewFile.filename}</p>
                  <p className="text-xs text-foreground-500">
                    {previewFile.sizeFormatted} · {previewFile.extension.toUpperCase() || 'Fichier'}
                    {previewFile.lastModified ? ` · ${new Date(previewFile.lastModified).toLocaleString('fr-FR')}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {detectDocType(previewFile.filename) && (
                  <button
                    onClick={() => handleEditOfficeFile(previewFile)}
                    disabled={deleting === previewFile.key}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-500 text-background-50 text-sm font-medium whitespace-nowrap hover:bg-accent-600 transition-colors cursor-pointer"
                  >
                    <i className="ri-pencil-line"></i>
                    <span className="hidden sm:inline">Modifier</span>
                  </button>
                )}
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500 text-background-50 text-sm font-medium whitespace-nowrap hover:bg-primary-600 transition-colors cursor-pointer"
                >
                  <i className="ri-download-line"></i>
                  <span className="hidden sm:inline">Télécharger</span>
                </a>
                <button
                  onClick={closePreview}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background-100 text-foreground-500 hover:text-foreground-800 transition-colors cursor-pointer"
                  title="Fermer"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
            </div>

            <div className="bg-background-100 flex items-center justify-center p-4 md:p-6" style={{ maxHeight: '70vh', minHeight: '240px' }}>
              {isImage(previewFile) ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {!previewLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
                    </div>
                  )}
                  <img
                    src={previewFile.url}
                    alt={previewFile.filename}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    onLoad={() => setPreviewLoaded(true)}
                    onError={() => setPreviewLoaded(true)}
                  />
                </div>
              ) : isVideo(previewFile) ? (
                <video
                  src={previewFile.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[60vh] rounded-lg bg-black"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <div className="w-20 h-20 rounded-2xl bg-background-50 border border-background-200/70 flex items-center justify-center">
                    <i className="ri-file-3-line text-4xl text-foreground-300"></i>
                  </div>
                  <p className="mt-4 text-sm font-medium text-foreground-800">{previewFile.filename}</p>
                  <p className="mt-1 text-xs text-foreground-500">
                    Aperçu non disponible pour ce type de fichier ({previewFile.extension.toUpperCase() || 'inconnu'}).
                  </p>
                  <a
                    href={previewFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer"
                  >
                    <i className="ri-download-line"></i>
                    Télécharger le fichier
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Éditeur de document */}
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

      {/* Modal de création de document */}
      {showCreateDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateDoc(false)}
          ></div>
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

      {/* Modal dossier (créer / renommer) */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowFolderModal(false)}
          ></div>
          <div className="relative w-full max-w-sm bg-background-50 rounded-xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold font-heading text-foreground-950">
                {editingFolder ? 'Renommer le dossier' : 'Nouveau dossier'}
              </h3>
              <button
                onClick={() => setShowFolderModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
            <label className="block text-sm text-foreground-500 mb-1.5">Nom du dossier</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitFolder(); }}
              placeholder="Mon dossier"
              autoFocus
              className="w-full px-4 py-2.5 bg-white border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 mb-5"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowFolderModal(false)}
                className="px-4 py-2 rounded-full text-sm text-foreground-600 hover:bg-background-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitFolder}
                disabled={!folderName.trim()}
                className="px-5 py-2 rounded-full bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {editingFolder ? 'Renommer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal renommage de document */}
      {renameDocTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setRenameDocTarget(null)}
          ></div>
          <div className="relative w-full max-w-sm bg-background-50 rounded-xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold font-heading text-foreground-950">Renommer le document</h3>
              <button
                onClick={() => setRenameDocTarget(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
            <label className="block text-sm text-foreground-500 mb-1.5">Nom du document</label>
            <input
              type="text"
              value={renameDocName}
              onChange={(e) => setRenameDocName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitRenameDocument(); }}
              placeholder="Mon document"
              autoFocus
              className="w-full px-4 py-2.5 bg-white border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 mb-5"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRenameDocTarget(null)}
                className="px-4 py-2 rounded-full text-sm text-foreground-600 hover:bg-background-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitRenameDocument}
                disabled={!renameDocName.trim()}
                className="px-5 py-2 rounded-full bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                Renommer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal déplacement */}
      {showMoveModal && moveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMoveModal(false)}
          ></div>
          <div className="relative w-full max-w-sm bg-background-50 rounded-xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold font-heading text-foreground-950">Déplacer vers…</h3>
              <button
                onClick={() => setShowMoveModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-background-200/70 divide-y divide-background-200/70">
              <button
                onClick={() => handleConfirmMove(null)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground-800 hover:bg-background-50 cursor-pointer"
              >
                <i className="ri-home-4-line text-primary-500"></i>
                Racine
              </button>
              {folderTree.map(({ folder, depth }) => (
                <button
                  key={folder.id}
                  onClick={() => handleConfirmMove(folder.id)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground-800 hover:bg-background-50 cursor-pointer"
                  style={{ paddingLeft: `${16 + depth * 20}px` }}
                >
                  <i className="ri-folder-line text-primary-500"></i>
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation de suppression (fichier / document / dossier) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          ></div>
          <div className="relative w-full max-w-sm bg-background-50 rounded-xl p-6 animate-scale-in">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <i className="ri-delete-bin-line text-red-500"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold font-heading text-foreground-950">
                  {deleteTarget.type === 'file'
                    ? 'Supprimer le fichier ?'
                    : deleteTarget.type === 'doc'
                      ? 'Supprimer le document ?'
                      : 'Supprimer le dossier ?'}
                </h3>
                <p className="text-sm text-foreground-500 mt-1">
                  {deleteTarget.type === 'file' ? (
                    <>« {deleteTarget.file.filename} » sera définitivement supprimé.</>
                  ) : deleteTarget.type === 'doc' ? (
                    <>« {deleteTarget.doc.name} » sera définitivement supprimé.</>
                  ) : (
                    <>« {deleteTarget.folder.name} » sera supprimé. Son contenu (fichiers et sous-dossiers) reviendra à la racine.</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-full text-sm text-foreground-600 hover:bg-background-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting !== null}
                className="px-5 py-2 rounded-full bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {deleting !== null ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}