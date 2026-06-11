import { create } from 'zustand';

export interface CartItem {
  id: string; // unique item id inside cart
  productId: string;
  name: string;
  brand: string;
  image: string;
  price: number; // sale_price or rental_price_per_day
  type: 'BUY' | 'RENT';
  quantity: number;
  availableStock: number;
  rentalDays?: number; // only if type is RENT
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (newItem) => {
    const { items } = get();
    // Check if matching product with same checkout mode and rental length is already in cart
    const existingIndex = items.findIndex(
      (i) => i.productId === newItem.productId && i.type === newItem.type && i.rentalDays === newItem.rentalDays
    );

    if (existingIndex > -1) {
      const updated = [...items];
      const nextQty = updated[existingIndex].quantity + newItem.quantity;
      // Cap at available stock
      updated[existingIndex].quantity = Math.min(nextQty, newItem.availableStock);
      set({ items: updated });
    } else {
      const id = `${newItem.productId}-${newItem.type}-${newItem.rentalDays || 0}`;
      set({ items: [...items, { ...newItem, id }] });
    }
  },
  removeItem: (id) => {
    set({ items: get().items.filter((item) => item.id !== id) });
  },
  updateQuantity: (id, qty) => {
    const updated = get().items.map((item) => {
      if (item.id === id) {
        // Cap quantity inside stock limits
        const targetQty = Math.max(1, Math.min(qty, item.availableStock));
        return { ...item, quantity: targetQty };
      }
      return item;
    });
    set({ items: updated });
  },
  clearCart: () => set({ items: [] }),
  getTotal: () => {
    return get().items.reduce((total, item) => {
      const multiplier = item.type === 'RENT' ? (item.rentalDays || 1) : 1;
      return total + item.price * item.quantity * multiplier;
    }, 0);
  }
}));
