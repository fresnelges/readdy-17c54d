import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { getProductImage } from '@/lib/productMedia';
import { useSectionContent } from '@/hooks/useSectionContent';
import { trackEvent, trackAddToCart } from '@/lib/facebookPixel';
import { useCart } from '@/hooks/useCart';

interface ProductItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  discount_enabled: boolean;
  discount_price: number | null;
  media: unknown;
  category_id: number | null;
  status: string;
  created_at: string;
  stock: number | null;
}

export default function ProduitsPublic() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant, isTenant } = useTenant();
  const { before, highlight, subtitle } = useSectionContent('produits');
  const { addToCart, currency } = useCart();

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from('product_items')
      .select('*')
      .eq('status', 'active');

    if (isTenant && tenant) {
      query = query.eq('idcommerce', tenant.id);
    }

    query
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message);
        else {
          const list = (data as ProductItem[]) || [];
          setProducts(list);
          // Suivi Facebook Pixel : consultation de la page produits.
          if (list.length > 0) {
            trackEvent('ViewContent', {
              content_type: 'product',
              content_ids: list.map((p) => String(p.id)),
            });
          }
        }
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [isTenant, tenant]);

  const monaie = tenant?.monaie || 'MAD';

  const handleAdd = (product: ProductItem) => {
    const price = Number(product.price || 0);
    const promo = product.discount_enabled && product.discount_price != null;
    const effective = promo ? Number(product.discount_price) : price;
    const stock = product.stock ?? 9999;
    addToCart({
      id: product.id,
      name: product.name,
      price: effective,
      original_price: promo ? price : null,
      media: getProductImage(product.media),
      stock,
    });
    trackAddToCart({
      content_ids: [String(product.id)],
      content_name: product.name,
      value: effective,
      currency: currency || monaie,
      num_items: 1,
    });
  };

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
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
                <i className="ri-shopping-bag-line text-2xl text-foreground-400"></i>
              </div>
              <p className="text-foreground-500">Aucun produit pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => {
                const imgSrc = getProductImage(product.media);
                const price = Number(product.price || 0);
                const promo = product.discount_enabled && product.discount_price != null;
                const outOfStock = product.stock != null && product.stock <= 0;
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

                      {isTenant && (
                        <button
                          type="button"
                          onClick={() => handleAdd(product)}
                          disabled={outOfStock}
                          className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            outOfStock
                              ? 'bg-background-100 text-foreground-400 cursor-not-allowed'
                              : 'bg-primary-500 text-background-50 hover:bg-primary-600'
                          }`}
                        >
                          <i className="ri-shopping-cart-line"></i>
                          {outOfStock ? 'Rupture de stock' : 'Ajouter au panier'}
                        </button>
                      )}
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