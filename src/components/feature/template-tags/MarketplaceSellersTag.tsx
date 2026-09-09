import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

interface SellerInfo {
  id: number;
  nomcommerce: string;
  description: string;
  email: string;
  telephone: string;
  adresse: string;
  image: string;
  ville: string;
  pays: string;
}

export default function MarketplaceSellersTag({ limit }: { limit?: number }) {
  const { tenant } = useTenant();
  const [sellers, setSellers] = useState<SellerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;

    // Get sellers who have active products on the marketplace
    supabase
      .from('annonce')
      .select('owner, idvendeur')
      .eq('publique', 1)
      .then(async ({ data: annoncesData }) => {
        if (!annoncesData || annoncesData.length === 0) {
          setSellers([]);
          setLoading(false);
          return;
        }

        const uniqueVendeurIds = [...new Set(annoncesData.map((a: { idvendeur: number }) => a.idvendeur).filter(Boolean))];

        // Get userwebsite for these sellers
        const { data: websites } = await supabase
          .from('userwebsite')
          .select('*')
          .in('id', uniqueVendeurIds);

        const sellerList = (websites || []).map((w: Record<string, unknown>) => ({
          id: w.id as number,
          nomcommerce: (w.nomcommerce as string) || (w.name as string) || 'Vendeur',
          description: (w.description as string) || '',
          email: (w.email as string) || '',
          telephone: (w.telephone as string) || '',
          adresse: (w.adresse as string) || '',
          image: (w.image as string) || '',
          ville: (w.Ville as string) || '',
          pays: (w.Pays as string) || '',
        }));

        if (limit) {
          setSellers(sellerList.slice(0, limit));
        } else {
          setSellers(sellerList);
        }
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

  if (sellers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
          <i className="ri-user-star-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm text-foreground-500">Aucun vendeur disponible</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {sellers.map((seller) => (
        <div
          key={seller.id}
          className="bg-background-50 border border-background-200/70 rounded-lg p-5 hover:border-background-300/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {seller.image ? (
                <img src={seller.image} alt={seller.nomcommerce} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-foreground-400">{seller.nomcommerce.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground-900 truncate">{seller.nomcommerce}</h3>
              {seller.ville && (
                <span className="text-[11px] text-foreground-400 flex items-center gap-1">
                  <i className="ri-map-pin-line text-xs"></i>
                  {seller.ville}{seller.pays ? `, ${seller.pays}` : ''}
                </span>
              )}
            </div>
          </div>
          {seller.description && (
            <p className="text-xs text-foreground-500 line-clamp-2 mb-3">{seller.description}</p>
          )}
          <div className="flex items-center gap-3 text-[11px] text-foreground-400">
            {seller.telephone && (
              <span className="flex items-center gap-1">
                <i className="ri-phone-line text-xs"></i>
                {seller.telephone}
              </span>
            )}
            {seller.email && (
              <span className="flex items-center gap-1 truncate">
                <i className="ri-mail-line text-xs"></i>
                {seller.email}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}