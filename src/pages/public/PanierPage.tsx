import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';

export default function PanierPublic() {
  const navigate = useNavigate();
  const { items, count, subtotal, currency, removeFromCart, updateQuantity } = useCart();

  return (
    <div className="min-h-screen bg-background-50">
      <section className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background-100/50 to-transparent"></div>
        <div className="relative w-full px-4 md:px-6 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold font-heading text-foreground-950 mb-2">
            Mon panier
          </h1>
          <p className="text-sm text-foreground-500">
            {count > 0 ? `${count} article${count > 1 ? 's' : ''} dans votre panier` : 'Votre panier est vide'}
          </p>
        </div>
      </section>

      <section className="pb-12 md:pb-16">
        <div className="w-full px-4 md:px-6 max-w-4xl mx-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-background-50 border border-background-200/70 rounded-lg">
              <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
                <i className="ri-shopping-cart-line text-2xl text-foreground-400"></i>
              </div>
              <p className="text-foreground-600 font-medium mb-1">Votre panier est vide</p>
              <p className="text-sm text-foreground-500 mb-6">Parcourez nos produits pour trouver votre bonheur</p>
              <Link
                to="/products"
                className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium no-underline hover:bg-primary-600 transition-colors whitespace-nowrap"
              >
                Voir les produits
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
                <div className="divide-y divide-background-200/70">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-4 p-4">
                      <div className="w-16 h-16 rounded-md bg-background-100 overflow-hidden flex-shrink-0">
                        {item.product.media ? (
                          <img
                            src={item.product.media}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <i className="ri-shopping-bag-line text-xl text-foreground-300"></i>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground-900 truncate">
                          {item.product.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-bold text-primary-600 whitespace-nowrap">
                            {item.product.price.toLocaleString()} {currency}
                          </span>
                          {item.product.original_price != null && (
                            <span className="text-xs text-foreground-400 line-through whitespace-nowrap">
                              {item.product.original_price.toLocaleString()} {currency}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-7 h-7 rounded-full bg-background-100 border border-background-200/70 flex items-center justify-center text-foreground-500 hover:bg-background-200/70 hover:text-foreground-800 transition-colors cursor-pointer"
                          aria-label="Diminuer la quantité"
                        >
                          <i className="ri-subtract-line text-xs"></i>
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-foreground-900 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          disabled={item.quantity >= item.product.stock}
                          className="w-7 h-7 rounded-full bg-background-100 border border-background-200/70 flex items-center justify-center text-foreground-500 hover:bg-background-200/70 hover:text-foreground-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          aria-label="Augmenter la quantité"
                        >
                          <i className="ri-add-line text-xs"></i>
                        </button>
                      </div>

                      <span className="text-sm font-bold text-foreground-800 w-20 text-right tabular-nums flex-shrink-0 whitespace-nowrap">
                        {(item.product.price * item.quantity).toLocaleString()} {currency}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
                        aria-label="Retirer du panier"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-foreground-500">Sous-total</span>
                  <span className="text-base font-semibold text-foreground-900 tabular-nums">
                    {subtotal.toLocaleString()} {currency}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  className="w-full py-3 bg-primary-500 text-background-50 rounded-full text-sm font-bold hover:bg-primary-600 transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-arrow-right-line"></i>
                  Passer commande
                </button>
                <p className="text-xs text-foreground-400 text-center mt-3">
                  Paiement à la livraison ou à convenir — nous vous contacterons
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}