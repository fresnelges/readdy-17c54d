import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface FormItem {
  id: number;
  title: string;
  description: string;
  commerceid: number;
  created_at: string;
}

export default function FormsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormItem[]>([]);
  const [responseCounts, setResponseCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [userDomain, setUserDomain] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('forms')
        .select('id, title, description, commerceid, created_at')
        .eq('commerceid', user.id)
        .order('created_at', { ascending: false });
      if (fetchErr) throw fetchErr;
      const formList = (data || []) as FormItem[];
      setForms(formList);

      // Fetch submission counts in one query
      if (formList.length > 0) {
        const formIds = formList.map((f) => f.id);
        const { data: countData, error: countErr } = await supabase
          .from('form_responses')
          .select('form_id, codeunique')
          .in('form_id', formIds);

        if (!countErr && countData) {
          const counts: Record<number, Set<string>> = {};
          for (const row of countData) {
            const fid = row.form_id as number;
            if (!counts[fid]) counts[fid] = new Set();
            counts[fid].add(row.codeunique as string);
          }
          const finalCounts: Record<number, number> = {};
          for (const fid of Object.keys(counts)) {
            finalCounts[Number(fid)] = (counts[Number(fid)] as Set<string>).size;
          }
          setResponseCounts(finalCounts);
        }
      }
    } catch {
      setError('Erreur lors du chargement des formulaires');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('websitedomain')
      .select('domaine')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.domaine) setUserDomain(data.domaine);
      })
      .catch(() => {});
  }, [user]);

  const handleDelete = async (id: number) => {
    setError(null);
    try {
      await supabase.from('forms').delete().eq('id', id);
      setForms((prev) => prev.filter((f) => f.id !== id));
      setResponseCounts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  const handleDuplicate = async (formId: number) => {
    setDuplicating(formId);
    setError(null);
    try {
      // Fetch original form
      const { data: origForm, error: formErr } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .maybeSingle();

      if (formErr) throw formErr;
      if (!origForm) throw new Error('Formulaire introuvable');

      // Create copy
      const { data: newForm, error: insertErr } = await supabase
        .from('forms')
        .insert({
          user_id: user!.id,
          form_type_id: origForm.form_type_id || 1,
          directcheckout: origForm.directcheckout || 0,
          serviceid: origForm.serviceid || 0,
          productid: origForm.productid || 0,
          commerceid: user!.id,
          title: `${origForm.title || 'Formulaire'} (copie)`,
          description: origForm.description || '',
          form_json: origForm.form_json || '',
          structure: origForm.structure || '',
          coverimage: origForm.coverimage || '',
          productname: origForm.productname || '',
          pays: origForm.pays || '',
          ville: origForm.ville || '',
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;

      // Copy fields
      const { data: origFields, error: fieldsErr } = await supabase
        .from('form_fields')
        .select('label, type, options, position')
        .eq('form_id', formId)
        .order('position', { ascending: true });

      if (fieldsErr) throw fieldsErr;

      if (origFields && origFields.length > 0) {
        const newFields = origFields.map((f: Record<string, unknown>) => ({
          form_id: newForm.id,
          label: f.label,
          type: f.type,
          options: f.options,
          position: f.position,
        }));
        const { error: insertFieldsErr } = await supabase.from('form_fields').insert(newFields);
        if (insertFieldsErr) throw insertFieldsErr;
      }

      // Add to local state
      const duplicated: FormItem = {
        id: newForm.id,
        title: newForm.title,
        description: newForm.description,
        commerceid: newForm.commerceid,
        created_at: newForm.created_at,
      };
      setForms((prev) => [duplicated, ...prev]);
    } catch {
      setError('Erreur lors de la duplication');
    }
    setDuplicating(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
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
            <i className="ri-survey-line mr-2 text-primary-500"></i>
            Formulaires
          </h2>
          <p className="text-sm text-foreground-500 mt-1">Créez et gérez vos formulaires personnalisés</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/forms/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 transition-colors"
        >
          <i className="ri-add-line"></i>
          Nouveau formulaire
        </button>
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      ) : forms.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mb-3">
            <i className="ri-survey-line text-2xl text-foreground-300"></i>
          </div>
          <p className="text-foreground-500 mb-1">Aucun formulaire créé</p>
          <p className="text-xs text-foreground-400 mb-4">Cliquez sur "Nouveau formulaire" pour commencer</p>
          <button
            onClick={() => navigate('/dashboard/forms/new')}
            className="px-5 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors"
          >
            <i className="ri-add-line mr-1.5"></i>
            Créer mon premier formulaire
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {forms.map((form) => {
            const count = responseCounts[form.id] || 0;
            return (
              <div
                key={form.id}
                className="bg-background-50 border border-background-200/70 rounded-lg p-5 hover:border-background-300/60 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground-900 truncate">{form.title}</h3>
                    <p className="text-xs text-foreground-500 mt-0.5 line-clamp-2">
                      {form.description || 'Aucune description'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(form.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer flex-shrink-0 transition-colors"
                    title="Supprimer"
                  >
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                </div>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-background-200/70 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-primary-50 text-primary-700">
                    Formulaire #{form.id}
                  </span>
                  <span className="text-xs text-foreground-400">
                    {new Date(form.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    onClick={() => navigate(`/dashboard/forms/${form.id}/responses`)}
                    className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-50 text-accent-700 hover:bg-accent-100 cursor-pointer transition-colors whitespace-nowrap"
                    title="Voir les réponses"
                  >
                    <i className="ri-chat-check-line text-xs"></i>
                    {count} réponse{count !== 1 ? 's' : ''}
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-background-200/70">
                  <button
                    onClick={() => navigate(`/dashboard/forms/${form.id}/edit`)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-primary-600 hover:bg-primary-50 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <i className="ri-edit-line text-xs"></i>
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDuplicate(form.id)}
                    disabled={duplicating === form.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-secondary-700 hover:bg-secondary-50 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    {duplicating === form.id ? (
                      <i className="ri-loader-4-line animate-spin text-xs"></i>
                    ) : (
                      <i className="ri-file-copy-line text-xs"></i>
                    )}
                    Dupliquer
                  </button>
                  <button
                    onClick={async () => {
                      const origin = userDomain
                        ? `https://${userDomain}`
                        : window.location.origin;
                      const publicUrl = `${origin}/forms/${form.id}`;
                      try {
                        await navigator.clipboard.writeText(publicUrl);
                        setCopiedId(form.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      } catch {
                        // fallback: open in new tab
                        window.open(publicUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                      copiedId === form.id
                        ? 'bg-green-100 text-green-800'
                        : 'text-foreground-500 hover:text-foreground-700 hover:bg-background-100'
                    }`}
                  >
                    <i className={`text-xs ${copiedId === form.id ? 'ri-check-line' : 'ri-link'}`}></i>
                    {copiedId === form.id ? 'Lien copié !' : 'Copier le lien'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}