import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

interface ProductItem {
  id: number;
  name: string;
  description: string;
  prix: number;
  prix_promo: number | null;
  product_image: string;
  category: string | null;
  tags: string | null;
  status: string;
  created_at: string;
}

export default function ProduitsPublic() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant, isTenant } = useTenant();

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from('product')
      .select('*')
      .eq('status', 'active');
    
    if (isTenant && tenant) {
      query = query.eq('owner', tenant.id);
    }
    
    query.order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message);
        else setProducts(data || []);
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
            Nos <span className="text-primary-500">Produits</span>
          </h1>
          <p className="text-sm md:text-base text-foreground-500 max-w-xl mx-auto">
            Découvrez notre catalogue de produits
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
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
                <i className="ri-shopping-bag-line text-2xl text-foreground-400"></i>
              </div>
              <p className="text-foreground-500">Aucun produit pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-all duration-200 group">
                  <div className="h-52 bg-background-100 overflow-hidden relative">
                    <img
                      src={product.product_image ? product.product_image.split('|')[0] : 'https://readdy.ai/api/search-image?query=Professional%20product%20photography%20with%20clean%20minimalist%20studio%20background%20soft%20lighting%20ecommerce%20style%20modern%20aesthetic&width=600&height=600&seq=public-product-01&orientation=squarish'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://readdy.ai/api/search-image?query=Minimalist%20product%20placeholder%20with%20soft%20neutral%20gradient%20background%20clean%20design%20light%20tones&width=600&height=600&seq=public-product-fallback&orientation=squarish';
                      }}
                    />
                    {product.prix_promo && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-accent-500 text-background-50 rounded-full text-xs font-semibold">
                        Promo
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-foreground-900 mb-1 line-clamp-2">{product.name}</h3>
                    {product.category && (
                      <span className="text-xs text-foreground-400 mb-2 block">{product.category}</span>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        {product.prix_promo ? (
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-primary-600">{product.prix_promo.toLocaleString()} MAD</span>
                            <span className="text-xs text-foreground-400 line-through">{product.prix.toLocaleString()} MAD</span>
                          </div>
                        ) : (
                          <span className="text-base font-bold text-primary-600">{product.prix.toLocaleString()} MAD</span>
                        )}
                      </div>
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