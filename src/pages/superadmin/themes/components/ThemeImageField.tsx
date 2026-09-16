import { useRef, useState } from 'react';
import { uploadMediaFile } from '@/hooks/useUpload';

interface ThemeImageFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  folder?: string;
}

export default function ThemeImageField({
  label,
  value,
  onChange,
  placeholder = 'https://...',
  folder = 'theme-images',
}: ThemeImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadProgress('Upload en cours...');
    setUploading(true);

    try {
      const url = await uploadMediaFile(file, folder);
      onChange(url);
      setUploadProgress('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur upload';
      setUploadError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-foreground-600">{label}</label>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 font-mono placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-10 px-3 rounded-md border border-dashed border-background-300/60 bg-background-100/50 flex items-center justify-center gap-1.5 text-xs font-medium text-foreground-600 hover:text-foreground-800 hover:border-foreground-300/60 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {uploading ? (
            <>
              <i className="ri-loader-4-line animate-spin"></i>
              {uploadProgress}
            </>
          ) : (
            <>
              <i className="ri-upload-cloud-line"></i>
              Uploader
            </>
          )}
        </button>

        {value && (
          <button
            onClick={() => {
              onChange('');
              setUploadError('');
            }}
            title="Retirer l'image"
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-foreground-400 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0"
          >
            <i className="ri-close-line"></i>
          </button>
        )}
      </div>

      {uploadError && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-600">
          <i className="ri-error-warning-line text-xs"></i>
          {uploadError}
        </div>
      )}

      {value && (
        <div className="relative rounded-md overflow-hidden bg-background-100 border border-background-200/70 h-28">
          <img
            src={value}
            alt={label}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
}