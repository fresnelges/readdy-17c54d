import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface FieldOption {
  id: string;
  value: string;
}

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: FieldOption[];
  placeholder: string;
  dbId?: number;
}

interface FieldTypeDef {
  type: string;
  label: string;
  icon: string;
}

const FIELD_TYPES: FieldTypeDef[] = [
  { type: 'heading', label: 'Titre de section', icon: 'ri-heading' },
  { type: 'text', label: 'Texte court', icon: 'ri-text' },
  { type: 'textarea', label: 'Texte long', icon: 'ri-align-left' },
  { type: 'email', label: 'Email', icon: 'ri-mail-line' },
  { type: 'number', label: 'Nombre', icon: 'ri-hashtag' },
  { type: 'tel', label: 'Téléphone', icon: 'ri-phone-line' },
  { type: 'date', label: 'Date', icon: 'ri-calendar-line' },
  { type: 'select', label: 'Liste déroulante', icon: 'ri-list-check' },
  { type: 'radio', label: 'Choix unique', icon: 'ri-radio-button-line' },
  { type: 'checkbox', label: 'Cases à cocher', icon: 'ri-checkbox-line' },
  { type: 'file', label: 'Fichier', icon: 'ri-upload-line' },
];

function genId(): string {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function newField(type: string, label: string): FormField {
  const hasOptions = ['select', 'radio', 'checkbox'].includes(type);
  return {
    id: genId(),
    label,
    type,
    required: false,
    options: hasOptions
      ? [{ id: genId(), value: '' }, { id: genId(), value: '' }]
      : [],
    placeholder: '',
  };
}

export default function FormBuilderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: formIdParam } = useParams<{ id: string }>();

  const isEditMode = Boolean(formIdParam);
  const formId = formIdParam ? parseInt(formIdParam, 10) : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [draggedType, setDraggedType] = useState<string | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState(isEditMode);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  // ---- Reorder drag state ----
  const [dragReorderIdx, setDragReorderIdx] = useState<number | null>(null);
  const [dragOverReorderIdx, setDragOverReorderIdx] = useState<number | null>(null);

  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingLabelId && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [editingLabelId]);

  // ---- Load existing form data for edit mode ----
  useEffect(() => {
    if (!isEditMode || !formId) return;

    const loadForm = async () => {
      setLoadingForm(true);
      try {
        const { data: formData, error: formErr } = await supabase
          .from('forms')
          .select('*')
          .eq('id', formId)
          .maybeSingle();

        if (formErr) throw formErr;
        if (!formData) {
          setError('Formulaire introuvable.');
          setLoadingForm(false);
          return;
        }

        setTitle(formData.title || '');
        setDescription(formData.description || '');
        setCoverImage(formData.coverimage || '');

        const { data: fieldData, error: fieldErr } = await supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', formId)
          .order('position', { ascending: true });

        if (fieldErr) throw fieldErr;

        if (fieldData && fieldData.length > 0) {
          const loadedFields: FormField[] = fieldData.map((f: Record<string, unknown>) => {
            const fieldType = (f.type as string) || 'text';
            const hasOptions = ['select', 'radio', 'checkbox'].includes(fieldType);
            const opts = typeof f.options === 'string' && f.options
              ? (f.options as string).split('|').map((v, i) => ({
                  id: genId() + '_' + i,
                  value: v,
                }))
              : hasOptions
                ? [{ id: genId(), value: '' }, { id: genId(), value: '' }]
                : [];

            return {
              id: genId(),
              dbId: f.id as number,
              label: (f.label as string) || '',
              type: fieldType,
              required: (f.required as boolean) || false,
              options: opts,
              placeholder: '',
            };
          });
          setFields(loadedFields);
        }
      } catch {
        setError('Erreur lors du chargement du formulaire.');
      }
      setLoadingForm(false);
    };

    loadForm();
  }, [isEditMode, formId]);

  // ---- Add field from palette ----
  const handleDragStart = useCallback((e: React.DragEvent, type: string) => {
    setDraggedType(type);
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedType(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (!type) return;
    const def = FIELD_TYPES.find((ft) => ft.type === type);
    if (!def) return;
    const label = type === 'textarea' ? 'Zone de texte' : type === 'heading' ? 'Nouvelle section' : def.label;
    const newId = genId();
    setFields((prev) => [...prev, newField(type, label)]);
    setDraggedType(null);
    setTimeout(() => {
      setEditingFieldId(newId);
    }, 100);
  }, []);

  const handleClickAddField = useCallback((type: string) => {
    const def = FIELD_TYPES.find((ft) => ft.type === type);
    if (!def) return;
    const label = type === 'textarea' ? 'Zone de texte' : type === 'heading' ? 'Nouvelle section' : def.label;
    const newId = genId();
    setFields((prev) => [...prev, newField(type, label)]);
    setTimeout(() => {
      setEditingFieldId(newId);
    }, 100);
    setShowMobilePalette(false);
  }, []);

  // ---- Reorder via drag & drop ----
  const handleReorderDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragReorderIdx(index);
    e.dataTransfer.setData('text/reorder', String(index));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleReorderDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverReorderIdx(index);
  }, []);

  const handleReorderDragLeave = useCallback(() => {
    setDragOverReorderIdx(null);
  }, []);

  const handleReorderDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData('text/reorder'), 10);
    if (isNaN(fromIdx) || fromIdx === targetIndex) {
      setDragReorderIdx(null);
      setDragOverReorderIdx(null);
      return;
    }
    setFields((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(targetIndex, 0, item);
      return arr;
    });
    setDragReorderIdx(null);
    setDragOverReorderIdx(null);
  }, []);

  const handleReorderDragEnd = useCallback(() => {
    setDragReorderIdx(null);
    setDragOverReorderIdx(null);
  }, []);

  // ---- Field actions ----
  const handleRemoveField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (editingFieldId === id) setEditingFieldId(null);
    if (editingLabelId === id) setEditingLabelId(null);
  }, [editingFieldId, editingLabelId]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setFields((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setFields((prev) => {
      if (index >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  }, []);

  const handleDuplicateField = useCallback((id: string) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const original = prev[idx];
      const cloned: FormField = {
        ...original,
        id: genId(),
        label: original.label + ' (copie)',
        dbId: undefined,
        options: original.options.map((o) => ({ ...o, id: genId() })),
      };
      const arr = [...prev];
      arr.splice(idx + 1, 0, cloned);
      return arr;
    });
  }, []);

  const handleFieldChange = useCallback((id: string, key: keyof FormField, value: unknown) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)),
    );
  }, []);

  // ---- Inline label editing ----
  const startEditingLabel = useCallback((id: string) => {
    setEditingLabelId(id);
  }, []);

  const commitLabel = useCallback(() => {
    setEditingLabelId(null);
  }, []);

  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingLabelId(null);
    }
    if (e.key === 'Escape') {
      setEditingLabelId(null);
    }
  }, []);

  // ---- Options management ----
  const handleAddOption = useCallback((fieldId: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? { ...f, options: [...f.options, { id: genId(), value: '' }] }
          : f,
      ),
    );
  }, []);

  const handleOptionChange = useCallback((fieldId: string, optId: string, value: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? { ...f, options: f.options.map((o) => (o.id === optId ? { ...o, value } : o)) }
          : f,
      ),
    );
  }, []);

  const handleRemoveOption = useCallback((fieldId: string, optId: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? { ...f, options: f.options.filter((o) => o.id !== optId) }
          : f,
      ),
    );
  }, []);

  // ---- Save ----
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError('Le titre du formulaire est obligatoire.');
      return;
    }
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const formJson = JSON.stringify(
        fields.map((f, i) => ({
          label: f.label,
          type: f.type,
          required: f.required,
          options: f.options.filter((o) => o.value.trim()),
          placeholder: f.placeholder,
          position: i,
        })),
      );

      if (isEditMode && formId) {
        const { error: updateErr } = await supabase
          .from('forms')
          .update({
            title: title.trim(),
            description: description.trim(),
            form_json: formJson,
            coverimage: coverImage,
          })
          .eq('id', formId);

        if (updateErr) throw updateErr;

        await supabase.from('form_fields').delete().eq('form_id', formId);

        if (fields.length > 0) {
          const fieldRows = fields.map((f, i) => ({
            form_id: formId,
            label: f.label,
            type: f.type,
            options: f.options.filter((o) => o.value.trim()).map((o) => o.value).join('|'),
            position: i,
            required: f.required,
          }));
          const { error: fieldsErr } = await supabase.from('form_fields').insert(fieldRows);
          if (fieldsErr) throw fieldsErr;
        }
      } else {
        const { data: formData, error: formErr } = await supabase
          .from('forms')
          .insert({
            title: title.trim(),
            description: description.trim(),
            user_id: user.id,
            commerceid: user.id,
            form_type_id: 1,
            directcheckout: 0,
            serviceid: 0,
            productid: 0,
            form_json: formJson,
            structure: '',
            coverimage: coverImage,
            productname: '',
            pays: user.Pays || '',
            ville: user.Ville || '',
          })
          .select('id')
          .single();

        if (formErr) throw formErr;

        const newFormId = formData.id;
        if (fields.length > 0) {
          const fieldRows = fields.map((f, i) => ({
            form_id: newFormId,
            label: f.label,
            type: f.type,
            options: f.options.filter((o) => o.value.trim()).map((o) => o.value).join('|'),
            position: i,
            required: f.required,
          }));
          const { error: fieldsErr } = await supabase.from('form_fields').insert(fieldRows);
          if (fieldsErr) throw fieldsErr;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard/forms');
      }, 1500);
    } catch {
      setError('Erreur lors de la sauvegarde du formulaire.');
    }
    setSaving(false);
  }, [title, description, coverImage, fields, user, navigate, isEditMode, formId]);

  // ---- Success screen ----
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-50 px-4">
        <div className="text-center animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-check-line text-3xl text-green-600"></i>
          </div>
          <h2 className="text-xl font-bold font-heading text-foreground-950 mb-1">
            {isEditMode ? 'Formulaire mis à jour !' : 'Formulaire créé !'}
          </h2>
          <p className="text-sm text-foreground-500">Redirection vers la liste...</p>
        </div>
      </div>
    );
  }

  // ---- Loading screen ----
  if (loadingForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-50 px-4">
        <div className="flex items-center gap-3 text-foreground-500">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
          <span className="text-sm">Chargement du formulaire...</span>
        </div>
      </div>
    );
  }

  // ---- Helpers ----
  const pageTitle = isEditMode ? 'Modifier le formulaire' : 'Nouveau formulaire';
  const pageSubtitle = isEditMode
    ? 'Modifiez les champs et ré-enregistrez'
    : 'Glissez-déposez les champs pour construire votre formulaire';

  const fieldTypeDef = (type: string) => FIELD_TYPES.find((ft) => ft.type === type);

  const isInputType = (type: string) => !['select', 'radio', 'checkbox', 'file', 'heading'].includes(type);
  const hasOptionsType = (type: string) => ['select', 'radio', 'checkbox'].includes(type);

  // ---- Field card preview renderer ----
  const renderFieldPreview = (field: FormField) => {
    if (field.type === 'heading') {
      return (
        <div className="py-1">
          <div className="h-px bg-background-200/70 mb-3"></div>
          <span className="text-base font-bold font-heading text-foreground-800">
            {field.label || 'Titre de section'}
          </span>
        </div>
      );
    }

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            disabled
            rows={2}
            placeholder={field.placeholder || 'Zone de texte...'}
            className="w-full px-3 py-2 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-400 resize-none"
          />
        );
      case 'select':
        return (
          <select disabled className="w-full px-3 py-2 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-400 cursor-not-allowed">
            <option>{field.placeholder || '— Sélectionner —'}</option>
            {field.options.filter((o) => o.value.trim()).map((opt) => (
              <option key={opt.id}>{opt.value}</option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="space-y-1.5">
            {field.options.filter((o) => o.value.trim()).length > 0
              ? field.options.filter((o) => o.value.trim()).map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 text-sm text-foreground-500">
                    <span className="w-4 h-4 rounded-full border-2 border-background-300 bg-background-100 flex-shrink-0"></span>
                    {opt.value}
                  </label>
                ))
              : (
                <span className="text-sm text-foreground-300 italic">Ajoutez des options</span>
              )}
          </div>
        );
      case 'checkbox':
        return (
          <div className="space-y-1.5">
            {field.options.filter((o) => o.value.trim()).length > 0
              ? field.options.filter((o) => o.value.trim()).map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 text-sm text-foreground-500">
                    <span className="w-4 h-4 rounded border-2 border-background-300 bg-background-100 flex-shrink-0"></span>
                    {opt.value}
                  </label>
                ))
              : (
                <span className="text-sm text-foreground-300 italic">Ajoutez des options</span>
              )}
          </div>
        );
      case 'file':
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-background-100 border border-dashed border-background-200/70 rounded-lg">
            <i className="ri-upload-line text-foreground-300"></i>
            <span className="text-sm text-foreground-400">{field.placeholder || 'Choisir un fichier...'}</span>
          </div>
        );
      default:
        return (
          <input
            type={field.type}
            disabled
            placeholder={field.placeholder || fieldTypeDef(field.type)?.label || ''}
            className="w-full px-3 py-2 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-400"
          />
        );
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 min-h-screen bg-background-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6 max-w-[1200px] mx-auto">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-foreground-500 hover:text-foreground-800 cursor-pointer transition-colors mb-1.5"
          >
            <i className="ri-arrow-left-line"></i>
            Retour
          </button>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-survey-line mr-2 text-primary-500"></i>
            {pageTitle}
          </h2>
          <p className="text-xs sm:text-sm text-foreground-500 mt-1">{pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {isEditMode && formId && (
            <a
              href={`/forms/${formId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 border border-background-200/70 rounded-full text-xs sm:text-sm text-foreground-700 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
            >
              <i className="ri-external-link-line"></i>
              <span className="hidden sm:inline">Ouvrir</span>
            </a>
          )}
          <button
            onClick={() => setShowFullPreview(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 border border-background-200/70 rounded-full text-xs sm:text-sm text-foreground-700 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
          >
            <i className="ri-eye-line"></i>
            <span className="hidden sm:inline">Prévisualiser</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-primary-500 text-background-50 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                <span className="hidden sm:inline">Sauvegarde...</span>
              </>
            ) : (
              <>
                <i className="ri-save-line"></i>
                <span className="hidden sm:inline">{isEditMode ? 'Mettre à jour' : 'Enregistrer'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-[1200px] mx-auto mb-3 md:mb-4 flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-red-50 text-red-700 text-xs sm:text-sm rounded-lg">
          <i className="ri-error-warning-line flex-shrink-0"></i>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="cursor-pointer hover:text-red-900 flex-shrink-0">
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 max-w-[1200px] mx-auto">
        {/* ---- LEFT PANEL — Form settings ---- */}
        <div className="w-full lg:w-[340px] flex-shrink-0 space-y-3 md:space-y-5">
          {/* Title */}
          <div className="bg-background-50 border border-background-200/70 rounded-lg p-3 md:p-5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground-800 mb-2 md:mb-3">
              <i className="ri-edit-line text-primary-500"></i>
              Titre du formulaire
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Sondage satisfaction client"
              className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 placeholder:text-foreground-300"
            />
          </div>

          {/* Description */}
          <div className="bg-background-50 border border-background-200/70 rounded-lg p-3 md:p-5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground-800 mb-2 md:mb-3">
              <i className="ri-file-text-line text-accent-500"></i>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Décrivez l'objectif de ce formulaire..."
              className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 resize-none focus:outline-none focus:border-primary-300 placeholder:text-foreground-300"
            />
            <p className="text-xs text-foreground-400 mt-1">{description.length}/500</p>
          </div>

          {/* Cover image */}
          <div className="bg-background-50 border border-background-200/70 rounded-lg p-3 md:p-5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground-800 mb-2 md:mb-3">
              <i className="ri-image-line text-secondary-500"></i>
              Image de couverture
              <span className="text-xs font-normal text-foreground-400">(optionnel)</span>
            </label>
            {coverImage ? (
              <div className="relative">
                <img src={coverImage} alt="Couverture" className="w-full h-28 md:h-32 object-cover rounded-lg" />
                <button
                  onClick={() => setCoverImage('')}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-background-200/70 rounded-lg p-4 md:p-6 text-center">
                <div className="w-8 md:w-10 h-8 md:h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-2">
                  <i className="ri-upload-cloud-line text-lg md:text-xl text-foreground-400"></i>
                </div>
                <p className="text-xs text-foreground-400 mb-3">Glissez une image ou collez une URL</p>
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-xs text-foreground-900 focus:outline-none focus:border-primary-300 placeholder:text-foreground-300"
                />
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="hidden lg:flex bg-background-50 border border-background-200/70 rounded-lg p-4 items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="ri-information-line text-primary-500"></i>
            </div>
            <div className="text-xs text-foreground-500 leading-relaxed">
              <p className="font-medium text-foreground-700 mb-1">Astuces</p>
              Glissez la poignée <i className="ri-draggable text-xs"></i> pour réorganiser. Cliquez sur le titre pour le renommer. Utilisez "Titre de section" pour structurer.
            </div>
          </div>
        </div>

        {/* ---- RIGHT PANEL — Field builder ---- */}
        <div className="flex-1 min-w-0 space-y-3 md:space-y-5">
          {/* ---- FIELD PALETTE ---- */}
          <div className="hidden sm:block bg-background-50 border border-background-200/70 rounded-lg p-3 md:p-5">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground-800 mb-2 md:mb-3 flex items-center gap-2">
              <i className="ri-shapes-line text-accent-500"></i>
              Types de champs — glissez vers la zone ci-dessous
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 md:gap-2">
              {FIELD_TYPES.map((ft) => (
                <div
                  key={ft.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, ft.type)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleClickAddField(ft.type)}
                  className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 rounded-lg border border-background-200/70 bg-background-50 cursor-grab active:cursor-grabbing hover:border-primary-300 hover:bg-primary-50/50 transition-colors ${
                    draggedType === ft.type ? 'opacity-50 border-primary-300 bg-primary-50' : ''
                  } ${ft.type === 'heading' ? 'border-accent-200 bg-accent-50/30 hover:border-accent-300 hover:bg-accent-50/60' : ''}`}
                >
                  <i className={`${ft.icon} text-sm md:text-base ${ft.type === 'heading' ? 'text-accent-500' : 'text-foreground-500'} flex-shrink-0`}></i>
                  <span className={`text-[11px] md:text-xs whitespace-nowrap truncate ${ft.type === 'heading' ? 'text-accent-700 font-medium' : 'text-foreground-700'}`}>{ft.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile palette */}
          <div className="sm:hidden">
            <button
              onClick={() => setShowMobilePalette(!showMobilePalette)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
                showMobilePalette
                  ? 'bg-accent-50 text-accent-700 border-accent-200'
                  : 'bg-background-50 text-foreground-700 border-background-200/70'
              }`}
            >
              <i className="ri-add-line"></i>
              Ajouter un champ
              <i className={`${showMobilePalette ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} transition-transform`}></i>
            </button>
            {showMobilePalette && (
              <div className="mt-2 bg-background-50 border border-background-200/70 rounded-lg p-3 animate-fade-in">
                <h3 className="text-xs font-semibold text-foreground-800 mb-2">Types de champs</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {FIELD_TYPES.map((ft) => (
                    <button
                      key={ft.type}
                      onClick={() => handleClickAddField(ft.type)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border border-background-200/70 bg-background-50 hover:border-primary-300 hover:bg-primary-50/50 transition-colors text-left cursor-pointer ${ft.type === 'heading' ? 'border-accent-200 bg-accent-50/30' : ''}`}
                    >
                      <i className={`${ft.icon} text-sm ${ft.type === 'heading' ? 'text-accent-500' : 'text-foreground-500'} flex-shrink-0`}></i>
                      <span className={`text-xs ${ft.type === 'heading' ? 'text-accent-700 font-medium' : 'text-foreground-700'}`}>{ft.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---- DROP ZONE / FORM PREVIEW ---- */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`bg-background-50 border-2 rounded-lg p-3 md:p-5 min-h-[250px] md:min-h-[300px] transition-colors ${
              draggedType
                ? 'border-primary-400 border-dashed bg-primary-50/30'
                : 'border-background-200/70 border-dashed'
            }`}
          >
            <h3 className="text-xs sm:text-sm font-semibold text-foreground-800 mb-3 md:mb-4 flex items-center gap-2">
              <i className="ri-drag-drop-line text-primary-500"></i>
              Aperçu du formulaire
              {fields.length > 0 && (
                <span className="ml-auto text-[10px] sm:text-xs font-normal text-foreground-400">
                  {fields.length} champ{fields.length > 1 ? 's' : ''}
                </span>
              )}
            </h3>

            {fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 md:py-16 text-center">
                <div className="w-12 md:w-14 h-12 md:h-14 rounded-full bg-background-100 flex items-center justify-center mb-2 md:mb-3">
                  <i className="ri-drag-move-line text-xl md:text-2xl text-foreground-300"></i>
                </div>
                <p className="text-sm text-foreground-500 mb-1">Glissez un type de champ ici</p>
                <p className="text-xs text-foreground-400 max-w-[280px]">
                  Choisissez un champ dans la palette ci-dessus et déposez-le dans cette zone
                </p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {fields.map((field, index) => {
                  const isEditingLabel = editingLabelId === field.id;
                  const isEditingSettings = editingFieldId === field.id;
                  const isDragging = dragReorderIdx === index;
                  const isOverTarget = dragOverReorderIdx === index && dragReorderIdx !== index;
                  const def = fieldTypeDef(field.type);
                  const isHeading = field.type === 'heading';

                  return (
                    <div
                      key={field.id}
                      onDragOver={(e) => handleReorderDragOver(e, index)}
                      onDragLeave={handleReorderDragLeave}
                      onDrop={(e) => handleReorderDrop(e, index)}
                      className={`bg-background-50 border rounded-lg transition-all duration-200 ${
                        isEditingSettings
                          ? 'border-primary-300 ring-1 ring-primary-200'
                          : isOverTarget
                            ? 'border-primary-400 border-dashed bg-primary-50/20'
                            : isDragging
                              ? 'opacity-40 scale-[0.98] border-background-200/70'
                              : isHeading
                                ? 'border-accent-200/70 bg-accent-50/20 hover:border-accent-300/60'
                                : 'border-background-200/70 hover:border-background-300/60'
                      }`}
                    >
                      {/* ---- HEADER — Title bar ---- */}
                      <div className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-3">
                        {/* Drag grip handle for reordering */}
                        <div
                          draggable
                          onDragStart={(e) => handleReorderDragStart(e, index)}
                          onDragEnd={handleReorderDragEnd}
                          className="w-6 h-6 md:w-7 md:h-7 rounded flex items-center justify-center text-foreground-300 hover:text-foreground-500 hover:bg-background-100 cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors"
                          title="Glisser pour réorganiser"
                        >
                          <i className="ri-draggable text-sm md:text-base"></i>
                        </div>

                        {/* Field type badge */}
                        <span className={`flex items-center gap-1 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium flex-shrink-0 ${
                          isHeading
                            ? 'bg-accent-100 text-accent-700'
                            : 'bg-secondary-50 text-secondary-700'
                        }`}>
                          <i className={`${def?.icon || 'ri-text'} text-[10px] md:text-xs`}></i>
                          <span className="hidden md:inline">{def?.label || field.type}</span>
                        </span>

                        {/* Inline editable label */}
                        {isEditingLabel ? (
                          <input
                            ref={labelInputRef}
                            type="text"
                            value={field.label}
                            onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                            onBlur={commitLabel}
                            onKeyDown={handleLabelKeyDown}
                            placeholder="Titre du champ..."
                            className={`flex-1 min-w-0 px-2 py-1 bg-background-50 border border-primary-300 rounded text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary-300 ${
                              isHeading ? 'text-base md:text-lg' : 'text-foreground-900'
                            }`}
                          />
                        ) : (
                          <span
                            onClick={() => startEditingLabel(field.id)}
                            className={`flex-1 truncate cursor-text hover:text-primary-600 transition-colors min-w-0 ${
                              isHeading
                                ? 'text-base md:text-lg font-bold font-heading text-foreground-800'
                                : 'text-sm font-medium text-foreground-800'
                            }`}
                            title="Cliquez pour modifier le titre"
                          >
                            {field.label || (isHeading ? 'Titre de section' : 'Sans titre')}
                          </span>
                        )}

                        {field.required && <span className="text-red-500 text-sm flex-shrink-0">*</span>}

                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Monter"
                          >
                            <i className="ri-arrow-up-s-line text-xs md:text-sm"></i>
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index >= fields.length - 1}
                            className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Descendre"
                          >
                            <i className="ri-arrow-down-s-line text-xs md:text-sm"></i>
                          </button>
                          <button
                            onClick={() => handleDuplicateField(field.id)}
                            className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-foreground-400 hover:text-green-500 hover:bg-green-50 cursor-pointer transition-colors"
                            title="Dupliquer ce champ"
                          >
                            <i className="ri-file-copy-line text-xs md:text-sm"></i>
                          </button>
                          <button
                            onClick={() => setEditingFieldId(isEditingSettings ? null : field.id)}
                            className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                              isEditingSettings
                                ? 'text-primary-600 bg-primary-50'
                                : 'text-foreground-400 hover:text-primary-600 hover:bg-primary-50'
                            }`}
                            title="Configurer"
                          >
                            <i className="ri-settings-3-line text-xs md:text-sm"></i>
                          </button>
                          <button
                            onClick={() => handleRemoveField(field.id)}
                            className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                            title="Supprimer"
                          >
                            <i className="ri-delete-bin-line text-xs md:text-sm"></i>
                          </button>
                        </div>
                      </div>

                      {/* ---- PREVIEW ---- */}
                      <div className="px-3 md:px-4 pb-3 md:pb-4">
                        {isHeading ? (
                          <div className="py-1">
                            <div className="h-px bg-background-200/70 mb-3"></div>
                            <span className="text-base md:text-lg font-bold font-heading text-foreground-800">
                              {field.label || 'Titre de section'}
                            </span>
                          </div>
                        ) : (
                          renderFieldPreview(field)
                        )}
                      </div>

                      {/* ---- SETTINGS PANEL ---- */}
                      {isEditingSettings && (
                        <div className="border-t border-background-200/70 px-3 md:px-4 py-3 md:py-4 space-y-3 md:space-y-4 animate-fade-in bg-background-50/50 rounded-b-lg">
                          <div>
                            <label className="block text-[11px] md:text-xs font-medium text-foreground-600 mb-1 md:mb-1.5">
                              {isHeading ? 'Titre de la section' : 'Label du champ'}
                            </label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                              placeholder={isHeading ? 'Ex: Informations personnelles' : 'Label du champ'}
                              className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                            />
                          </div>

                          {isInputType(field.type) && (
                            <div>
                              <label className="block text-[11px] md:text-xs font-medium text-foreground-600 mb-1 md:mb-1.5">Placeholder</label>
                              <input
                                type="text"
                                value={field.placeholder}
                                onChange={(e) => handleFieldChange(field.id, 'placeholder', e.target.value)}
                                placeholder="Texte indicatif..."
                                className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                              />
                            </div>
                          )}

                          {!isHeading && (
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] md:text-xs font-medium text-foreground-600">Champ obligatoire</span>
                              <button
                                onClick={() => handleFieldChange(field.id, 'required', !field.required)}
                                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                                  field.required ? 'bg-primary-500' : 'bg-background-200'
                                }`}
                              >
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                  field.required ? 'translate-x-5' : 'translate-x-0.5'
                                }`}></span>
                              </button>
                            </div>
                          )}

                          {hasOptionsType(field.type) && (
                            <div>
                              <label className="block text-[11px] md:text-xs font-medium text-foreground-600 mb-2">
                                Options
                                <span className="text-foreground-400 font-normal ml-1">
                                  ({field.type === 'radio' ? 'Choix unique' : field.type === 'checkbox' ? 'Cases à cocher' : 'Liste déroulante'})
                                </span>
                              </label>
                              <div className="space-y-1.5 md:space-y-2">
                                {field.options.map((opt) => (
                                  <div key={opt.id} className="flex items-center gap-1.5 md:gap-2">
                                    <span className="text-foreground-300 flex-shrink-0">
                                      {field.type === 'radio' ? (
                                        <span className="w-3.5 h-3.5 rounded-full border-2 border-background-300 block"></span>
                                      ) : field.type === 'checkbox' ? (
                                        <span className="w-3.5 h-3.5 rounded border-2 border-background-300 block"></span>
                                      ) : (
                                        <i className="ri-subtract-line text-xs"></i>
                                      )}
                                    </span>
                                    <input
                                      type="text"
                                      value={opt.value}
                                      onChange={(e) => handleOptionChange(field.id, opt.id, e.target.value)}
                                      placeholder="Valeur de l'option"
                                      className="flex-1 px-2.5 py-1.5 bg-background-50 border border-background-200/70 rounded-lg text-xs md:text-sm text-foreground-900 focus:outline-none focus:border-primary-300 min-w-0"
                                    />
                                    <button
                                      onClick={() => handleRemoveOption(field.id, opt.id)}
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer flex-shrink-0 transition-colors"
                                    >
                                      <i className="ri-close-line text-xs"></i>
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => handleAddOption(field.id)}
                                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-primary-600 hover:bg-primary-50 cursor-pointer transition-colors"
                              >
                                <i className="ri-add-line"></i>
                                Ajouter une option
                              </button>
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] md:text-xs font-medium text-foreground-600 mb-1 md:mb-1.5">Type de champ</label>
                            <select
                              value={field.type}
                              onChange={(e) => {
                                const newType = e.target.value;
                                handleFieldChange(field.id, 'type', newType);
                                if (['select', 'radio', 'checkbox'].includes(newType) && field.options.length === 0) {
                                  handleFieldChange(field.id, 'options', [{ id: genId(), value: '' }, { id: genId(), value: '' }]);
                                }
                              }}
                              className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 cursor-pointer"
                            >
                              {FIELD_TYPES.map((ft) => (
                                <option key={ft.type} value={ft.type}>{ft.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ---- Bottom save bar ---- */}
          {fields.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-background-50 border border-background-200/70 rounded-lg p-3 md:p-4">
              <div className="text-xs text-foreground-500 text-center sm:text-left">
                {fields.length} champ{fields.length > 1 ? 's' : ''} configuré{fields.length > 1 ? 's' : ''} —{' '}
                {fields.filter((f) => f.required).length} obligatoire{fields.filter((f) => f.required).length > 1 ? 's' : ''}
                {fields.some((f) => f.type === 'heading') && (
                  <span className="ml-1">— {fields.filter((f) => f.type === 'heading').length} titre{fields.filter((f) => f.type === 'heading').length > 1 ? 's' : ''} de section</span>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <i className="ri-save-line"></i>
                    {isEditMode ? 'Mettre à jour' : 'Enregistrer le formulaire'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---- Full-screen preview modal ---- */}
      {showFullPreview && (
        <div className="fixed inset-0 z-50 flex flex-col animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowFullPreview(false)}></div>
          <div className="relative z-10 flex flex-col h-full bg-background-50">
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 bg-background-50 border-b border-background-200/70 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFullPreview(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:text-foreground-800 hover:bg-background-100 cursor-pointer transition-colors"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
                <div>
                  <h2 className="text-sm font-semibold text-foreground-900 font-heading">
                    Prévisualisation
                  </h2>
                  <p className="text-xs text-foreground-400">{title || 'Sans titre'}</p>
                </div>
              </div>
              <span className="text-xs text-foreground-400 bg-background-100 px-2.5 py-1 rounded-full">
                {fields.length} champ{fields.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-[680px] mx-auto px-4 py-10 md:py-16">
                {/* Cover image */}
                {coverImage && (
                  <div className="mb-8 rounded-xl overflow-hidden">
                    <img src={coverImage} alt="Couverture" className="w-full h-48 object-cover" />
                  </div>
                )}

                <h1 className="text-2xl md:text-3xl font-bold font-heading text-foreground-950 mb-3">
                  {title || 'Formulaire sans titre'}
                </h1>
                {description && (
                  <p className="text-sm text-foreground-500 mb-10 leading-relaxed">{description}</p>
                )}

                <div className="bg-background-50 border border-background-200/70 rounded-xl p-6 md:p-8 space-y-6">
                  {fields.length === 0 ? (
                    <p className="text-sm text-foreground-400 text-center py-6">
                      Aucun champ dans ce formulaire.
                    </p>
                  ) : (
                    fields.map((field) => {
                      if (field.type === 'heading') {
                        return (
                          <div key={field.id} className="pt-2 pb-1">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-px bg-background-200/70"></div>
                              <h3 className="text-base md:text-lg font-bold font-heading text-foreground-800 whitespace-nowrap px-2">
                                {field.label || 'Section'}
                              </h3>
                              <div className="flex-1 h-px bg-background-200/70"></div>
                            </div>
                          </div>
                        );
                      }

                      const fieldRender = (() => {
                        switch (field.type) {
                          case 'textarea':
                            return (
                              <textarea
                                disabled
                                rows={3}
                                placeholder={field.placeholder || 'Zone de texte...'}
                                className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-400 resize-none"
                              />
                            );
                          case 'select':
                            return (
                              <select disabled className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-400 cursor-not-allowed">
                                <option>{field.placeholder || '— Sélectionner —'}</option>
                                {field.options.filter((o) => o.value.trim()).map((opt) => (
                                  <option key={opt.id}>{opt.value}</option>
                                ))}
                              </select>
                            );
                          case 'radio':
                            return (
                              <div className="space-y-2 pt-1">
                                {field.options.filter((o) => o.value.trim()).length > 0
                                  ? field.options.filter((o) => o.value.trim()).map((opt) => (
                                      <label key={opt.id} className="flex items-center gap-2 text-sm text-foreground-600">
                                        <span className="w-4 h-4 rounded-full border-2 border-background-300 bg-background-50 flex-shrink-0"></span>
                                        {opt.value}
                                      </label>
                                    ))
                                  : <span className="text-sm text-foreground-300 italic">Aucune option</span>}
                              </div>
                            );
                          case 'checkbox':
                            return (
                              <div className="space-y-2 pt-1">
                                {field.options.filter((o) => o.value.trim()).length > 0
                                  ? field.options.filter((o) => o.value.trim()).map((opt) => (
                                      <label key={opt.id} className="flex items-center gap-2 text-sm text-foreground-600">
                                        <span className="w-4 h-4 rounded border-2 border-background-300 bg-background-50 flex-shrink-0"></span>
                                        {opt.value}
                                      </label>
                                    ))
                                  : <span className="text-sm text-foreground-300 italic">Aucune option</span>}
                              </div>
                            );
                          case 'file':
                            return (
                              <div className="border-2 border-dashed border-background-200/70 rounded-lg p-5 text-center">
                                <div className="w-10 h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-2">
                                  <i className="ri-upload-cloud-line text-xl text-foreground-400"></i>
                                </div>
                                <p className="text-xs text-foreground-400">{field.placeholder || 'Choisir un fichier'}</p>
                              </div>
                            );
                          default:
                            return (
                              <input
                                type={field.type}
                                disabled
                                placeholder={field.placeholder || fieldTypeDef(field.type)?.label || ''}
                                className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-400"
                              />
                            );
                        }
                      })();

                      return (
                        <div key={field.id} className="space-y-1.5">
                          <label className="block text-sm font-medium text-foreground-800">
                            {field.label || 'Sans titre'}
                            {field.required && <span className="text-red-500 ml-0.5">*</span>}
                          </label>
                          {fieldRender}
                        </div>
                      );
                    })
                  )}

                  {fields.some((f) => f.type !== 'heading') && (
                    <div className="pt-2">
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500/50 text-background-50 rounded-full text-sm font-medium cursor-not-allowed whitespace-nowrap"
                      >
                        <i className="ri-send-plane-line"></i>
                        Envoyer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}