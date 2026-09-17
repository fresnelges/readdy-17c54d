import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { getProductImage } from '@/lib/productMedia';

interface ProductItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  discount_enabled: boolean;
  discount_price: number | null;
  media: unknown;
}

interface ServiceItem {
  id: number;
  titre: string;
  description: string | null;
  product_image: string | null;
  prix: number;
  prix_promo: number | null;
  tags: string | null;
}

function getServiceCover(productImage: string | null): string {
  if (!productImage) return '';
  return productImage
    .split('|')
    .filter(Boolean)
    .filter((url) => {
      const lower = url.toLowerCase();
      return !(lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov'));
    })[0] || '';
}

export default function RecherchePublic() {
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') || '').trim();
  const { tenant, isTenant } = useTenant();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q) {
      setProducts([]);
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let productQuery = supabase.from('product_items').select('*');
    let serviceQuery = supabase.from('nospartenairesservices').select('*');

    if (isTenant && tenant) {
      productQuery = productQuery.eq('idcommerce', tenant.id);
      serviceQuery = serviceQuery.eq('idcommerce', tenant.id);
    }

    productQuery = productQuery
      .eq('status', 'active')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(24);

    serviceQuery = serviceQuery
      .or(`titre.ilike.%${q}%,description.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(24);

    Promise.all([productQuery, serviceQuery])
      .then(([prodRes, svcRes]) => {
        if (prodRes.error || svcRes.error) {
          setError(prodRes.error?.message || svcRes.error?.message || 'Erreur de chargement');
        } else {
          setProducts((prodRes.data as ProductItem[]) || []);
          setServices((svcRes.data as ServiceItem[]) || []);
        }
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [q, isTenant, tenant]);

  const monaie = tenant?.monaie || 'MAD';
  const total = products.length + services.length;

  return (
    <div className="min-h-screen bg-background-50">
      {/* Header */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background-100/50 to-transparent"></div>
        <div className="relative w-full px-4 md:px-6 max-w-7xl mx-auto text-center">
          <h1 className="text-2xl md:text-4xl font-bold font-heading text-foreground-950 mb-2">
            {q ? (
              <>
                Résultats pour <span className="text-primary-500">&laquo;&nbsp;{q}&nbsp;&raquo;</span>
              </>
            ) : (
              'Recherche'
            )}
          </h1>
          <p className="text-sm md:text-base text-foreground-500">
            {loading ? 'Recherche en cours…' : `${total} résultat${total > 1 ? 's' : ''} trouvé${total > 1 ? 's' : ''}`}
          </p>
        </div>
      </section>

      <section className="py-6 md:py-10">
        <div className="w-full px-4 md:px-6 max-w-7xl mx-auto">
          {!q ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
                <i className="ri-search-line text-2xl text-foreground-400"></i>
              </div>
              <p className="text-foreground-500">Saisissez un terme pour lancer une recherche.</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
              <p className="text-foreground-500">{error}</p>
            </div>
          ) : total === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
                <i className="ri-inbox-line text-2xl text-foreground-400"></i>
              </div>
              <p className="text-foreground-950 font-medium mb-1">Aucun résultat</p>
              <p className="text-sm text-foreground-500">Essayez avec un autre mot-clé.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Produits */}
              {products.length > 0 && (
                <div>
                  <h2 className="text-lg md:text-xl font-bold font-heading text-foreground-950 mb-4">
                    <i className="ri-shopping-bag-line mr-2 text-primary-500"></i>
                    Produits ({products.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map((product) => {
                      const imgSrc = getProductImage(product.media);
                      const price = Number(product.price || 0);
                      const promo = product.discount_enabled && product.discount_price != null;
                      return (
                        <div
                          key={product.id}
                          className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-all duration-200 group"
                          data-product-shop="true"
                        >
                          <div className="h-52 bg-background-100 overflow-hidden relative">
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <i className="ri-shopping-bag-line text-3xl text-foreground-300"></i>
                              </div>
                            )}
                            {promo && (
                              <span className="absolute top-2 left-2 px-2 py-0.5 bg-accent-500 text-background-50 rounded-full text-xs font-semibold">
                                Promo
                              </span>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="text-sm font-semibold text-foreground-900 mb-1 line-clamp-2">{product.name}</h3>
                            <div className="flex items-center gap-2">
                              {promo && product.discount_price != null ? (
                                <>
                                  <span className="text-base font-bold text-primary-600">
                                    {Number(product.discount_price).toLocaleString()} {monaie}
                                  </span>
                                  <span className="text-xs text-foreground-400 line-through">
                                    {price.toLocaleString()} {monaie}
                                  </span>
                                </>
                              ) : (
                                <span className="text-base font-bold text-primary-600">
                                  {price ? `${price.toLocaleString()} ${monaie}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Services */}
              {services.length > 0 && (
                <div>
                  <h2 className="text-lg md:text-xl font-bold font-heading text-foreground-950 mb-4">
                    <i className="ri-service-line mr-2 text-primary-500"></i>
                    Services ({services.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => {
                      const coverUrl = getServiceCover(service.product_image);
                      const prix = Number(service.prix || 0);
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
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="text-base font-semibold text-foreground-900">{service.titre}</h3>
                              <div className="text-right flex-shrink-0">
                                {service.prix_promo ? (
                                  <>
                                    <span className="text-base font-bold text-primary-600 block">
                                      {Number(service.prix_promo).toLocaleString()} {monaie}
                                    </span>
                                    <span className="text-xs text-foreground-400 line-through">
                                      {prix.toLocaleString()} {monaie}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-base font-bold text-primary-600">
                                    {prix ? `${prix.toLocaleString()} ${monaie}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-foreground-500 mb-3 line-clamp-2">{service.description}</p>
                            {service.tags && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {service.tags.split(',').map((tag) => (
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
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}