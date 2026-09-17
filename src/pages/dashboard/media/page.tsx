import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { listFiles, deleteFile, uploadToSeaweedFS, formatFileSize, getUserMediaFolder } from '@/lib/seaweedfs';
import type { SeaweedFile } from '@/lib/seaweedfs';

export default function MediaPage() {
  const { user } = useAuth();
  const userRoot = user ? getUserMediaFolder(user.id) : '';
  const [files, setFiles] = useState<SeaweedFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [totalSizeFormatted, setTotalSizeFormatted] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentFolder, setCurrentFolder] = useState('');
  const [previewFile, setPreviewFile] = useState<SeaweedFile | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stripRoot = useCallback((path: string): string => {
    if (!userRoot) return path;
    const prefix = `${userRoot}/`;
    return path.startsWith(prefix) ? path.slice(prefix.length) : path;
  }, [userRoot]);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const prefix = userRoot
        ? (currentFolder ? `${userRoot}/${currentFolder}/` : `${userRoot}/`)
        : (currentFolder ? `${currentFolder}/` : '');
      const data = await listFiles(prefix);
      setFiles(data.files.map((f) => ({ ...f, folder: stripRoot(f.folder) })));
      setFolders(data.folders.map(stripRoot));
      setTotalSize(data.totalSize);
      setTotalSizeFormatted(data.totalSizeFormatted);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [currentFolder, userRoot, stripRoot]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filteredFiles = search
    ? files.filter((f) =>
        f.filename.toLowerCase().includes(search.toLowerCase()) ||
        f.folder.toLowerCase().includes(search.toLowerCase()) ||
        f.extension.toLowerCase().includes(search.toLowerCase())
      )
    : files;

  const toggleSelect = (key: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedItems.size === filteredFiles.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredFiles.map((f) => f.key)));
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const deleteSelected = async () => {
    if (selectedItems.size === 0) return;
    setDeleting(true);

    for (const key of selectedItems) {
      try {
        await deleteFile(key);
      } catch {
        // continue with next file
      }
    }

    setDeleting(false);
    setSelectedItems(new Set());
    fetchFiles();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setUploading(true);

    for (const file of Array.from(uploadedFiles)) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const uploadFolder = userRoot
          ? (currentFolder ? `${userRoot}/${currentFolder}` : userRoot)
          : (currentFolder || 'uploads');
        await uploadToSeaweedFS(uint8, file.name, file.type, uploadFolder);
      } catch {
        // continue with next file
      }
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fetchFiles();
  };

  const navigateToFolder = (folder: string) => {
    setCurrentFolder(folder);
    setSelectedItems(new Set());
  };

  const navigateUp = () => {
    const parts = currentFolder.split('/');
    parts.pop();
    setCurrentFolder(parts.join('/'));
    setSelectedItems(new Set());
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getIconForType = (type: SeaweedFile['type']) => {
    switch (type) {
      case 'image': return 'ri-image-line';
      case 'video': return 'ri-video-line';
      default: return 'ri-file-3-line';
    }
  };

  const getColorForType = (type: SeaweedFile['type']) => {
    switch (type) {
      case 'image': return 'bg-accent-100 text-accent-700';
      case 'video': return 'bg-secondary-100 text-secondary-700';
      default: return 'bg-background-200 text-foreground-500';
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            Médias
          </h2>
          <p className="text-sm text-foreground-500 mt-1">
            {currentFolder ? (
              <span className="flex items-center gap-1 flex-wrap">
                <button onClick={navigateUp} className="hover:text-primary-500 transition-colors cursor-pointer">
                  Mes médias
                </button>
                {currentFolder.split('/').map((part, i, arr) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="text-foreground-300">/</span>
                    <button
                      onClick={() => navigateToFolder(arr.slice(0, i + 1).join('/'))}
                      className={`hover:text-primary-500 transition-colors cursor-pointer ${i === arr.length - 1 ? 'text-foreground-700 font-medium' : ''}`}
                    >
                      {part}
                    </button>
                  </span>
                ))}
              </span>
            ) : (
              'Mes médias (dossier personnel)'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-60"
          >
            <i className={`${uploading ? 'ri-loader-4-line animate-spin' : 'ri-upload-cloud-line'}`}></i>
            {uploading ? 'Import...' : 'Importer'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="text-sm">
          <span className="font-semibold text-foreground-900">{files.length}</span>
          <span className="text-foreground-500 ml-1">fichiers</span>
        </div>
        <div className="text-sm">
          <span className="font-semibold text-foreground-900">{totalSizeFormatted}</span>
          <span className="text-foreground-500 ml-1">total</span>
        </div>
        {folders.length > 0 && (
          <div className="text-sm">
            <span className="font-semibold text-foreground-900">{folders.length}</span>
            <span className="text-foreground-500 ml-1">dossiers</span>
          </div>
        )}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-foreground-500">{selectedItems.size} sélectionné(s)</span>
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-medium cursor-pointer hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
          <input
            type="text"
            placeholder="Rechercher par nom, dossier ou extension..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`w-9 h-9 flex items-center justify-center rounded-md border cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-background-200/70 text-foreground-400 hover:text-foreground-600'}`}
          >
            <i className="ri-layout-grid-line"></i>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`w-9 h-9 flex items-center justify-center rounded-md border cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-background-200/70 text-foreground-400 hover:text-foreground-600'}`}
          >
            <i className="ri-list-check"></i>
          </button>
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-md border border-background-200/70 text-foreground-400 hover:text-foreground-600 cursor-pointer transition-colors"
            title="Rafraîchir"
          >
            <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* Folders */}
      {folders.length > 0 && !currentFolder && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-foreground-400 uppercase tracking-wider mb-3">Dossiers</h3>
          <div className="flex flex-wrap gap-2">
            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() => navigateToFolder(folder)}
                className="flex items-center gap-2 px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-700 hover:text-primary-600 hover:border-primary-200 cursor-pointer transition-colors"
              >
                <i className="ri-folder-3-line text-accent-500"></i>
                <span>{folder}</span>
                <span className="text-xs text-foreground-400">
                  ({files.filter((f) => f.folder === folder).length})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
          <p className="text-foreground-600 mb-3">{error}</p>
          <button onClick={fetchFiles} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          {search ? (
            <>
              <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
                <i className="ri-search-line text-2xl text-foreground-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-foreground-800 mb-1">Aucun résultat</h3>
              <p className="text-sm text-foreground-500 mb-4">Essayez un autre terme de recherche</p>
              <button onClick={() => setSearch('')} className="text-sm text-primary-500 hover:text-primary-600 cursor-pointer">
                Effacer la recherche
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
                <i className="ri-folder-open-line text-2xl text-foreground-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-foreground-800 mb-1">Aucun fichier</h3>
              <p className="text-sm text-foreground-500 mb-4">Votre dossier médias est vide. Importez vos premiers fichiers !</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 transition-colors"
              >
                <i className="ri-upload-cloud-line"></i>
                Importer des fichiers
              </button>
            </>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredFiles.map((file) => {
            const isSelected = selectedItems.has(file.key);
            return (
              <div
                key={file.key}
                className={`group relative bg-background-50 border rounded-lg overflow-hidden transition-all ${
                  isSelected ? 'border-primary-400 ring-2 ring-primary-200' : 'border-background-200/70 hover:border-background-300/60'
                }`}
              >
                {/* Preview area */}
                <div
                  className="aspect-square bg-background-100 overflow-hidden cursor-pointer relative"
                  onClick={() => setPreviewFile(file)}
                >
                  {file.type === 'image' ? (
                    <img
                      src={file.url}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 flex items-center justify-center ${file.type === 'image' ? 'hidden' : ''}`}>
                    <div className={`w-12 h-12 rounded-full ${getColorForType(file.type)} flex items-center justify-center`}>
                      <i className={`${getIconForType(file.type)} text-xl`}></i>
                    </div>
                  </div>

                  {/* Hover overlay */}
                  <div className={`absolute inset-0 bg-primary-500/10 transition-opacity flex items-center justify-center gap-2 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); copyUrl(file.url); }}
                      className="w-8 h-8 rounded-full bg-background-50/90 flex items-center justify-center hover:bg-background-50 transition-colors cursor-pointer"
                      title="Copier l'URL"
                    >
                      <i className={`text-xs ${copiedUrl === file.url ? 'ri-check-line text-accent-500' : 'ri-file-copy-line text-foreground-600'}`}></i>
                    </button>
                  </div>

                  {/* Selection checkbox */}
                  <button
                    onClick={(ev) => { ev.stopPropagation(); toggleSelect(file.key); }}
                    className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                      isSelected ? 'bg-primary-500 border-primary-500' : 'border-background-300/60 bg-background-50/80 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isSelected && <i className="ri-check-line text-white text-xs"></i>}
                  </button>
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <div className="text-xs font-medium text-foreground-800 truncate" title={file.filename}>
                    {file.filename}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${getColorForType(file.type)}`}>
                      {file.extension.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-foreground-400">{file.sizeFormatted}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
          {/* List header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-background-200/70 bg-background-100 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
            <div className="col-span-1">
              <button onClick={selectAll} className="hover:text-foreground-800 cursor-pointer">
                {selectedItems.size === filteredFiles.length && filteredFiles.length > 0 ? 'Désélectionner' : 'Tout'}
              </button>
            </div>
            <div className="col-span-3">Fichier</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Taille</div>
            <div className="col-span-2">Dossier</div>
            <div className="col-span-2">Date</div>
          </div>
          <div className="divide-y divide-background-200/70">
            {filteredFiles.map((file) => (
              <div
                key={file.key}
                className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-3 items-center hover:bg-background-50/50 transition-colors cursor-pointer ${
                  selectedItems.has(file.key) ? 'bg-primary-50/50' : ''
                }`}
                onClick={() => setPreviewFile(file)}
              >
                {/* Checkbox + preview */}
                <div className="md:col-span-1 flex items-center gap-3">
                  <button
                    onClick={(ev) => { ev.stopPropagation(); toggleSelect(file.key); }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                      selectedItems.has(file.key) ? 'bg-primary-500 border-primary-500' : 'border-background-300/60'
                    }`}
                  >
                    {selectedItems.has(file.key) && <i className="ri-check-line text-white text-[10px]"></i>}
                  </button>
                  <div className="w-10 h-10 rounded bg-background-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {file.type === 'image' ? (
                      <img src={file.url} alt={file.filename} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className={`w-6 h-6 rounded-full ${getColorForType(file.type)} flex items-center justify-center`}>
                        <i className={`${getIconForType(file.type)} text-xs`}></i>
                      </div>
                    )}
                  </div>
                </div>

                {/* Filename */}
                <div className="md:col-span-3">
                  <span className="text-sm font-medium text-foreground-900 truncate block" title={file.filename}>
                    {file.filename}
                  </span>
                </div>

                {/* Type */}
                <div className="md:col-span-2">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded ${getColorForType(file.type)}`}>
                    {file.extension.toUpperCase()}
                  </span>
                </div>

                {/* Size */}
                <div className="md:col-span-2">
                  <span className="text-sm text-foreground-600">{file.sizeFormatted}</span>
                </div>

                {/* Folder */}
                <div className="md:col-span-2">
                  <span className="text-xs text-foreground-400">{file.folder || '-'}</span>
                </div>

                {/* Date + actions */}
                <div className="md:col-span-2 flex items-center gap-2">
                  <span className="text-xs text-foreground-400 truncate">{formatDate(file.lastModified)}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={(ev) => { ev.stopPropagation(); copyUrl(file.url); }}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-100 transition-colors cursor-pointer"
                      title="Copier l'URL"
                    >
                      <i className={`text-xs ${copiedUrl === file.url ? 'ri-check-line text-accent-500' : 'ri-file-copy-line text-foreground-400'}`}></i>
                    </button>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(ev) => ev.stopPropagation()}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-100 transition-colors cursor-pointer"
                      title="Ouvrir"
                    >
                      <i className="ri-external-link-line text-xs text-foreground-400"></i>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredFiles.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-foreground-500">
          <span>
            {filteredFiles.length} fichier{filteredFiles.length > 1 ? 's' : ''}
            {search && files.length !== filteredFiles.length && ` sur ${files.length}`}
          </span>
        </div>
      )}

      {/* Preview modal */}
      {previewFile && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <div
              className="relative max-w-4xl w-full max-h-[90vh] bg-background-50 rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-background-200/70">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded ${getColorForType(previewFile.type)} flex items-center justify-center flex-shrink-0`}>
                    <i className={`${getIconForType(previewFile.type)} text-sm`}></i>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground-900 truncate">{previewFile.filename}</h3>
                    <p className="text-xs text-foreground-400">{previewFile.sizeFormatted} - {previewFile.extension.toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyUrl(previewFile.url)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer"
                    title="Copier l'URL"
                  >
                    <i className={`text-sm ${copiedUrl === previewFile.url ? 'ri-check-line text-accent-500' : 'ri-file-copy-line text-foreground-500'}`}></i>
                  </button>
                  <a
                    href={previewFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer"
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <i className="ri-external-link-line text-sm text-foreground-500"></i>
                  </a>
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer"
                  >
                    <i className="ri-close-line text-sm text-foreground-500"></i>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center p-4 bg-background-100 min-h-[300px] max-h-[70vh] overflow-auto">
                {previewFile.type === 'image' ? (
                  <img
                    src={previewFile.url}
                    alt={previewFile.filename}
                    className="max-w-full max-h-[65vh] object-contain rounded-lg"
                  />
                ) : previewFile.type === 'video' ? (
                  <video
                    src={previewFile.url}
                    controls
                    className="max-w-full max-h-[65vh] rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <div className={`w-16 h-16 rounded-full ${getColorForType(previewFile.type)} flex items-center justify-center`}>
                      <i className={`${getIconForType(previewFile.type)} text-2xl`}></i>
                    </div>
                    <p className="text-sm text-foreground-500">Aperçu non disponible pour ce type de fichier</p>
                    <a
                      href={previewFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-500 hover:text-primary-600 cursor-pointer"
                    >
                      Ouvrir dans un nouvel onglet
                    </a>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-background-200/70 bg-background-50">
                <div className="flex flex-wrap gap-4 text-xs text-foreground-500">
                  <span>Chemin: {previewFile.key}</span>
                  <span>Taille: {previewFile.sizeFormatted}</span>
                  {previewFile.lastModified && <span>Modifié: {formatDate(previewFile.lastModified)}</span>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}