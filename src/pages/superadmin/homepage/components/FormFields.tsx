import { useState } from 'react';
import IconPicker from '@/components/feature/IconPicker';
import { uploadMediaFile } from '@/hooks/useUpload';

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground-600 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
      />
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground-600 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2.5 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 resize-y leading-relaxed"
      />
    </div>
  );
}

export function ImageField({
  label,
  value,
  onChange,
  uploadFolder = 'homepage',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  uploadFolder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Seules les images sont acceptées (JPEG, PNG, WebP, GIF)');
      setTimeout(() => setError(null), 4000);
      e.target.value = '';
      return;
    }

    if (file.size > 1024 * 1024) {
      setError("L'image dépasse la limite de 1 Mo");
      setTimeout(() => setError(null), 4000);
      e.target.value = '';
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const url = await uploadMediaFile(file, uploadFolder);
      onChange(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Échec de l'upload";
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-foreground-600 mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-12 rounded-md border border-background-200/70 bg-background-100 overflow-hidden flex-shrink-0">
          {uploading ? (
            <div className="w-full h-full flex items-center justify-center">
              <i className="ri-loader-4-line animate-spin text-foreground-400 text-lg"></i>
            </div>
          ) : value ? (
            <img src={value} alt="" className="w-full h-full object-cover object-top" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <i className="ri-image-line text-foreground-300 text-lg"></i>
            </div>
          )}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... ou uploader une image"
          className="flex-1 h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
        />
        <label className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-background-200/70 text-xs font-medium text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0">
          <i className={`text-sm ${uploading ? 'ri-loader-4-line animate-spin' : 'ri-upload-cloud-line'}`}></i>
          {uploading ? 'Upload...' : 'Uploader'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="w-10 h-10 flex items-center justify-center rounded-md border border-background-200/70 text-foreground-400 hover:text-red-600 hover:bg-red-50/60 transition-colors cursor-pointer flex-shrink-0"
            title="Retirer l'image"
          >
            <i className="ri-close-line"></i>
          </button>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50/70 px-3 py-2 rounded-md flex items-center gap-1.5">
          <i className="ri-error-warning-line"></i>
          {error}
        </p>
      )}
    </div>
  );
}

export function IconField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div>
      <label className="block text-xs font-semibold text-foreground-600 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-md border border-background-200/70 bg-background-100 flex items-center justify-center flex-shrink-0">
          {value ? (
            <i className={`${value} text-lg text-foreground-700`}></i>
          ) : (
            <i className="ri-shape-line text-foreground-300"></i>
          )}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ri-home-line"
          className="flex-1 h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 font-mono"
        />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="h-10 px-3 rounded-md border border-background-200/70 text-xs font-medium text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
        >
          Choisir
        </button>
      </div>
      <IconPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onChange}
        selectedIcon={value}
      />
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground-600 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 cursor-pointer"
      >
        <option value="primary">Primaire</option>
        <option value="accent">Accent</option>
        <option value="secondary">Secondaire</option>
      </select>
    </div>
  );
}

export function SectionHeaderFields({
  badge,
  title,
  subtitle,
  onBadge,
  onTitle,
  onSubtitle,
  showTitle = true,
}: {
  badge: string;
  title: string;
  subtitle: string;
  onBadge: (v: string) => void;
  onTitle: (v: string) => void;
  onSubtitle: (v: string) => void;
  showTitle?: boolean;
}) {
  return (
    <div className="space-y-3">
      <TextField label="Badge (petite étiquette)" value={badge} onChange={onBadge} placeholder="ex : Tout-en-un" />
      {showTitle && (
        <TextAreaField label="Titre" value={title} onChange={onTitle} rows={2} placeholder="Titre de la section" />
      )}
      <TextAreaField label="Sous-titre" value={subtitle} onChange={onSubtitle} rows={2} placeholder="Texte descriptif" />
    </div>
  );
}

export function CardShell({
  title,
  onAdd,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  addLabel = 'Ajouter',
  children,
}: {
  title: string;
  onAdd: () => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground-900">{title}</span>
        <div className="flex items-center gap-1">
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Monter"
            >
              <i className="ri-arrow-up-s-line"></i>
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Descendre"
            >
              <i className="ri-arrow-down-s-line"></i>
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            title="Supprimer"
          >
            <i className="ri-delete-bin-line"></i>
          </button>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-3 w-full h-9 rounded-md border border-dashed border-background-300 text-xs font-medium text-foreground-500 hover:bg-background-100 hover:text-foreground-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
      >
        <i className="ri-add-line"></i>
        {addLabel}
      </button>
    </div>
  );
}