import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { uploadToSeaweedFS, formatFileSize, deleteFile as deleteS3File } from '@/lib/seaweedfs';
import { getAccountStorage, DEFAULT_STORAGE_LIMIT_BYTES, type AccountStorage } from '@/lib/storageQuota';
import { useAuth } from '@/hooks/useAuth';
import type { CourseFile } from '@/pages/dashboard/apps/formation/detail/types';

interface Props {
  formationId: number;
  files: CourseFile[];
  onChanged: () => void;
}

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_DOC_BYTES = 50 * 1024 * 1024;

function detectCategory(file: File): 'video' | 'pdf' | 'word' | 'other' {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (file.type.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (ext === 'pdf' || file.type === 'application/pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext) || file.type.includes('word') || file.type.includes('officedocument.wordprocessingml')) return 'word';
  return 'other';
}

function fileIcon(type: string): string {
  if (type === 'video') return 'ri-video-line';
  if (type === 'pdf') return 'ri-file-pdf-line';
  if (type === 'word') return 'ri-file-word-line';
  return 'ri-file-line';
}

function barColor(percentUsed: number): string {
  if (percentUsed >= 90) return 'bg-red-500';
  if (percentUsed >= 70) return 'bg-amber-500';
  return 'bg-primary-500';
}

export default function FilesSection({ formationId, files, onChanged }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [storage, setStorage] = useState<AccountStorage | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshStorage = useCallback(async () => {
    if (!user?.id) return;
    try {
      const s = await getAccountStorage(user.id);
      setStorage(s);
    } catch {
      // en cas d'erreur, on conserve la dernière valeur connue
    }
  }, [user?.id]);

  useEffect(() => {
    refreshStorage();
  }, [refreshStorage, files]);

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setUploading(true);
    setError('');
    try {
      let remaining = storage?.remainingBytes ?? DEFAULT_STORAGE_LIMIT_BYTES;

      for (const file of Array.from(list)) {
        const category = detectCategory(file);
        const maxSize = category === 'video' ? MAX_VIDEO_BYTES : MAX_DOC_BYTES;

        if (file.size > maxSize) {
          setError(`« ${file.name} » dépasse la limite de ${category === 'video' ? '200 Mo' : '50 Mo'}.`);
          continue;
        }

        if (file.size > remaining) {
          setError(`Stockage insuffisant : vous avez atteint la limite de ${formatFileSize(storage?.limitBytes ?? DEFAULT_STORAGE_LIMIT_BYTES)} du compte. Achetez plus de stockage pour ajouter ce fichier.`);
          break;
        }

        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const url = await uploadToSeaweedFS(uint8, file.name, file.type, `formations/${formationId}`);
        const { error: err } = await supabase.from('fichierscours').insert({
          cours_id: formationId,
          chapitre_id: null,
          lecon_id: null,
          nom_fichier: file.name,
          path: url,
          type: category,
          taille: file.size,
        });
        if (err) {
          setError(err.message);
          continue;
        }
        remaining -= file.size;
      }

      await refreshStorage();
      onChanged();
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de l\u2019envoi du fichier');
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = async (f: CourseFile) => {
    if (!window.confirm(`Supprimer le fichier « ${f.nom_fichier} » ?`)) return;
    setError('');
    try {
      const key = f.path.split('/').slice(3).join('/');
      if (key) await deleteS3File(key);
    } catch {
      // ignore deletion failure, still remove DB entry
    }
    await supabase.from('fichierscours').delete().eq('id', f.id);
    await refreshStorage();
    onChanged();
  };

  const quotaFull = storage ? storage.remainingBytes <= 0 : false;

  return (
    <section className="bg-background-50 border border-background-200/70 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-foreground-900">
          <i className="ri-folder-open-line mr-2 text-primary-500"></i>
          Fichiers &amp; médias
        </h4>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || quotaFull}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          {uploading ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-upload-2-line"></i>}
          {uploading ? 'Envoi…' : 'Ajouter un fichier'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="video/mp4,video/webm,video/mov,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {storage && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-foreground-500">Stockage du compte</span>
            <span className="text-xs font-medium text-foreground-700">
              {formatFileSize(storage.usedBytes)} / {formatFileSize(storage.limitBytes)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-background-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor(storage.percentUsed)}`}
              style={{ width: `${Math.max(2, storage.percentUsed)}%` }}
            />
          </div>
          <p className="text-[11px] text-foreground-400 mt-1.5">
            {storage.remainingBytes > 0
              ? `${formatFileSize(storage.remainingBytes)} restants`
              : `Limite de ${formatFileSize(storage.limitBytes)} atteinte`}
            {' · '}chaque compte pro dispose de {formatFileSize(storage.limitBytes)}, extensibles sur demande.
          </p>
        </div>
      )}

      {quotaFull && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm text-red-700">Votre stockage ({formatFileSize(storage.limitBytes)}) est plein. Achetez plus de stockage pour ajouter de nouveaux fichiers.</p>
          <button
            onClick={() => navigate('/dashboard/storage')}
            className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-red-600 transition-colors"
          >
            Acheter plus de stockage
          </button>
        </div>
      )}

      <p className="text-xs text-foreground-500 mb-4">
        Ajoutez vos vidéos (jusqu'à 200 Mo), PDF et documents Word (jusqu'à 50 Mo) pour enrichir la formation.
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {files.length === 0 ? (
        <div className="text-center py-8 text-sm text-foreground-500">
          Aucun fichier ajouté pour le moment.
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 p-3 border border-background-200/70 rounded-lg hover:bg-background-100/50 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-background-100 flex items-center justify-center text-lg text-foreground-600 flex-shrink-0">
                <i className={fileIcon(f.type)}></i>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground-800 truncate">{f.nom_fichier}</p>
                <p className="text-xs text-foreground-400">
                  {f.type === 'video' ? 'Vidéo' : f.type === 'pdf' ? 'PDF' : f.type === 'word' ? 'Word' : 'Fichier'}
                  {' · '}{formatFileSize(f.taille)}
                </p>
              </div>
              {f.type === 'video' ? (
                <a
                  href={f.path}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:text-primary-600 cursor-pointer"
                  title="Lire"
                >
                  <i className="ri-play-circle-line text-lg"></i>
                </a>
              ) : (
                <a
                  href={f.path}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:text-primary-600 cursor-pointer"
                  title="Ouvrir"
                >
                  <i className="ri-external-link-line text-lg"></i>
                </a>
              )}
              <button
                onClick={() => removeFile(f)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer"
                title="Supprimer"
              >
                <i className="ri-delete-bin-line"></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}