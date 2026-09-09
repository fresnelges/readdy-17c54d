import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

interface Annonce {
  id: number;
  titre: string;
  description: string;
  prix: string;
  ville: string;
  image: string;
  is_boost: boolean;
  created: string;
}

export default function FeaturedProductsTag({ limit = 6 }: { limit?: number }) {
  const { tenant } = useTenant();
  const [products, setProducts] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;

    supabase
      .from('annonce')
      .select('*')
      .eq('publique', 1)
      .eq('is_boost', true)
      .order('created', { ascending: false })
      .limit(limit)
      .then(({ data }) => setProducts((data as Annonce[]) || []))
      .catch(() => { /* */ })
      .finally(() => setLoading(false));
  }, [tenant?.id, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
          <i className="ri-star-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm text-foreground-500">Aucun produit en vedette</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {products.map((product) => (
        <div
          key={product.id}
          className="group relative bg-background-50 border-2 border-accent-200/60 rounded-lg overflow-hidden hover:border-accent-300/80 transition-all cursor-pointer"
        >
          <div className="absolute top-3 left-3 z-10">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-500 text-background-50 flex items-center gap-1">
              <i className="ri-flashlight-fill text-xs"></i>
              En vedette
            </span>
          </div>
          <div className="aspect-[4/3] bg-background-100 flex items-center justify-center overflow-hidden">
            {product.image ? (
              <img
                src={product.image}
                alt={product.titre}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <i className="ri-image-line text-3xl text-foreground-300"></i>
            )}
          </div>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-foreground-900 mb-1 truncate">{product.titre}</h3>
            <p className="text-xs text-foreground-500 line-clamp-2 mb-3">{product.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-primary-600">
                {product.prix ? `${Number(product.prix).toLocaleString()} FCFA` : 'Gratuit'}
              </span>
              {product.ville && (
                <span className="text-[11px] text-foreground-400 flex items-center gap-1">
                  <i className="ri-map-pin-line text-xs"></i>
                  {product.ville}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}