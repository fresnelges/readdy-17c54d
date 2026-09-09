import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ProductItem {
  id: number;
  name: string;
  category_id: number | null;
  status: string;
  price: number;
  stock: number;
  currency: string;
  discount_enabled: boolean;
  discount_price: number | null;
  media: { url: string; type: string }[] | null;
  product_categories?: { id: number; name: string } | null;
}

interface Category {
  id: number;
  nom: string;
  icon?: string;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
}

type PaymentMethod = 'cash' | 'card';
type Step = 'selling' | 'payment' | 'receipt';

const TAX_RATE = 0.20;

function getMediaArray(media: unknown): { url: string; type: string }[] {
  if (!media) return [];
  if (Array.isArray(media)) return media;
  if (typeof media === 'string') {
    try {
      const parsed = JSON.parse(media);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
}

function getProductImage(product: ProductItem): string {
  const mediaArr = getMediaArray(product.media);
  if (mediaArr.length > 0 && mediaArr[0].url) return mediaArr[0].url;
  return 'https://readdy.ai/api/search-image?query=Minimalist%20product%20on%20clean%20white%20background%20with%20soft%20shadow%2C%20ecommerce%20catalog%20style%2C%20neutral%20tones%2C%20simple%20composition&width=300&height=300&seq=caisse-prod-placeholder&orientation=squarish';
}

export default function CaissePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accessChecked, setAccessChecked] = useState(false);

  // Check if app is installed
  useEffect(() => {
    if (!user) return;
    supabase
      .from('appvendeur')
      .select('id')
      .eq('idcommerce', user.id)
      .eq('nompage', 'caisse')
      .eq('status', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          navigate('/dashboard/appstore', { replace: true });
        } else {
          setAccessChecked(true);
        }
      })
      .catch(() => {
        navigate('/dashboard/appstore', { replace: true });
      });
  }, [user, navigate]);

  // Products
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Payment
  const [step, setStep] = useState<Step>('selling');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [processing, setProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    orderId: number;
    items: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: PaymentMethod;
    amountReceived: number;
    change: number;
  } | null>(null);
  const [saleMessage, setSaleMessage] = useState<string | null>(null);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('product_items')
        .select('*, product_categories(id, name)')
        .eq('status', 'active')
        .eq('owner', user.id)
        .order('name');

      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setProducts(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur chargement produits');
    } finally {
      setLoading(false);
    }
  }, [user, categoryFilter]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('categorie')
        .select('id, nom, icon')
        .eq('idcommerce', user.id)
        .order('nom');
      setCategories(data || []);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  // Filtered products by search
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => {
    const price = item.product.discount_enabled && item.product.discount_price
      ? item.product.discount_price
      : item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Add to cart
  const addToCart = (product: ProductItem) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSaleMessage(null);
  };

  // Update quantity
  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      const newCart = prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stock) return item;
          return { ...item, quantity: newQty };
        })
        .filter((item): item is CartItem => item !== null);
      return newCart;
    });
  };

  // Remove from cart
  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setSaleMessage(null);
  };

  // Initiate payment
  const handleEncaisser = () => {
    if (cart.length === 0) return;
    setStep('payment');
    setAmountReceived('');
    setSaleMessage(null);
  };

  // Process sale
  const processSale = async () => {
    if (!user || cart.length === 0) return;

    const finalAmountReceived = paymentMethod === 'cash' ? parseFloat(amountReceived) || 0 : total;
    if (paymentMethod === 'cash' && finalAmountReceived < total) {
      setSaleMessage('Le montant reçu est insuffisant.');
      return;
    }

    setProcessing(true);
    setSaleMessage(null);

    try {
      const currency = cart[0]?.product.currency || 'MAD';
      const now = new Date().toISOString();

      // Create order header
      const { data: orderData, error: orderError } = await supabase
        .from('order_headers')
        .insert({
          customer_id: String(user.id),
          status: 'paid',
          currency: currency,
          subtotal_items: subtotal,
          tax_total: tax,
          payment_provider: paymentMethod === 'cash' ? 'cash' : 'card',
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Échec création commande');

      const orderId = orderData.id;

      // Create order items
      const orderItems = cart.map((item) => {
        const unitPrice = item.product.discount_enabled && item.product.discount_price
          ? item.product.discount_price
          : item.product.price;
        return {
          order_id: orderId,
          product_id: String(item.product.id),
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: unitPrice,
          final_price: unitPrice,
          subtotal: unitPrice * item.quantity,
          created_at: now,
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update stock for each product
      await Promise.all(
        cart.map((item) =>
          supabase
            .from('product_items')
            .update({
              stock: Math.max(0, item.product.stock - item.quantity),
              updated_at: now,
            })
            .eq('id', item.product.id)
        )
      );

      // Set receipt data
      const change = paymentMethod === 'cash' ? finalAmountReceived - total : 0;
      setReceiptData({
        orderId,
        items: [...cart],
        subtotal,
        tax,
        total,
        paymentMethod,
        amountReceived: finalAmountReceived,
        change,
      });

      setStep('receipt');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'encaissement';
      setSaleMessage(msg);
    } finally {
      setProcessing(false);
    }
  };

  // New sale
  const newSale = () => {
    setCart([]);
    setStep('selling');
    setReceiptData(null);
    setSaleMessage(null);
    fetchProducts();
  };

  // Back from payment
  const backToCart = () => {
    setStep('selling');
    setSaleMessage(null);
  };

  // Loading while checking access
  if (!accessChecked) {
    return (
      <div className="h-[calc(100vh-57px)] md:h-[calc(100vh-65px)] flex items-center justify-center bg-background-100">
        <div className="flex flex-col items-center gap-3">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
          <span className="text-sm text-foreground-500">Vérification de l&apos;accès...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-57px)] md:h-[calc(100vh-65px)] flex flex-col lg:flex-row bg-background-100 overflow-hidden">
      {/* ===== LEFT: Product Catalog ===== */}
      <div className="flex-1 flex flex-col min-w-0 bg-background-50">
        {/* Header */}
        <div className="px-4 md:px-5 py-3 border-b border-background-200/70 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg md:text-xl font-bold font-heading text-foreground-950">
                <i className="ri-shopping-cart-2-line mr-2 text-primary-500"></i>
                Ma caisse
              </h2>
              <p className="text-xs text-foreground-500 mt-0.5">Caisse enregistreuse</p>
            </div>
            {cart.length > 0 && (
              <div className="flex items-center gap-2 lg:hidden">
                <span className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold whitespace-nowrap">
                  {cartItemCount} article{cartItemCount > 1 ? 's' : ''} · {total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {cart[0]?.product.currency || 'MAD'}
                </span>
              </div>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
            />
          </div>
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="px-4 md:px-5 py-2.5 border-b border-background-200/70 flex items-center gap-2 overflow-x-auto flex-shrink-0">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                categoryFilter === null
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100'
              }`}
            >
              Tous
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                  categoryFilter === cat.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100'
                }`}
              >
                {cat.icon && <i className={`${cat.icon} text-xs`}></i>}
                {cat.nom}
              </button>
            ))}
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
              <p className="text-sm text-foreground-600 mb-3">{error}</p>
              <button onClick={fetchProducts} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
                Réessayer
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
                <i className="ri-shopping-bag-3-line text-2xl text-foreground-400"></i>
              </div>
              <h3 className="text-base font-semibold text-foreground-700 mb-1">
                {search ? 'Aucun résultat' : 'Aucun produit actif'}
              </h3>
              <p className="text-xs text-foreground-500">
                {search ? 'Essayez un autre terme' : 'Ajoutez des produits avec le statut "Actif"'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const mediaArr = getMediaArray(product.media);
                const coverUrl = mediaArr.length > 0 && mediaArr[0].url ? mediaArr[0].url : '';
                const effectivePrice = product.discount_enabled && product.discount_price
                  ? product.discount_price
                  : product.price;
                const isOutOfStock = product.stock <= 0;
                const cartItem = cart.find((ci) => ci.product.id === product.id);
                const inCartQty = cartItem?.quantity || 0;

                return (
                  <button
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    disabled={isOutOfStock}
                    className={`relative bg-background-50 border rounded-lg overflow-hidden text-left transition-all cursor-pointer group ${
                      isOutOfStock
                        ? 'border-background-200/70 opacity-50 cursor-not-allowed'
                        : inCartQty > 0
                          ? 'border-primary-300 bg-primary-50/30 hover:border-primary-400'
                          : 'border-background-200/70 hover:border-background-300/60 hover:shadow-sm'
                    }`}
                  >
                    {/* Image */}
                    <div className="aspect-square bg-background-100 overflow-hidden relative">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className="ri-shopping-bag-3-line text-3xl text-foreground-300"></i>
                        </div>
                      )}

                      {/* Stock badge */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 bg-red-500/90 text-white rounded-full text-[10px] font-semibold backdrop-blur-sm">
                            Rupture
                          </span>
                        ) : inCartQty > 0 ? (
                          <span className="px-2 py-0.5 bg-primary-500/90 text-white rounded-full text-[10px] font-semibold backdrop-blur-sm">
                            ×{inCartQty}
                          </span>
                        ) : null}
                        {!isOutOfStock && product.stock <= 5 && (
                          <span className="px-2 py-0.5 bg-amber-500/90 text-white rounded-full text-[10px] font-semibold backdrop-blur-sm">
                            {product.stock} restant{product.stock > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Discount badge */}
                      {product.discount_enabled && product.discount_price && !isOutOfStock && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-accent-500/90 text-white rounded text-[10px] font-bold backdrop-blur-sm">
                          Promo
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2.5">
                      <h4 className="text-xs font-semibold text-foreground-900 leading-tight line-clamp-2 mb-1.5">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-1.5">
                        {product.discount_enabled && product.discount_price ? (
                          <>
                            <span className="text-sm font-bold text-primary-600">
                              {product.discount_price.toLocaleString()} {product.currency}
                            </span>
                            <span className="text-[10px] text-foreground-400 line-through">
                              {product.price.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-primary-600">
                            {effectivePrice.toLocaleString()} {product.currency}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== RIGHT: Cart Panel ===== */}
      <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col bg-background-50 border-l border-background-200/70 flex-shrink-0">
        {/* Cart Header */}
        <div className="px-4 py-3 border-b border-background-200/70 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-heading text-foreground-950 flex items-center gap-2">
              <i className="ri-shopping-basket-2-line text-primary-500"></i>
              Panier
              {cartItemCount > 0 && (
                <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold">
                  {cartItemCount}
                </span>
              )}
            </h3>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-foreground-400 hover:text-red-500 transition-colors cursor-pointer flex items-center gap-1"
              >
                <i className="ri-delete-bin-line text-sm"></i>
                <span className="hidden sm:inline">Vider</span>
              </button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 py-10">
              <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mb-3">
                <i className="ri-shopping-basket-2-line text-2xl text-foreground-300"></i>
              </div>
              <p className="text-sm text-foreground-500 mb-1">Panier vide</p>
              <p className="text-xs text-foreground-400 text-center">
                Cliquez sur un produit pour l'ajouter au panier
              </p>
            </div>
          ) : (
            <div className="divide-y divide-background-200/70">
              {cart.map((item) => {
                const unitPrice = item.product.discount_enabled && item.product.discount_price
                  ? item.product.discount_price
                  : item.product.price;
                const lineTotal = unitPrice * item.quantity;

                return (
                  <div key={item.product.id} className="px-4 py-3 flex items-center gap-3">
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-md bg-background-100 overflow-hidden flex-shrink-0">
                      {getMediaArray(item.product.media).length > 0 && getMediaArray(item.product.media)[0]?.url ? (
                        <img
                          src={getMediaArray(item.product.media)[0].url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className="ri-shopping-bag-3-line text-lg text-foreground-300"></i>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-foreground-900 truncate">
                        {item.product.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-primary-600 whitespace-nowrap">
                          {unitPrice.toLocaleString()} {item.product.currency}
                        </span>
                        {item.product.discount_enabled && item.product.discount_price && (
                          <span className="text-[10px] text-foreground-400 line-through whitespace-nowrap">
                            {item.product.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity stepper */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded-full bg-background-100 border border-background-200/70 flex items-center justify-center text-foreground-500 hover:bg-background-200/70 hover:text-foreground-800 transition-colors cursor-pointer"
                      >
                        <i className="ri-subtract-line text-xs"></i>
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-foreground-900 tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-6 h-6 rounded-full bg-background-100 border border-background-200/70 flex items-center justify-center text-foreground-500 hover:bg-background-200/70 hover:text-foreground-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <i className="ri-add-line text-xs"></i>
                      </button>
                    </div>

                    {/* Line total */}
                    <span className="text-xs font-bold text-foreground-800 w-16 text-right tabular-nums flex-shrink-0">
                      {lineTotal.toLocaleString()} {item.product.currency}
                    </span>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
                    >
                      <i className="ri-close-line text-sm"></i>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="border-t border-background-200/70 flex-shrink-0 bg-background-50">
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-500">Sous-total</span>
                <span className="text-foreground-800 font-medium tabular-nums">
                  {subtotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {cart[0]?.product.currency || 'MAD'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-500">TVA ({(TAX_RATE * 100).toFixed(0)}%)</span>
                <span className="text-foreground-800 font-medium tabular-nums">
                  {tax.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {cart[0]?.product.currency || 'MAD'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-background-200/70">
                <span className="text-base font-bold text-foreground-950">Total</span>
                <span className="text-lg font-bold text-primary-600 tabular-nums">
                  {total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {cart[0]?.product.currency || 'MAD'}
                </span>
              </div>
            </div>

            {/* Payment method selector */}
            {step === 'selling' && (
              <div className="px-4 pb-3 space-y-3">
                <div className="flex items-center gap-1 bg-background-100 rounded-full p-1">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'cash'
                        ? 'bg-background-50 text-foreground-900 shadow-sm'
                        : 'text-foreground-500 hover:text-foreground-700'
                    }`}
                  >
                    <i className="ri-money-dollar-circle-line"></i>
                    Espèces
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'card'
                        ? 'bg-background-50 text-foreground-900 shadow-sm'
                        : 'text-foreground-500 hover:text-foreground-700'
                    }`}
                  >
                    <i className="ri-bank-card-line"></i>
                    Carte
                  </button>
                </div>

                <button
                  onClick={handleEncaisser}
                  disabled={cart.length === 0}
                  className="w-full py-3 bg-primary-500 text-background-50 rounded-full text-sm font-bold whitespace-nowrap hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className={`text-lg ${paymentMethod === 'cash' ? 'ri-money-dollar-circle-line' : 'ri-bank-card-line'}`}></i>
                  Encaisser · {total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {cart[0]?.product.currency}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Payment Modal ===== */}
      {step === 'payment' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={backToCart}></div>
          <div className="relative bg-background-50 rounded-xl w-full max-w-md mx-4 animate-scale-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-background-200/70">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  paymentMethod === 'cash'
                    ? 'bg-accent-50 text-accent-600'
                    : 'bg-primary-50 text-primary-600'
                }`}>
                  <i className={paymentMethod === 'cash' ? 'ri-money-dollar-circle-line' : 'ri-bank-card-line'}></i>
                </div>
                <h3 className="text-base font-bold font-heading text-foreground-950">
                  {paymentMethod === 'cash' ? 'Paiement en espèces' : 'Paiement par carte'}
                </h3>
              </div>
              <button
                onClick={backToCart}
                disabled={processing}
                className="w-8 h-8 rounded-full bg-background-100 flex items-center justify-center text-foreground-500 hover:text-foreground-800 hover:bg-background-200/70 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Total display */}
              <div className="bg-background-100 rounded-lg p-4 text-center">
                <span className="text-xs text-foreground-500 block mb-1">Montant à payer</span>
                <span className="text-3xl font-bold text-foreground-950 tabular-nums">
                  {total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {cart[0]?.product.currency || 'MAD'}
                </span>
              </div>

              {/* Cart summary */}
              <div className="text-xs text-foreground-500 space-y-1">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span className="tabular-nums">{subtotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA ({(TAX_RATE * 100).toFixed(0)}%)</span>
                  <span className="tabular-nums">{tax.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground-700 pt-1 border-t border-background-200/70">
                  <span>Total</span>
                  <span className="tabular-nums">{total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-foreground-400">
                  <span>Articles</span>
                  <span>{cartItemCount}</span>
                </div>
              </div>

              {/* Amount received (cash only) */}
              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-xs font-semibold text-foreground-600 mb-2">
                    Montant reçu
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && amountReceived) processSale();
                      }}
                      placeholder="0.00"
                      autoFocus
                      className="w-full px-4 py-3 bg-background-50 border border-background-200/70 rounded-lg text-lg font-bold text-foreground-900 text-center placeholder:text-foreground-300 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground-400 font-medium">
                      {cart[0]?.product.currency || 'MAD'}
                    </span>
                  </div>

                  {/* Quick amount buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    {[
                      Math.ceil(total / 10) * 10,
                      Math.ceil(total / 20) * 20,
                      Math.ceil(total / 50) * 50,
                      Math.ceil(total / 100) * 100,
                    ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setAmountReceived(String(amount))}
                        className="flex-1 px-2 py-1.5 bg-background-100 border border-background-200/70 rounded-lg text-xs font-medium text-foreground-600 hover:bg-background-200/70 hover:text-foreground-800 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {amount}
                      </button>
                    ))}
                  </div>

                  {/* Change preview */}
                  {amountReceived && parseFloat(amountReceived) >= total && (
                    <div className="mt-3 flex items-center justify-between px-4 py-3 bg-accent-50 rounded-lg">
                      <span className="text-sm font-semibold text-accent-700">
                        <i className="ri-exchange-dollar-line mr-1"></i>
                        Monnaie à rendre
                      </span>
                      <span className="text-lg font-bold text-accent-700 tabular-nums">
                        {(parseFloat(amountReceived) - total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {cart[0]?.product.currency || 'MAD'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Card payment info */}
              {paymentMethod === 'card' && (
                <div className="bg-background-100 rounded-lg p-4 text-center">
                  <i className="ri-bank-card-line text-3xl text-foreground-300 block mb-2"></i>
                  <p className="text-sm text-foreground-500">
                    Insérez ou passez la carte
                  </p>
                  <p className="text-xs text-foreground-400 mt-1">
                    Terminal connecté · Paiement sans contact accepté
                  </p>
                </div>
              )}

              {/* Error message */}
              {saleMessage && (
                <div className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs animate-fade-in-up">
                  <i className="ri-error-warning-line mr-1"></i>
                  {saleMessage}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-background-200/70 bg-background-50">
              <button
                onClick={backToCart}
                disabled={processing}
                className="flex-1 px-4 py-2.5 bg-background-100 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Retour
              </button>
              <button
                onClick={processSale}
                disabled={processing || (paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < total))}
                className="flex-[2] px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-bold whitespace-nowrap hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Encaissement...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line"></i>
                    Valider le paiement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Receipt Modal ===== */}
      {step === 'receipt' && receiptData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 animate-fade-in"></div>
          <div className="relative bg-background-50 rounded-xl w-full max-w-sm mx-4 animate-scale-in overflow-hidden">
            {/* Receipt Header */}
            <div className="px-5 py-4 border-b border-background-200/70 text-center bg-accent-50/50">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-accent-100 flex items-center justify-center">
                <i className="ri-check-line text-2xl text-accent-600"></i>
              </div>
              <h3 className="text-base font-bold font-heading text-foreground-950">Paiement accepté</h3>
              <p className="text-xs text-foreground-500 mt-0.5">
                Commande #{receiptData.orderId}
              </p>
              <p className="text-xs text-foreground-400">
                {new Date().toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Receipt Body */}
            <div className="px-5 py-4 max-h-[50vh] overflow-y-auto space-y-3">
              {/* Items */}
              <div>
                <h5 className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-2">
                  <i className="ri-shopping-basket-2-line mr-1"></i>
                  Articles ({receiptData.items.length})
                </h5>
                <div className="space-y-1.5">
                  {receiptData.items.map((item) => {
                    const unitPrice = item.product.discount_enabled && item.product.discount_price
                      ? item.product.discount_price
                      : item.product.price;
                    return (
                      <div key={item.product.id} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="text-foreground-800 truncate block">{item.product.name}</span>
                          <span className="text-xs text-foreground-400">
                            {unitPrice.toLocaleString()} {item.product.currency} × {item.quantity}
                          </span>
                        </div>
                        <span className="text-foreground-800 font-medium tabular-nums ml-3 whitespace-nowrap">
                          {(unitPrice * item.quantity).toLocaleString()} {item.product.currency}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-background-200/70 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground-500">Sous-total</span>
                  <span className="text-foreground-700 tabular-nums">
                    {receiptData.subtotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {receiptData.items[0]?.product.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-500">TVA ({(TAX_RATE * 100).toFixed(0)}%)</span>
                  <span className="text-foreground-700 tabular-nums">
                    {receiptData.tax.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {receiptData.items[0]?.product.currency}
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-background-200/70">
                  <span className="text-foreground-950">Total</span>
                  <span className="text-primary-600 tabular-nums">
                    {receiptData.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {receiptData.items[0]?.product.currency}
                  </span>
                </div>
              </div>

              {/* Payment info */}
              <div className="bg-background-100 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-foreground-500">Mode de paiement</span>
                  <span className="text-foreground-800 font-medium flex items-center gap-1">
                    <i className={receiptData.paymentMethod === 'cash' ? 'ri-money-dollar-circle-line' : 'ri-bank-card-line'}></i>
                    {receiptData.paymentMethod === 'cash' ? 'Espèces' : 'Carte bancaire'}
                  </span>
                </div>
                {receiptData.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-foreground-500">Montant reçu</span>
                      <span className="text-foreground-800 font-medium tabular-nums">
                        {receiptData.amountReceived.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {receiptData.items[0]?.product.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground-500">Monnaie rendue</span>
                      <span className="text-accent-700 font-bold tabular-nums">
                        {receiptData.change.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {receiptData.items[0]?.product.currency}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="px-5 py-4 border-t border-background-200/70 bg-background-50">
              <button
                onClick={newSale}
                className="w-full py-3 bg-primary-500 text-background-50 rounded-full text-sm font-bold whitespace-nowrap hover:bg-primary-600 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="ri-add-line text-lg"></i>
                Nouvelle vente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}