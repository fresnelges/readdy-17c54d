import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

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

export default function ServicesTag() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant, isTenant } = useTenant();

  useEffect(() => {
    setLoading(true);
    let query = supabase.from('nospartenairesservices').select('*');

    if (isTenant && tenant) {
      query = query.eq('idcommerce', tenant.id);
    }

    query
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) setError(fetchErr.message);
        else setServices(data || []);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [isTenant, tenant]);

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

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mb-3">
          <i className="ri-service-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm text-foreground-500">Aucun service pour le moment</p>
      </div>
    );
  }

  const getCoverImage = (productImage: string): string => {
    if (!productImage) return '';
    return productImage.split('|').filter(Boolean).filter((url) => {
      const lower = url.toLowerCase();
      return !(lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov'));
    })[0] || '';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {services.map((service) => {
        const coverUrl = getCoverImage(service.product_image);
        return (
          <div
            key={service.id}
            className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-all duration-200"
          >
            <div className="h-44 bg-background-100 overflow-hidden">
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
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-foreground-900">{service.titre}</h3>
                <div className="text-right flex-shrink-0">
                  {service.prix_promo ? (
                    <>
                      <span className="text-sm font-bold text-primary-600 block">
                        {service.prix_promo.toLocaleString()} {tenant?.monaie || 'MAD'}
                      </span>
                      <span className="text-xs text-foreground-400 line-through">
                        {service.prix.toLocaleString()} {tenant?.monaie || 'MAD'}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-bold text-primary-600">
                      {service.prix.toLocaleString()} {tenant?.monaie || 'MAD'}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-foreground-500 mb-2 line-clamp-2">{service.description}</p>
              {service.tags && (
                <div className="flex items-center gap-1 flex-wrap">
                  {service.tags.split(',').slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}