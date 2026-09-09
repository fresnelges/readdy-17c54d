import { useState, useEffect } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';

interface StatsData {
  productCount: number;
  serviceCount: number;
  partnerCount: number;
  portfolioCount: number;
}

export default function TenantHome() {
  const { tenant, theme } = useTenant();
  const [stats, setStats] = useState<StatsData>({ productCount: 0, serviceCount: 0, partnerCount: 0, portfolioCount: 0 });
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;

    const fetchData = async () => {
      try {
        const [prodRes, svcRes, partRes, portRes, featProdRes, featSvcRes] = await Promise.all([
          supabase.from('product').select('id', { count: 'exact' }).eq('owner', tenant.id).eq('status', 'active'),
          supabase.from('nospartenairesservices').select('id', { count: 'exact' }).eq('owner', tenant.id),
          supabase.from('partenaires').select('id', { count: 'exact' }).eq('owner', tenant.id),
          supabase.from('portfolio').select('id', { count: 'exact' }).eq('owner', tenant.id),
          supabase.from('product').select('*').eq('owner', tenant.id).eq('status', 'active').order('created_at', { ascending: false }).limit(4),
          supabase.from('nospartenairesservices').select('*').eq('owner', tenant.id).order('created_at', { ascending: false }).limit(3),
        ]);

        setStats({
          productCount: prodRes.count || 0,
          serviceCount: svcRes.count || 0,
          partnerCount: partRes.count || 0,
          portfolioCount: portRes.count || 0,
        });
        setProducts(featProdRes.data || []);
        setServices(featSvcRes.data || []);
      } catch {
        // silent
      }
      setLoading(false);
    };

    fetchData();
  }, [tenant]);

  const storeName = theme?.navTitle || tenant?.nomcommerce || tenant?.name || 'Boutique';
  const storeDescription = tenant?.description || tenant?.aboutus || '';

  // Hardcoded fallback image URL (product.image from DB takes priority)
  const FALLBACK_PRODUCT_IMG = 'https://readdy.ai/api/search-image?query=Professional%20product%20photography%20with%20clean%20minimalist%20studio%20background%20soft%20lighting%20ecommerce%20style%20modern%20aesthetic%20neutral%20tones&width=600&height=600&seq=tenant-home-prod-fallback&orientation=squarish';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative py-16 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background-100/50 to-transparent"></div>
        <div className="relative w-full px-4 md:px-6 max-w-7xl mx-auto text-center">
          {tenant?.image && (
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden mx-auto mb-6 border-2 border-background-200/70">
              <img
                src={tenant.image}
                alt={storeName}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-bold font-heading text-foreground-950 mb-3">
            {storeName}
          </h1>
          {storeDescription && (
            <p className="text-sm md:text-base text-foreground-500 max-w-2xl mx-auto leading-relaxed">
              {storeDescription}
            </p>
          )}

          <div className="flex items-center justify-center gap-6 md:gap-10 mt-8">
            {stats.productCount > 0 && (
              <Link to="/products" className="flex flex-col items-center gap-1 cursor-pointer no-underline group">
                <span className="text-2xl md:text-3xl font-bold font-heading text-foreground-950 group-hover:text-primary-600 transition-colors">
                  {stats.productCount}
                </span>
                <span className="text-xs text-foreground-500">Produits</span>
              </Link>
            )}
            {stats.serviceCount > 0 && (
              <Link to="/services" className="flex flex-col items-center gap-1 cursor-pointer no-underline group">
                <span className="text-2xl md:text-3xl font-bold font-heading text-foreground-950 group-hover:text-primary-600 transition-colors">
                  {stats.serviceCount}
                </span>
                <span className="text-xs text-foreground-500">Services</span>
              </Link>
            )}
            {stats.partnerCount > 0 && (
              <Link to="/partners" className="flex flex-col items-center gap-1 cursor-pointer no-underline group">
                <span className="text-2xl md:text-3xl font-bold font-heading text-foreground-950 group-hover:text-primary-600 transition-colors">
                  {stats.partnerCount}
                </span>
                <span className="text-xs text-foreground-500">Partenaires</span>
              </Link>
            )}
            {stats.portfolioCount > 0 && (
              <Link to="/portfolio" className="flex flex-col items-center gap-1 cursor-pointer no-underline group">
                <span className="text-2xl md:text-3xl font-bold font-heading text-foreground-950 group-hover:text-primary-600 transition-colors">
                  {stats.portfolioCount}
                </span>
                <span className="text-xs text-foreground-500">Projets</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {products.length > 0 && (
        <section className="py-10 md:py-16">
          <div className="w-full px-4 md:px-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
                <i className="ri-shopping-bag-line mr-2 text-primary-500"></i>
                Produits
              </h2>
              <Link to="/products" className="text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer no-underline whitespace-nowrap">
                Voir tout <i className="ri-arrow-right-line ml-1"></i>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {products.map((product) => {
                const imgSrc = product.product_image
                  ? product.product_image.split('|')[0]
                  : FALLBACK_PRODUCT_IMG;
                return (
                  <div key={product.product_id} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-all duration-200 group">
                    <div className="h-48 bg-background-100 overflow-hidden relative">
                      <img
                        src={imgSrc}
                        alt={product.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMG;
                        }}
                      />
                      {product.prix_promo && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-accent-500 text-background-50 rounded-full text-xs font-semibold">
                          Promo
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-foreground-900 mb-1 line-clamp-2">{product.product_name}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-primary-600">
                          {product.product_price ? `${parseFloat(product.product_price).toLocaleString()} ${tenant?.monaie || 'MAD'}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Featured Services */}
      {services.length > 0 && (
        <section className="py-10 md:py-16 bg-background-100/50">
          <div className="w-full px-4 md:px-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
                <i className="ri-service-line mr-2 text-primary-500"></i>
                Services
              </h2>
              <Link to="/services" className="text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer no-underline whitespace-nowrap">
                Voir tout <i className="ri-arrow-right-line ml-1"></i>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map((service) => (
                <div key={service.id} className="bg-background-50 border border-background-200/70 rounded-lg p-5 hover:border-background-300/60 transition-all duration-200">
                  <h3 className="text-base font-semibold text-foreground-900 mb-2">{service.titre}</h3>
                  <p className="text-sm text-foreground-500 mb-3 line-clamp-2">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-primary-600">
                      {service.prix ? `${parseFloat(service.prix).toLocaleString()} ${tenant?.monaie || 'MAD'}` : ''}
                    </span>
                    {service.tags && (
                      <span className="text-xs px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full">
                        {service.tags.split(',')[0].trim()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About section */}
      {(tenant?.aboutus || tenant?.description) && (
        <section className="py-10 md:py-16">
          <div className="w-full px-4 md:px-6 max-w-3xl mx-auto text-center">
            <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950 mb-4">
              &Agrave; propos de {storeName}
            </h2>
            <p className="text-sm md:text-base text-foreground-500 leading-relaxed">
              {tenant.aboutus || tenant.description}
            </p>
            {tenant.adresse && (
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-foreground-500">
                <i className="ri-map-pin-line text-primary-500"></i>
                <span>{[tenant.adresse, tenant.Quartier, tenant.Ville, tenant.Pays].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-10 md:py-16">
        <div className="w-full px-4 md:px-6 max-w-2xl mx-auto text-center">
          <div className="bg-background-50 border border-background-200/70 rounded-2xl p-8 md:p-10">
            <div className="w-12 h-12 rounded-full bg-accent-50 flex items-center justify-center mx-auto mb-4">
              <i className="ri-mail-send-line text-xl text-accent-600"></i>
            </div>
            <h3 className="text-lg font-bold font-heading text-foreground-950 mb-2">
              Une question ?
            </h3>
            <p className="text-sm text-foreground-500 mb-5">
              N&apos;h&eacute;sitez pas &agrave; nous contacter pour toute demande d&apos;information.
            </p>
            {tenant?.telephone && (
              <a
                href={`tel:${tenant.telephone}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors no-underline whitespace-nowrap"
              >
                <i className="ri-phone-line"></i>
                {tenant.telephone}
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}