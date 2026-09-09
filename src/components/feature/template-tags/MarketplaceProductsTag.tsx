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
  owner: string;
  idvendeur: number;
  publique: number;
  is_boost: boolean;
  created: string;
}

export default function MarketplaceProductsTag({ limit }: { limit?: number }) {
  const { tenant } = useTenant();
  const [products, setProducts] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;

    let query = supabase
      .from('annonce')
      .select('*')
      .eq('publique', 1)
      .order('created', { ascending: false });

    if (limit) query = query.limit(limit);

    query
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) throw fetchErr;
        setProducts((data as Annonce[]) || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tenant?.id, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <i className="ri-error-warning-line text-2xl text-red-400 mb-2 block"></i>
        <p className="text-sm text-red-600">Erreur de chargement</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
          <i className="ri-store-2-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm text-foreground-500">Aucun produit disponible sur le marketplace</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-colors group cursor-pointer"
        >
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
            {product.is_boost && (
              <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-500 text-background-50">
                Boosté
              </span>
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