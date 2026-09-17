import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { useSectionContent } from '@/hooks/useSectionContent';

interface ServiceItem {
  id: number;
  titre: string;
  description: string;
  detailssup: string | null;
  product_image: string;
  prix: number;
  prix_promo: number | null;
  tags: string | null;
  pays: string | null;
  ville: string | null;
  created_at: string;
}

interface ServiceCategory {
  id: number;
  nom: string;
}

export default function ServicesPublic() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant, isTenant } = useTenant();
  const { before, highlight, subtitle } = useSectionContent('services');

  const getServiceImages = (productImage: string): string[] => {
    if (!productImage) return [];
    return productImage.split('|').filter(Boolean).filter((url) => {
      const lower = url.toLowerCase();
      return !(lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov'));
    });
  };

  const getCoverImage = (productImage: string): string => {
    return getServiceImages(productImage)[0] || '';
  };

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('categorieservices')
        .select('id, nom')
        .order('nom');
      if (data) {
        const map = new Map<number, string>();
        data.forEach((cat: ServiceCategory) => map.set(cat.id, cat.nom));
        setCategoryMap(map);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCategories();
    let query = supabase
      .from('nospartenairesservices')
      .select('*');
    
    if (isTenant && tenant) {
      query = query.eq('idcommerce', tenant.id);
    }
    
    query.order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message);
        else setServices(data || []);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [fetchCategories, isTenant, tenant]);

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
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
                <i className="ri-service-line text-2xl text-foreground-400"></i>
              </div>
              <p className="text-foreground-500">Aucun service pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => {
                const coverUrl = getCoverImage(service.product_image);
                return (
                  <div key={service.id} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-all duration-200">
                    <div className="h-48 bg-background-100 overflow-hidden">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={service.titre}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className="ri-service-line text-3xl text-foreground-300"></i>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-base font-semibold text-foreground-900">{service.titre}</h3>
                        <div className="text-right flex-shrink-0">
                          {service.prix_promo ? (
                            <>
                              <span className="text-base font-bold text-primary-600 block">{service.prix_promo.toLocaleString()} ${tenant?.monaie || 'MAD'}</span>
                              <span className="text-xs text-foreground-400 line-through">{service.prix.toLocaleString()} ${tenant?.monaie || 'MAD'}</span>
                            </>
                          ) : (
                            <span className="text-base font-bold text-primary-600">{service.prix.toLocaleString()} ${tenant?.monaie || 'MAD'}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-foreground-500 mb-3 line-clamp-2">{service.description}</p>
                      {service.tags && (
                        <div className="flex items-center gap-1.5 flex-wrap mb-3">
                          {service.tags.split(',').map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs">{tag.trim()}</span>
                          ))}
                        </div>
                      )}
                      {service.detailssup && (
                        <p className="text-xs text-foreground-400 mt-2 line-clamp-3">{service.detailssup}</p>
                      )}
                      <div className="mt-3 pt-3 border-t border-background-200/70">
                        <span className="text-xs text-foreground-400">
                          <i className="ri-map-pin-line mr-1"></i>
                          {service.ville && service.pays ? `${service.ville}, ${service.pays}` : service.ville || service.pays || 'Non sp&eacute;cifi&eacute;'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}