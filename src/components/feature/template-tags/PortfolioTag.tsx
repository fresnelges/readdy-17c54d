import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

interface PortfolioItem {
  id: number;
  titre: string;
  description: string;
  detailssup: string | null;
  product_image: string;
  prix: number;
  tags: string | null;
  pays: string | null;
  ville: string | null;
  created_at: string;
}

export default function PortfolioTag() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant, isTenant } = useTenant();

  useEffect(() => {
    setLoading(true);
    let query = supabase.from('portfolio').select('*');

    if (isTenant && tenant) {
      query = query.eq('owner', tenant.id);
    }

    query
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) setError(fetchErr.message);
        else setItems(data || []);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [isTenant, tenant]);

  const FALLBACK_IMG =
    'https://readdy.ai/api/search-image?query=Professional%20portfolio%20project%20showcase%20with%20clean%20modern%20aesthetic%20soft%20gradient%20background%20abstract%20geometric%20design%20corporate%20style&width=600&height=400&seq=template-portfolio-fallback&orientation=landscape';

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

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mb-3">
          <i className="ri-briefcase-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm text-foreground-500">Aucun projet pour le moment</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-all duration-200"
        >
          <div className="h-44 bg-background-100 overflow-hidden">
            <img
              src={item.product_image || FALLBACK_IMG}
              alt={item.titre}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_IMG;
              }}
            />
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-foreground-900">{item.titre}</h3>
              {item.prix > 0 && (
                <span className="text-sm font-bold text-primary-600 whitespace-nowrap flex-shrink-0">
                  {item.prix.toLocaleString()} {tenant?.monaie || 'MAD'}
                </span>
              )}
            </div>
            <p className="text-xs text-foreground-500 mb-2 line-clamp-2">{item.description}</p>
            {item.tags && (
              <div className="flex items-center gap-1 flex-wrap mb-2">
                {item.tags.split(',').slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
            <div className="pt-2 border-t border-background-200/70">
              <span className="text-xs text-foreground-400">
                <i className="ri-map-pin-line mr-1"></i>
                {item.ville && item.pays
                  ? `${item.ville}, ${item.pays}`
                  : item.ville || item.pays || 'Non spécifié'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}