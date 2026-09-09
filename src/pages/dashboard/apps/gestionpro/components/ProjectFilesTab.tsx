import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadToSeaweedFS } from '@/lib/seaweedfs';

interface ProjectFile {
  id: number;
  nom: string;
  chemin: string;
  type: string;
  taille: number;
  id_user: number;
  idprojet: number;
  dossier_id: number | null;
  created_at: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getFileIcon(mime: string): string {
  if (mime.startsWith('image/')) return 'ri-image-line';
  if (mime.startsWith('video/')) return 'ri-video-line';
  if (mime.includes('pdf')) return 'ri-file-pdf-line';
  if (mime.includes('word') || mime.includes('document')) return 'ri-file-word-line';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return 'ri-file-excel-line';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return 'ri-file-zip-line';
  return 'ri-file-line';
}

function getFileColor(mime: string): string {
  if (mime.startsWith('image/')) return 'text-accent-500';
  if (mime.startsWith('video/')) return 'text-red-500';
  if (mime.includes('pdf')) return 'text-red-500';
  if (mime.includes('word') || mime.includes('document')) return 'text-primary-500';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return 'text-secondary-500';
  return 'text-foreground-400';
}

interface ProjectFilesTabProps {
  projectId: number;
  userId: number;
}

export default function ProjectFilesTab({ projectId, userId }: ProjectFilesTabProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('projetfichier')
        .select('*')
        .eq('idprojet', projectId)
        .order('created_at', { ascending: false });
      setFiles(data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress('Préparation du fichier...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      setUploadProgress('Envoi en cours...');
      const folder = `projets/${projectId}`;
      const publicUrl = await uploadToSeaweedFS(uint8, file.name, file.type, folder);

      setUploadProgress('Enregistrement...');
      await supabase.from('projetfichier').insert({
        nom: file.name,
        chemin: publicUrl,
        type: file.type || 'application/octet-stream',
        taille: file.size,
        id_user: userId,
        idprojet: projectId,
        dossier_id: null,
        created_at: new Date().toISOString(),
      });

      setUploadProgress('');
      fetchFiles();
    } catch (err: any) {
      setUploadProgress('');
      alert(err?.message || 'Erreur lors du téléchargement');
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (fileId: number) => {
    await supabase.from('projetfichier').delete().eq('id', fileId);
    fetchFiles();
  };

  const handleDownload = (file: ProjectFile) => {
    window.open(file.chemin, '_blank');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground-900">
          {files.length} fichier{files.length > 1 ? 's' : ''}
        </h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
            id="project-file-upload"
          />
          <label
            htmlFor="project-file-upload"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap transition-colors ${
              uploading
                ? 'bg-background-100 text-foreground-400 cursor-not-allowed'
                : 'bg-primary-500 text-background-50 hover:bg-primary-600'
            }`}
          >
            {uploading ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                {uploadProgress || 'Envoi...'}
              </>
            ) : (
              <>
                <i className="ri-upload-line"></i>Ajouter un fichier
              </>
            )}
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <i className="ri-loader-4-line animate-spin text-xl text-primary-500"></i>
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center py-16 bg-background-50 border border-background-200/70 rounded-lg">
          <i className="ri-folder-open-line text-3xl text-foreground-300 mb-2"></i>
          <p className="text-sm text-foreground-500">Aucun fichier</p>
          <p className="text-xs text-foreground-400 mt-1">Ajoutez des fichiers liés à ce projet</p>
        </div>
      ) : (
        <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-background-100 border-b border-background-200/70 text-xs font-medium text-foreground-500">
            <span className="col-span-4">Nom</span>
            <span className="col-span-2">Type</span>
            <span className="col-span-2">Taille</span>
            <span className="col-span-2">Date</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>
          <div>
            {files.map((file) => (
              <div
                key={file.id}
                className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-background-200/70 last:border-b-0 items-center text-xs hover:bg-background-50/50 transition-colors group"
              >
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  <i className={`${getFileIcon(file.type)} ${getFileColor(file.type)} text-base flex-shrink-0`}></i>
                  <span className="text-foreground-900 truncate font-medium" title={file.nom}>{file.nom}</span>
                </div>
                <span className="col-span-2 text-foreground-500">{file.type.split('/')[1] || file.type}</span>
                <span className="col-span-2 text-foreground-500">{formatSize(file.taille)}</span>
                <span className="col-span-2 text-foreground-400">
                  {new Date(file.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleDownload(file)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-300 hover:text-primary-500 cursor-pointer transition-colors"
                    title="Télécharger"
                  >
                    <i className="ri-download-line text-xs"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                    title="Supprimer"
                  >
                    <i className="ri-delete-bin-line text-xs"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}