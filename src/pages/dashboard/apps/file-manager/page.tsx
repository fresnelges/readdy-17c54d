import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { listFiles, uploadToSeaweedFS, deleteFile, formatFileSize, type SeaweedFile } from '@/lib/seaweedfs';

export default function FileManagerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<SeaweedFile[]>([]);
  const [totalSize, setTotalSize] = useState<string>('0 o');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setError('Erreur lors du chargement des fichiers SeaweedFS');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const folder = `file-manager/${user.id}`;
      await uploadToSeaweedFS(uint8, file.name, file.type, folder);
      await fetchFiles();
    } catch (err) {
      setError('Erreur lors de l\'upload vers SeaweedFS');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (file: SeaweedFile) => {
    setDeleting(file.key);
    setError(null);
    try {
      await deleteFile(file.key);
      setFiles((prev) => prev.filter((f) => f.key !== file.key));
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
    setDeleting(null);
  };

  const isImage = (file: SeaweedFile) => file.type === 'image';
  const isVideo = (file: SeaweedFile) => file.type === 'video';

  const filtered = files.filter((f) => f.filename.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-background-50 border border-background-200/70 rounded-full p-1">
            <button onClick={() => setViewMode('grid')} className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${viewMode === 'grid' ? 'bg-background-100 text-foreground-900' : 'text-foreground-400'}`}>
              <i className="ri-layout-grid-line"></i>
            </button>
            <button onClick={() => setViewMode('list')} className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${viewMode === 'list' ? 'bg-background-100 text-foreground-900' : 'text-foreground-400'}`}>
              <i className="ri-list-check"></i>
            </button>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            <i className={`ri-${uploading ? 'loader-4-line animate-spin' : 'upload-line'}`}></i>
            {uploading ? 'Upload...' : 'Uploader'}
          </button>
          <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" />
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

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
        <input
          type="text"
          placeholder="Rechercher un fichier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <i className="ri-folder-open-line text-4xl text-foreground-300 mb-3"></i>
          <p className="text-foreground-500">{search ? 'Aucun résultat' : 'Aucun fichier — uploadez votre premier fichier !'}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((file) => (
            <div key={file.key} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden group">
              <div className="aspect-square bg-background-100 flex items-center justify-center relative">
                {isImage(file) ? (
                  <img src={file.url} alt={file.filename} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : isVideo(file) ? (
                  <div className="flex flex-col items-center gap-1">
                    <i className="ri-video-line text-3xl text-foreground-300"></i>
                    <span className="text-[10px] text-foreground-400 uppercase">{file.extension}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <i className="ri-file-3-line text-3xl text-foreground-300"></i>
                    <span className="text-[10px] text-foreground-400 uppercase">{file.extension}</span>
                  </div>
                )}
                <button
                  onClick={() => handleDelete(file)}
                  disabled={deleting === file.key}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {deleting === file.key ? (
                    <i className="ri-loader-4-line animate-spin text-xs"></i>
                  ) : (
                    <i className="ri-delete-bin-line text-xs"></i>
                  )}
                </button>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-medium text-foreground-800 truncate">{file.filename}</p>
                <p className="text-[10px] text-foreground-400">{file.sizeFormatted}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-background-50 border border-background-200/70 rounded-lg divide-y divide-background-200/70">
          {filtered.map((file) => (
            <div key={file.key} className="flex items-center gap-3 px-4 py-3 hover:bg-background-50/50">
              <div className="w-8 h-8 rounded bg-background-100 flex items-center justify-center flex-shrink-0">
                {isImage(file) ? (
                  <img src={file.url} alt="" className="w-full h-full object-cover rounded" loading="lazy" />
                ) : isVideo(file) ? (
                  <i className="ri-video-line text-foreground-400"></i>
                ) : (
                  <i className="ri-file-3-line text-foreground-400"></i>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground-800 truncate">{file.filename}</p>
                <p className="text-xs text-foreground-400">{file.sizeFormatted} · {file.extension.toUpperCase()}</p>
              </div>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-400 hover:text-foreground-600 cursor-pointer"
                title="Télécharger"
              >
                <i className="ri-download-line text-sm"></i>
              </a>
              <button
                onClick={() => handleDelete(file)}
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
          ))}
        </div>
      )}
    </div>
  );
}