import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

interface Testimonial {
  id: number;
  titre: string;
  description: string;
  detailssup: string | null;
  product_image: string;
  tags: string | null;
  created_at: string;
}

export default function TestimonialsTag() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant, isTenant } = useTenant();

  useEffect(() => {
    setLoading(true);
    let query = supabase.from('temoignage').select('*');

    if (isTenant && tenant) {
      query = query.eq('idcommerce', tenant.id);
    }

    query
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) setError(fetchErr.message);
        else setTestimonials(data || []);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [isTenant, tenant]);

  const FALLBACK_AVATAR =
    'https://readdy.ai/api/search-image?query=Professional%20headshot%20portrait%20of%20a%20smiling%20person%20with%20clean%20white%20background%20soft%20studio%20lighting%20neutral%20expression%20corporate%20style&width=200&height=200&seq=template-testimonial-avatar&orientation=squarish';

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
      </div>
    );
  }

  if (testimonials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mb-3">
          <i className="ri-chat-quote-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm text-foreground-500">Aucun témoignage pour le moment</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {testimonials.map((t) => (
        <div
          key={t.id}
          className="bg-background-50 border border-background-200/70 rounded-lg p-5 hover:border-background-300/60 transition-all duration-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-background-100 overflow-hidden flex-shrink-0">
              <img
                src={t.product_image || FALLBACK_AVATAR}
                alt={t.titre}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_AVATAR;
                }}
              />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-foreground-900 truncate">{t.titre}</h4>
              {t.tags && (
                <p className="text-xs text-foreground-500 truncate">{t.tags}</p>
              )}
            </div>
          </div>
          <div className="relative">
            <i className="ri-double-quotes-l text-2xl text-accent-200 absolute -top-1 -left-0.5 leading-none"></i>
            <p className="text-sm text-foreground-600 leading-relaxed pl-6 line-clamp-4">
              {t.description}
            </p>
          </div>
          {t.detailssup && (
            <p className="text-xs text-foreground-400 mt-3 pl-6 line-clamp-2">
              {t.detailssup}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}