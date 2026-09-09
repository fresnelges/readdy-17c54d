import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

interface FaqItem {
  id: number;
  titre: string;
  contenu?: string;
  description?: string;
  created_at: string;
}

export default function FaqTag() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const { tenant, isTenant } = useTenant();

  useEffect(() => {
    setLoading(true);
    let query = supabase.from('blog_articles').select('id, titre, contenu, created_at');

    if (isTenant && tenant) {
      query = query.eq('owner', tenant.id);
    }

    query
      .ilike('tags', '%faq%')
      .order('created_at', { ascending: true })
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) setError(fetchErr.message);
        else setItems((data as FaqItem[]) || []);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [isTenant, tenant]);

  const toggle = (id: number) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <i className="ri-loader-4-line animate-spin text-xl text-primary-500"></i>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <i className="ri-error-warning-line text-3xl text-red-400 mb-2"></i>
        <p className="text-sm text-foreground-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-1.5 rounded-full text-xs font-medium bg-background-100 text-foreground-600 hover:bg-background-200/70 transition-colors cursor-pointer"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mb-3">
          <i className="ri-question-answer-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm text-foreground-500">Aucune FAQ pour le moment</p>
      </div>
    );
  }

  return (
    <div className="faq-list">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className={`faq-item ${isOpen ? 'faq-item-open' : ''}`}
          >
            <button
              onClick={() => toggle(item.id)}
              className="faq-item-trigger"
              aria-expanded={isOpen}
            >
              <span className="faq-item-question">{item.titre}</span>
              <span className={`faq-item-icon ${isOpen ? 'faq-item-icon-rotated' : ''}`}>
                <i className={`ri-${isOpen ? 'subtract' : 'add'}-line`}></i>
              </span>
            </button>
            <div
              className={`faq-item-answer-wrapper ${isOpen ? 'faq-item-answer-open' : ''}`}
            >
              <div className="faq-item-answer">
                <p>{item.contenu || item.description || ''}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}