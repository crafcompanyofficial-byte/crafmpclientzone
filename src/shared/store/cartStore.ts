import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  variantId: string;
  groupId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  color: string;
  type: string;
  image: string | null;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  totalQuantity: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === newItem.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === newItem.variantId ? { ...i, quantity: i.quantity + newItem.quantity } : i
              ),
            };
          }
          return { items: [...state.items, newItem] };
        }),

      setQuantity: (variantId, quantity) =>
        set((state) => {
          if (quantity < 1) {
            return { items: state.items.filter((i) => i.variantId !== variantId) };
          }
          return {
            items: state.items.map((i) =>
              i.variantId === variantId ? { ...i, quantity } : i
            ),
          };
        }),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      clearCart: () => set({ items: [] }),

      totalQuantity: () => get().items.reduce((s, i) => s + i.quantity, 0),

      subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    { name: 'craf-cart-variant-lines-v1' }
  )
);
