import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface StockMovement {
  id: number;
  idcommerce: number;
  idarticle: number;
  quantiteactuelle: number;
  quantiteajouter: number;
  stocktotal: number;
  date: string;
  product_name?: string;
}

interface ProductItem {
  id: number;
  name: string;
  stock: number;
}

export default function StockPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add movement modal
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch products
      const { data: productData, error: productErr } = await supabase
        .from('product_items')
        .select('id, name, stock')
        .order('name');

      if (productErr) throw productErr;
      setProducts(productData || []);

      // Fetch stock movements
      if (user?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('idcommerce')
          .eq('id', user.id)
          .maybeSingle();

        if (userData?.idcommerce) {
          const { data: movementData, error: moveErr } = await supabase
            .from('mouvementstock')
            .select('*')
            .eq('idcommerce', userData.idcommerce)
            .order('date', { ascending: false });

          if (moveErr) throw moveErr;

          // Map product names
          const productMap = new Map<number, string>();
          (productData || []).forEach((p) => productMap.set(p.id, p.name));

          setMovements(
            (movementData || []).map((m) => ({
              ...m,
              product_name: productMap.get(m.idarticle) || `Produit #${m.idarticle}`,
            }))
          );
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity || !user) return;
    setSaving(true);
    setMsg(null);
    try {
      // Get user's idcommerce
      const { data: userData } = await supabase
        .from('users')
        .select('idcommerce')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData?.idcommerce) throw new Error('ID commerce introuvable');

      const qty = parseInt(quantity, 10);
      const product = products.find((p) => p.id === selectedProduct);
      const stockActuel = product?.stock || 0;
      const nouveauStock = stockActuel + qty;

      // Insert movement
      const { error: moveErr } = await supabase.from('mouvementstock').insert({
        idcommerce: userData.idcommerce,
        idarticle: selectedProduct,
        quantiteactuelle: stockActuel,
        quantiteajouter: qty,
        stocktotal: nouveauStock,
        date: new Date().toISOString(),
      });
      if (moveErr) throw moveErr;

      // Update product stock
      const { error: updateErr } = await supabase
        .from('product_items')
        .update({ stock: nouveauStock })
        .eq('id', selectedProduct);
      if (updateErr) throw updateErr;

      setMsg({ type: 'success', text: 'Mouvement de stock enregistré !' });
      setQuantity('');
      setSelectedProduct(null);
      fetchData();
      setTimeout(() => { setShowModal(false); setMsg(null); }, 1000);
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Sub nav */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => navigate('/dashboard/products')} className="px-4 py-2.5 bg-background-50 border border-background-200/70 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-100 transition-colors cursor-pointer">
          <i className="ri-arrow-left-line mr-1"></i> Produits
        </button>
        <div className="h-6 w-px bg-background-200/70 hidden sm:block"></div>
        <span className="text-sm font-bold text-foreground-950">Gestion de stock</span>
        <button
          onClick={() => { setShowModal(true); setMsg(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent-600 transition-colors cursor-pointer ml-auto"
        >
          <i className="ri-add-line"></i>
          Nouveau mouvement
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Gestion de stock</h2>
        <p className="text-sm text-foreground-500 mt-1">Suivez les mouvements de stock de vos produits</p>
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
              <i className="ri-shopping-bag-3-line text-accent-600 text-lg"></i>
            </div>
            <div>
              <p className="text-xs text-foreground-500">Total produits</p>
              <p className="text-xl font-bold text-foreground-950">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <i className="ri-archive-line text-primary-600 text-lg"></i>
            </div>
            <div>
              <p className="text-xs text-foreground-500">Stock total</p>
              <p className="text-xl font-bold text-foreground-950">{products.reduce((sum, p) => sum + (p.stock || 0), 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <i className="ri-alert-line text-red-500 text-lg"></i>
            </div>
            <div>
              <p className="text-xs text-foreground-500">Stock faible (&lt; 10)</p>
              <p className="text-xl font-bold text-red-500">{products.filter((p) => (p.stock || 0) < 10).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
          <p className="text-foreground-600 mb-3">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : movements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-swap-line text-2xl text-foreground-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground-800 mb-1">Aucun mouvement de stock</h3>
          <p className="text-sm text-foreground-500 mb-4">Enregistrez votre premier mouvement de stock</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-accent-600 transition-colors"
          >
            <i className="ri-add-line"></i>
            Nouveau mouvement
          </button>
        </div>
      ) : (
        <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-background-200/70 bg-background-100 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
            <div className="col-span-3">Produit</div>
            <div className="col-span-2">Stock avant</div>
            <div className="col-span-2">Qté ajoutée</div>
            <div className="col-span-2">Nouveau stock</div>
            <div className="col-span-3">Date</div>
          </div>

          <div className="divide-y divide-background-200/70">
            {movements.map((m) => (
              <div key={m.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-3.5 items-center hover:bg-background-50/50 transition-colors">
                <div className="md:col-span-3">
                  <span className="text-sm font-semibold text-foreground-900">{m.product_name}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-sm text-foreground-600">{m.quantiteactuelle}</span>
                </div>
                <div className="md:col-span-2">
                  <span className={`text-sm font-medium ${m.quantiteajouter >= 0 ? 'text-accent-600' : 'text-red-500'}`}>
                    {m.quantiteajouter > 0 ? '+' : ''}{m.quantiteajouter}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-sm font-semibold text-foreground-900">{m.stocktotal}</span>
                </div>
                <div className="md:col-span-3">
                  <span className="text-xs text-foreground-500">{new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {movements.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-foreground-500">
          <span>{movements.length} mouvement{movements.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Add Movement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setShowModal(false); setMsg(null); }}></div>
          <div className="relative bg-background-50 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold font-heading text-foreground-950">Nouveau mouvement de stock</h3>
              <button onClick={() => { setShowModal(false); setMsg(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100 text-foreground-500 hover:text-foreground-800 transition-colors cursor-pointer">
                <i className="ri-close-line"></i>
              </button>
            </div>

            {msg && (
              <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium ${msg.type === 'success' ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-600'}`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleAddMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground-700 mb-1">Produit *</label>
                <select
                  value={selectedProduct || ''}
                  onChange={(e) => setSelectedProduct(parseInt(e.target.value, 10))}
                  required
                  className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors cursor-pointer"
                >
                  <option value="">Sélectionner un produit</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (stock: {p.stock || 0})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground-700 mb-1">Quantité à ajouter/retirer *</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  placeholder="Ex: 10 ou -5"
                  className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
                />
                <p className="text-xs text-foreground-400 mt-1">Utilisez des valeurs négatives pour retirer du stock</p>
              </div>

              {selectedProduct && quantity && (
                <div className="px-4 py-3 bg-background-100 rounded-lg">
                  <p className="text-xs text-foreground-500 mb-1">Résultat :</p>
                  <p className="text-sm text-foreground-900">
                    Stock actuel : <strong>{products.find((p) => p.id === selectedProduct)?.stock || 0}</strong>
                    {' → '}
                    <strong>{(products.find((p) => p.id === selectedProduct)?.stock || 0) + (parseInt(quantity, 10) || 0)}</strong>
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving || !selectedProduct || !quantity} className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
                  {saving ? <><i className="ri-loader-4-line animate-spin"></i> Enregistrement...</> : <><i className="ri-check-line"></i> Enregistrer</>}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-background-100 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 transition-colors cursor-pointer">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}