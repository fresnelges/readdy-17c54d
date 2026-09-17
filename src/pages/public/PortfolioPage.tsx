import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { useSectionContent } from '@/hooks/useSectionContent';

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

export default function PortfolioPublic() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant, isTenant } = useTenant();
  const { before, highlight, subtitle } = useSectionContent('portfolio');

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from('portfolio')
      .select('*');
    
    if (isTenant && tenant) {
      query = query.eq('idcommerce', tenant.id);
    }
    
    query.order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message);
        else setItems(data || []);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [isTenant, tenant]);

  return (
    <div className="min-h-screen bg-background-50">
      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background-100/50 to-transparent"></div>
        <div className="relative w-full px-4 md:px-6 max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold font-heading text-foreground-950 mb-4">
            {before}
            {before && highlight ? ' ' : ''}
            {highlight && <span className="text-primary-500">{highlight}</span>}
          </h1>
          <p className="text-sm md:text-base text-foreground-500 max-w-xl mx-auto">
            {subtitle}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 md:py-12">
        <div className="w-full px-4 md:px-6 max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
              <p className="text-foreground-500">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
                <i className="ri-briefcase-line text-2xl text-foreground-400"></i>
              </div>
              <p className="text-foreground-500">Aucun projet pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div key={item.id} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-all duration-200">
                  <div className="h-48 bg-background-100 overflow-hidden">
                    <img
                      src={item.product_image || 'https://readdy.ai/api/search-image?query=Professional%20portfolio%20project%20showcase%20with%20clean%20modern%20aesthetic%20soft%20gradient%20background%20abstract%20geometric%20design%20corporate%20style&width=600&height=400&seq=public-portfolio-01&orientation=landscape'}
                      alt={item.titre}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://readdy.ai/api/search-image?query=Minimalist%20placeholder%20with%20soft%20neutral%20gradient%20background%20professional%20clean%20aesthetic&width=600&height=400&seq=public-portfolio-fallback&orientation=landscape';
                      }}
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-base font-semibold text-foreground-900">{item.titre}</h3>
                      {item.prix > 0 && (
                        <span className="text-sm font-bold text-primary-600 whitespace-nowrap flex-shrink-0">{item.prix.toLocaleString()} {tenant?.monaie || 'MAD'}</span>
                      )}
                    </div>
                    <p className="text-sm text-foreground-500 mb-3 line-clamp-2">{item.description}</p>
                    {item.tags && (
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        {item.tags.split(',').map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs">{tag.trim()}</span>
                        ))}
                      </div>
                    )}
                    {item.detailssup && (
                      <p className="text-xs text-foreground-400 mt-2 line-clamp-3">{item.detailssup}</p>
                    )}
                    <div className="mt-3 pt-3 border-t border-background-200/70">
                      <span className="text-xs text-foreground-400">
                        <i className="ri-map-pin-line mr-1"></i>
                        {item.ville && item.pays ? `${item.ville}, ${item.pays}` : item.ville || item.pays || 'Non spécifié'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}