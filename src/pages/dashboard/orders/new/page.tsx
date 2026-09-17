import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getCommerceId } from '@/lib/ownership';

interface ProductItem {
  id: number;
  name: string;
  price: number;
  currency: string;
  discount_enabled: boolean;
  discount_price: number | null;
  stock: number;
  media: { url: string; type: string }[];
  product_categories?: { id: number; name: string } | null;
}

interface CartLine {
  productId: number;
  productName: string;
  unitPrice: number;
  finalPrice: number;
  quantity: number;
  subtotal: number;
  stock: number;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

export default function NewOrderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customerId') || '';

  // Customer
  const [customer, setCustomer] = useState<CustomerInfo>({ name: '', email: '', phone: '' });
  const [customerLoading, setCustomerLoading] = useState(false);

  // Products
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [search, setSearch] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Cart
  const [cart, setCart] = useState<CartLine[]>([]);

  // Order
  const [currency, setCurrency] = useState('MAD');
  const [customerNotes, setCustomerNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch customer info
  useEffect(() => {
    if (!customerId || !user) return;
    setCustomerLoading(true);
    (async () => {
      // Try users table
      const { data: u } = await supabase.from('users').select('name, email, telephone').eq('id', customerId).maybeSingle();
      if (u) {
        setCustomer({ name: u.name || '', email: u.email || '', phone: u.telephone || '' });
        setCustomerLoading(false);
        return;
      }
      // Try order_headers recipient
      const { data: oh } = await supabase.from('order_headers').select('recipient').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (oh && oh.recipient) {
        const r = oh.recipient as Record<string, string>;
        setCustomer({ name: r.name || '', email: r.email || '', phone: r.phone || '' });
      }
      setCustomerLoading(false);
    })();
  }, [customerId, user]);

  // Fetch products (scoped to the connected merchant) — supports empty query to list all
  const searchProducts = useCallback(async (q: string) => {
    if (!user) { setProducts([]); return; }
    setProductsLoading(true);
    try {
      let query = supabase
        .from('product_items')
        .select('*, product_categories(id, name)')
        .eq('status', 'active')
        .eq('idcommerce', getCommerceId(user))
        .order('name')
        .limit(50);

      if (q && q.trim()) {
        query = query.ilike('name', `%${q.trim()}%`);
      }

      const { data } = await query;
      setProducts(data as ProductItem[] || []);
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, [user]);

  const addToCart = (p: ProductItem) => {
    if (p.stock != null && p.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(l => l.productId === p.id);
      if (existing) {
        if (existing.stock != null && existing.quantity + 1 > existing.stock) return prev;
        return prev.map(l => l.productId === p.id
          ? { ...l, quantity: l.quantity + 1, subtotal: (l.quantity + 1) * l.finalPrice }
          : l
        );
      }
      const finalPrice = p.discount_enabled && p.discount_price ? p.discount_price : p.price;
      return [...prev, {
        productId: p.id,
        productName: p.name,
        unitPrice: p.price,
        finalPrice,
        quantity: 1,
        subtotal: finalPrice,
        stock: p.stock ?? null as unknown as number,
      }];
    });
    setShowProductPicker(false);
    setSearch('');
    setProducts([]);
  };

  const updateQty = (idx: number, qty: number) => {
    if (qty < 1) return;
    setCart(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      if (l.stock != null && qty > l.stock) return l;
      return { ...l, quantity: qty, subtotal: qty * l.finalPrice };
    }));
  };

  const removeLine = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const subtotal = cart.reduce((s, l) => s + l.subtotal, 0);

  const createOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const { data: header, error: headerErr } = await supabase
        .from('order_headers')
        .insert({
          customer_id: customerId || null,
          currency,
          payment_provider: 'manual',
          status: 'pending_payment',
          subtotal_items: subtotal,
          customer_notes: customerNotes || null,
          admin_notes: adminNotes || null,
          recipient: { name: customer.name, email: customer.email, phone: customer.phone },
        })
        .select('id')
        .single();

      if (headerErr) throw headerErr;

