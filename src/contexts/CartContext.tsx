import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

export interface CartItem {
  product_id: string;
  name: string;
  sku: string;
  brand: string | null;
  image_url: string | null;
  estimated_price: number | null;
  quantity: number;
  specification: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity' | 'specification'>, quantity?: number) => void;
  removeFromCart: (product_id: string) => void;
  updateQuantity: (product_id: string, quantity: number) => void;
  updateSpecification: (product_id: string, specification: string) => void;
  clearCart: () => void;
  cartCount: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  updateSpecification: () => {},
  clearCart: () => {},
  cartCount: 0,
});

export const useCart = () => useContext(CartContext);

const CART_KEY = 'mart-plnsc-cart';

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (item: Omit<CartItem, 'quantity' | 'specification'>, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === item.product_id);
      if (existing) {
        toast.success(`${item.name} quantity updated in cart`);
        return prev.map(i =>
          i.product_id === item.product_id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      toast.success(`${item.name} added to cart`);
      return [...prev, { ...item, quantity, specification: '' }];
    });
  };

  const removeFromCart = (product_id: string) => {
    setItems(prev => prev.filter(i => i.product_id !== product_id));
  };

  const updateQuantity = (product_id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(prev => prev.map(i => i.product_id === product_id ? { ...i, quantity } : i));
  };

  const updateSpecification = (product_id: string, specification: string) => {
    setItems(prev => prev.map(i => i.product_id === product_id ? { ...i, specification } : i));
  };

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, updateSpecification, clearCart, cartCount: items.reduce((sum, i) => sum + i.quantity, 0) }}>
      {children}
    </CartContext.Provider>
  );
};
