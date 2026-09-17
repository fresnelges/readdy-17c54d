import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/facebookPixel';

interface FormFieldDef {
  id: number;
  form_id: number;
  label: string;
  type: string;
  options: string;
  position: number;
  required?: boolean;
}

interface FormData {
  id: number;
  title: string;
  description: string;
  coverimage: string;
  commerceid: number;
}

function genCode(): string {
  return `r_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function PublicFormPage() {
  const { id: formIdStr } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const formId = formIdStr ? parseInt(formIdStr, 10) : null;

  const [form, setForm] = useState<FormData | null>(null);
  const [fields, setFields] = useState<FormFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form values
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => {
    if (!formId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const loadForm = async () => {
      setLoading(true);
      try {
        const { data: formData, error: formErr } = await supabase
          .from('forms')
          .select('id, title, description, coverimage, commerceid')
          .eq('id', formId)
          .maybeSingle();

        if (formErr || !formData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setForm(formData as FormData);

        const { data: fieldData, error: fieldErr } = await supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', formId)
          .order('position', { ascending: true });

        if (fieldErr) throw fieldErr;

        setFields((fieldData || []) as FormFieldDef[]);

        // Initialize values (skip heading fields)
        const init: Record<string, string | string[]> = {};
        (fieldData || []).forEach((f: FormFieldDef) => {
          if (f.type === 'heading') return;
          if (f.type === 'checkbox') {
            init[`field_${f.id}`] = [];
          } else {
            init[`field_${f.id}`] = '';
          }
        });
        setValues(init);
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    };

    loadForm();
  }, [formId]);

  const handleValueChange = (fieldId: number, value: string) => {
    setValues((prev) => ({ ...prev, [`field_${fieldId}`]: value }));
    if (errors[`field_${fieldId}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`field_${fieldId}`];
        return next;
      });
    }
  };

  const handleCheckboxChange = (fieldId: number, optionValue: string, checked: boolean) => {
    setValues((prev) => {
      const key = `field_${fieldId}`;
      const current = (prev[key] as string[]) || [];
      const next = checked
        ? [...current, optionValue]
        : current.filter((v) => v !== optionValue);
      return { ...prev, [key]: next };
    });
    if (errors[`field_${fieldId}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`field_${fieldId}`];
        return next;
      });
    }
  };

  const handleFileChange = (fieldId: number, _e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [`field_${fieldId}`]: 'Uncollectable' }));
    if (errors[`field_${fieldId}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`field_${fieldId}`];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((f) => {
      if (f.type === 'heading') return;
      const key = `field_${f.id}`;
      const val = values[key];

      // Required field check
      if (f.required) {
        const isEmpty =
          !val ||
          (typeof val === 'string' && !val.trim()) ||
          (Array.isArray(val) && val.length === 0);
        if (isEmpty) {
          newErrors[key] = 'Ce champ est obligatoire.';
          return;
        }
      }

      if (f.type === 'email' && val && typeof val === 'string' && val.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val.trim())) {
          newErrors[key] = 'Veuillez entrer une adresse email valide.';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check
    if (honeypot.trim()) return;

    if (!validate()) return;

    if (!form || !formId) return;

    setSubmitting(true);

    try {
      const codeUnique = genCode();

      // Build response rows for form_responses (skip heading and file fields)
      const responseRows = fields
        .filter((f) => {
          if (f.type === 'heading' || f.type === 'file') return false;
          const val = values[`field_${f.id}`];
          if (Array.isArray(val)) return val.length > 0;
          return val !== undefined && val !== '';
        })
        .map((f) => {
          const val = values[`field_${f.id}`];
          const responseText = Array.isArray(val) ? val.join(', ') : (val as string);

          return {
            form_id: formId,
            field_id: f.id,
            user_id: null,
            serviceid: 0,
            response_text: responseText || '',
            response_file: null,
            codeunique: codeUnique,
          };
        });

      if (responseRows.length > 0) {
        const { error: insertErr } = await supabase.from('form_responses').insert(responseRows);
        if (insertErr) throw insertErr;
      }

      // Also submit to the Readdy form URL
      try {
        const formBody = new URLSearchParams();
        fields.forEach((f) => {
          if (f.type === 'heading' || f.type === 'file') return;
          const val = values[`field_${f.id}`];
          const textVal = Array.isArray(val) ? val.join(', ') : (val as string);
          if (textVal) {
            formBody.append(f.label, textVal);
          }
        });
        formBody.append('codeunique', codeUnique);

        await fetch('https://readdy.ai/api/form/d8sumh4uatl81q3tffb0', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody.toString(),
        });
      } catch {
        // Readdy form submission is best-effort
      }

      setSubmitted(true);

      // Suivi Facebook Pixel : formulaire soumis (Lead).
      trackEvent('Lead', {
        content_name: form.title || 'Formulaire',
      });
    } catch {
      setErrors({ _form: 'Erreur lors de l\'envoi du formulaire. Veuillez réessayer.' });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-50">
        <div className="flex items-center gap-3 text-foreground-500">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
          <span className="text-sm">Chargement...</span>
        </div>
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-50 px-4">
        <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
          <i className="ri-error-warning-line text-3xl text-foreground-400"></i>
        </div>
        <h2 className="text-xl font-bold font-heading text-foreground-950 mb-2">Formulaire introuvable</h2>
        <p className="text-sm text-foreground-500 mb-6">Ce formulaire n'existe pas ou a été supprimé.</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-50 px-4">
        <div className="text-center animate-scale-in max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-check-line text-3xl text-green-600"></i>
          </div>
          <h2 className="text-xl font-bold font-heading text-foreground-950 mb-2">Merci !</h2>
          <p className="text-sm text-foreground-500">Votre réponse a bien été enregistrée.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      <div className="max-w-[680px] mx-auto px-4 py-10 md:py-16">
        {/* Form header */}
        {form.coverimage && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img
              src={form.coverimage}
              alt={form.title}
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        <h1 className="text-2xl md:text-3xl font-bold font-heading text-foreground-950 mb-3">
          {form.title}
        </h1>
        {form.description && (
          <p className="text-sm text-foreground-500 mb-10 leading-relaxed">{form.description}</p>
        )}

        {/* Form */}
        <form
          data-readdy-form
          onSubmit={handleSubmit}
          className="bg-background-50 border border-background-200/70 rounded-xl p-6 md:p-8 space-y-6"
        >
          {errors._form && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm rounded-lg">
              <i className="ri-error-warning-line"></i>
              {errors._form}
            </div>
          )}

          {fields.length === 0 ? (
            <p className="text-sm text-foreground-400 text-center py-6">
              Ce formulaire ne contient pas encore de champs.
            </p>
          ) : (
            fields.map((field) => {
              const key = `field_${field.id}`;
              const val = values[key] || '';
              const error = errors[key];
              const opts = field.options
                ? field.options.split('|').filter(Boolean)
                : [];

              // ---- Heading / Section title ----
              if (field.type === 'heading') {
                return (
                  <div key={field.id} className="pt-2 pb-1">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-background-200/70"></div>
                      <h3 className="text-base md:text-lg font-bold font-heading text-foreground-800 whitespace-nowrap px-2">
                        {field.label}
                      </h3>
                      <div className="flex-1 h-px bg-background-200/70"></div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={field.id} className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground-800">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>

                  {/* Text */}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      name={field.label}
                      required={field.required}
                      value={typeof val === 'string' ? val : ''}
                      onChange={(e) => handleValueChange(field.id, e.target.value)}
                      className={`w-full px-4 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors ${error ? 'border-red-400' : 'border-background-200/70'}`}
                    />
                  )}

                  {/* Textarea */}
                  {field.type === 'textarea' && (
                    <textarea
                      name={field.label}
                      required={field.required}
                      value={typeof val === 'string' ? val : ''}
                      onChange={(e) => handleValueChange(field.id, e.target.value)}
                      rows={4}
                      maxLength={500}
                      className={`w-full px-4 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 resize-none focus:outline-none focus:border-primary-300 transition-colors ${error ? 'border-red-400' : 'border-background-200/70'}`}
                    />
                  )}

                  {/* Email */}
                  {field.type === 'email' && (
                    <input
                      type="email"
                      name="email"
                      required={field.required}
                      value={typeof val === 'string' ? val : ''}
                      onChange={(e) => handleValueChange(field.id, e.target.value)}
                      className={`w-full px-4 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors ${error ? 'border-red-400' : 'border-background-200/70'}`}
                    />
                  )}

                  {/* Number */}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      name={field.label}
                      required={field.required}
                      value={typeof val === 'string' ? val : ''}
                      onChange={(e) => handleValueChange(field.id, e.target.value)}
                      className={`w-full px-4 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors ${error ? 'border-red-400' : 'border-background-200/70'}`}
                    />
                  )}

                  {/* Phone */}
                  {field.type === 'tel' && (
                    <input
                      type="tel"
                      name={field.label}
                      required={field.required}
                      value={typeof val === 'string' ? val : ''}
                      onChange={(e) => handleValueChange(field.id, e.target.value)}
                      className={`w-full px-4 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors ${error ? 'border-red-400' : 'border-background-200/70'}`}
                    />
                  )}

                  {/* Date */}
                  {field.type === 'date' && (
                    <input
                      type="date"
                      name={field.label}
                      required={field.required}
                      value={typeof val === 'string' ? val : ''}
                      onChange={(e) => handleValueChange(field.id, e.target.value)}
                      className={`w-full px-4 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors ${error ? 'border-red-400' : 'border-background-200/70'}`}
                    />
                  )}

                  {/* Select */}
                  {field.type === 'select' && (
                    <select
                      name={field.label}
                      required={field.required}
                      value={typeof val === 'string' ? val : ''}
                      onChange={(e) => handleValueChange(field.id, e.target.value)}
                      className={`w-full px-4 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 cursor-pointer transition-colors ${error ? 'border-red-400' : 'border-background-200/70'}`}
                    >
                      <option value="">— Sélectionner —</option>
                      {opts.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {/* Radio */}
                  {field.type === 'radio' && (
                    <div className="space-y-2 pt-1">
                      {opts.map((opt, i) => (
                        <label key={i} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`radio_${field.id}`}
                            value={opt}
                            checked={typeof val === 'string' && val === opt}
                            onChange={(e) => handleValueChange(field.id, e.target.value)}
                            className="w-4 h-4 text-primary-500 border-background-200/70 focus:ring-primary-400"
                          />
                          <span className="text-sm text-foreground-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Checkbox */}
                  {field.type === 'checkbox' && (
                    <div className="space-y-2 pt-1">
                      {opts.map((opt, i) => (
                        <label key={i} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name={field.label}
                            value={opt}
                            checked={Array.isArray(val) && val.includes(opt)}
                            onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                            className="w-4 h-4 text-primary-500 border-background-200/70 rounded focus:ring-primary-400"
                          />
                          <span className="text-sm text-foreground-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* File */}
                  {field.type === 'file' && (
                    <div className="border-2 border-dashed border-background-200/70 rounded-lg p-5 text-center">
                      <div className="w-10 h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-2">
                        <i className="ri-upload-cloud-line text-xl text-foreground-400"></i>
                      </div>
                      <p className="text-xs text-foreground-400 mb-2">Fichier non collectable</p>
                      <input
                        type="file"
                        name={field.label}
                        onChange={(e) => handleFileChange(field.id, e)}
                        className="text-xs text-foreground-500 cursor-pointer"
                      />
                    </div>
                  )}

                  {error && (
                    <p className="text-xs text-red-500">{error}</p>
                  )}
                </div>
              );
            })
          )}

          {/* Honeypot — anti-spam */}
          <input
            type="text"
            name="website_alt"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="form-hp-field"
          />

          {/* Submit — only show if there are non-heading fields */}
          {fields.some((f) => f.type !== 'heading') && (
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                {submitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <i className="ri-send-plane-line"></i>
                    Envoyer
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}