      const items = cart.map(l => ({
        order_id: header.id,
        product_id: String(l.productId),
        product_name: l.productName,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        final_price: l.finalPrice,
        subtotal: l.subtotal,
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(items);
      if (itemsErr) throw itemsErr;

      setSuccess(true);
      setTimeout(() => navigate('/dashboard/orders'), 1500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center py-32">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <i className="ri-check-line text-3xl text-green-600"></i>
        </div>
        <h2 className="text-xl font-bold text-foreground-950 mb-2">Commande créée !</h2>
        <p className="text-sm text-foreground-500">Redirection vers les commandes...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-foreground-500 hover:text-foreground-800 mb-3 cursor-pointer">
        <i className="ri-arrow-left-line"></i>
        <span>Retour</span>
      </button>

      <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950 mb-6">
        <i className="ri-add-circle-line mr-2 text-primary-500"></i>
        Nouvelle commande
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer + Products */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer Info */}
          <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground-800 mb-3 flex items-center gap-2">
              <i className="ri-user-line text-primary-500"></i>
              Client
            </h3>
            {customerLoading ? (
              <p className="text-sm text-foreground-500">Chargement...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-foreground-500 block mb-1">Nom</label>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                    placeholder="Nom du client"
                  />
                </div>
                <div>
                  <label className="text-xs text-foreground-500 block mb-1">Email</label>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                    placeholder="email@exemple.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-foreground-500 block mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={customer.phone}
                    onChange={(e) => setCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                    placeholder="+212..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Product Picker */}
          <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
                <i className="ri-shopping-bag-3-line text-primary-500"></i>
                Produits ({cart.length})
              </h3>
              <button
                onClick={() => { setShowProductPicker(true); setSearch(''); searchProducts(''); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-background-50 rounded-full text-xs font-medium hover:bg-primary-600 transition-colors cursor-pointer"
              >
                <i className="ri-add-line"></i>
                Ajouter un produit
              </button>
            </div>

            {/* Product search modal */}
            {showProductPicker && (
              <>
                <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowProductPicker(false)}></div>
                <div className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[500px] max-h-[70vh] bg-background-50 border border-background-200/70 rounded-lg shadow-xl z-50 flex flex-col">
                  <div className="p-4 border-b border-background-200/70">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
                        <input
                          type="text"
                          placeholder="Rechercher un produit..."
                          value={search}
                          onChange={(e) => { setSearch(e.target.value); searchProducts(e.target.value); }}
                          autoFocus
                          className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                        />
                      </div>
                      <button onClick={() => setShowProductPicker(false)} className="text-foreground-400 hover:text-foreground-700 cursor-pointer">
                        <i className="ri-close-line text-xl"></i>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {productsLoading ? (
                      <div className="flex justify-center py-8"><i className="ri-loader-4-line animate-spin text-primary-500"></i></div>
                    ) : products.length === 0 ? (
                      <p className="text-center py-8 text-sm text-foreground-500">
                        {search ? 'Aucun produit trouvé' : 'Aucun produit disponible'}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {products.map(p => {
                          const fp = p.discount_enabled && p.discount_price ? p.discount_price : p.price;
                          const outOfStock = p.stock != null && p.stock <= 0;
                          const lowStock = p.stock != null && p.stock > 0 && p.stock <= 5;
                          return (
                            <button
                              key={p.id}
                              onClick={() => addToCart(p)}
                              disabled={outOfStock}
                              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-background-100 transition-colors text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="w-10 h-10 rounded bg-background-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {p.media && p.media.length > 0 ? (
                                  <img src={p.media[0].url} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <i className="ri-image-line text-foreground-400"></i>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground-900 truncate">{p.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-semibold text-primary-600">{fp.toLocaleString()} {p.currency}</span>
                                  {p.discount_enabled && p.discount_price && (
                                    <span className="text-xs text-foreground-400 line-through">{p.price.toLocaleString()} {p.currency}</span>
                                  )}
                                </div>
                              </div>
                              {p.stock != null ? (
                                outOfStock ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 whitespace-nowrap">
                                    <i className="ri-close-circle-line"></i>Rupture
                                  </span>
                                ) : lowStock ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 whitespace-nowrap">
                                    <i className="ri-alert-line"></i>Stock {p.stock}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 whitespace-nowrap">
                                    <i className="ri-checkbox-circle-line"></i>{p.stock}
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-background-200/70 text-foreground-500 whitespace-nowrap">
                                  Stock illimité
                                </span>
                              )}
                              {!outOfStock && <i className="ri-add-circle-line text-primary-500"></i>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Cart lines */}
            {cart.length === 0 ? (
              <p className="text-sm text-foreground-500 text-center py-8">Aucun produit ajouté. Cliquez sur "Ajouter un produit"</p>
            ) : (
              <div className="space-y-2">
                {cart.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-background-100 rounded-lg px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground-900 truncate">{line.productName}</p>
                      <p className="text-xs text-foreground-500">{line.finalPrice.toLocaleString()} {currency} / unité</p>
                      {line.stock != null && (
                        <p className={`text-[11px] mt-0.5 ${line.quantity >= line.stock ? 'text-amber-600 font-medium' : 'text-foreground-400'}`}>
                          Stock disponible : {line.stock}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(idx, line.quantity - 1)}
                        className="w-7 h-7 rounded-full bg-background-50 border border-background-200/70 flex items-center justify-center text-foreground-600 hover:bg-background-200/50 cursor-pointer text-sm"
                      >
                        <i className="ri-subtract-line"></i>
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-foreground-900">{line.quantity}</span>
                      <button
                        onClick={() => updateQty(idx, line.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-background-50 border border-background-200/70 flex items-center justify-center text-foreground-600 hover:bg-background-200/50 cursor-pointer text-sm"
                      >
                        <i className="ri-add-line"></i>
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-foreground-900 w-20 text-right">{line.subtotal.toLocaleString()} {currency}</span>
                    <button onClick={() => removeLine(idx)} className="text-foreground-400 hover:text-red-500 cursor-pointer">
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground-800 mb-3 flex items-center gap-2">
              <i className="ri-sticky-note-line text-primary-500"></i>
              Notes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground-500 block mb-1">Note client (visible)</label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300 resize-none"
                  placeholder="Instructions du client..."
                  maxLength={500}
                ></textarea>
              </div>
              <div>
                <label className="text-xs text-foreground-500 block mb-1">Note admin (interne)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300 resize-none"
                  placeholder="Notes internes..."
                  maxLength={500}
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="lg:col-span-1">
          <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 sticky top-20">
            <h3 className="text-sm font-semibold text-foreground-800 mb-4">Récapitulatif</h3>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-foreground-500">Articles</span>
                <span className="text-foreground-900 font-medium">{cart.reduce((s, l) => s + l.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-500">Devise</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="text-sm text-foreground-900 bg-transparent border-none focus:outline-none cursor-pointer"
                >
                  <option value="MAD">MAD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div className="border-t border-background-200/70 pt-3 mb-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-foreground-800">Total</span>
                <span className="text-xl font-bold text-primary-600">{subtotal.toLocaleString()} {currency}</span>
              </div>
            </div>

            <button
              onClick={createOrder}
              disabled={cart.length === 0 || submitting}
              className="w-full py-3 bg-primary-500 text-background-50 rounded-lg font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Création...
                </>
              ) : (
                <>
                  <i className="ri-check-line"></i>
                  Créer la commande
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}