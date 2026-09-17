import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useTenant } from '@/hooks/useTenant';

export interface CartProduct {
  id: number;
  name: string;
  price: number;
  original_price: number | null;
  media: string;
  stock: number;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  count: number;
  subtotal: number;
  currency: string;
  addToCart: (product: CartProduct) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, delta: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'zifek_cart';

/**
 * Panier de la boutique publique. Le panier est stocké côté navigateur
 * (localStorage) pour permettre un achat sans compte ; la commande finale est
 * ensuite persistée en base dans la table `commande`.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { tenant } = useTenant();
  const currency = tenant?.monaie || 'MAD';
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Chargement du panier au montage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed as CartItem[]);
      }
    } catch {
      /* panier corrompu : on repart de zéro */
    }
    setHydrated(true);
  }, []);

  // Persistance à chaque modification
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* stockage indisponible : on ignore */
    }
  }, [items, hydrated]);

  const addToCart = useCallback((product: CartProduct) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.product.id !== id));
  }, []);

  const updateQuantity = useCallback((id: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.product.id !== id) return i;
          const qty = i.quantity + delta;
          if (qty <= 0) return null;
          if (qty > i.product.stock) return i;
          return { ...i, quantity: qty };
        })
        .filter((i): i is CartItem => i !== null)
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        subtotal,
        currency,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}