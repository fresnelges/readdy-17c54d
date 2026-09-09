import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

interface ProductItem {
  id: number;
  product_id: string;
  product_name: string;
  product_price: number;
  prix_promo: number | null;
  product_image: string;
  category: string | null;
  owner: string;
  created_at: string;
}

interface ProductsTagProps {
  limit?: number;
}

export default function ProductsTag({ limit }: ProductsTagProps) {
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

    if (limit) query = query.limit(limit);

    query
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) setError(fetchErr.message);
        else setProducts(data || []);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [isTenant, tenant, limit]);

  const FALLBACK_IMG =
    'https://readdy.ai/api/search-image?query=Professional%20minimalist%20product%20photography%20with%20clean%20neutral%20studio%20background%20soft%20diffused%20lighting%20ecommerce%20style%20modern%20aesthetic&width=600&height=600&seq=template-product-fallback&orientation=squarish';

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

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mb-3">
          <i className="ri-shopping-bag-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm text-foreground-500">Aucun produit pour le moment</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {products.map((product) => {
        const imgSrc = product.product_image
          ? product.product_image.split('|')[0]
          : FALLBACK_IMG;
        return (
          <div
            key={product.product_id}
            className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-all duration-200 group"
            data-product-shop="true"
          >
            <div className="h-48 bg-background-100 overflow-hidden relative">
              <img
                src={imgSrc}
                alt={product.product_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMG;
                }}
              />
              {product.prix_promo && (
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-accent-500 text-background-50 rounded-full text-xs font-semibold">
                  Promo
                </span>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-foreground-900 mb-1 line-clamp-2">
                {product.product_name}
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-primary-600">
                  {product.product_price
                    ? `${parseFloat(String(product.product_price)).toLocaleString()} ${tenant?.monaie || 'MAD'}`
                    : ''}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}