import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OrderStatus = 'Jarayonda' | 'Tasdiqlangan';

export interface OrderHistoryItem {
  id: string;
  date: string;
  displayDate: string;
  status: OrderStatus;
  total: number;
  items: number;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function ruDisplay(iso: string): string {
  const [y, m, day] = iso.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function buildSeedOrders(): OrderHistoryItem[] {
  const d0 = isoDaysAgo(0);
  const d3 = isoDaysAgo(3);
  const d10 = isoDaysAgo(10);
  const d25 = isoDaysAgo(25);
  const d200 = isoDaysAgo(200);
  const d400 = isoDaysAgo(400);
  return [
    { id: '#ORD-2401', date: d0, displayDate: ruDisplay(d0), status: 'Jarayonda', total: 45200, items: 8 },
    { id: '#ORD-2398', date: d3, displayDate: ruDisplay(d3), status: 'Tasdiqlangan', total: 28900, items: 3 },
    { id: '#ORD-2391', date: d10, displayDate: ruDisplay(d10), status: 'Jarayonda', total: 67500, items: 12 },
    { id: '#ORD-2385', date: d25, displayDate: ruDisplay(d25), status: 'Tasdiqlangan', total: 32100, items: 5 },
    { id: '#ORD-2300', date: d200, displayDate: ruDisplay(d200), status: 'Tasdiqlangan', total: 12000, items: 2 },
    { id: '#ORD-2100', date: d400, displayDate: ruDisplay(d400), status: 'Tasdiqlangan', total: 8800, items: 1 },
  ];
}

interface HistoryState {
  orders: OrderHistoryItem[];
  appendOrder: (order: OrderHistoryItem) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      orders: buildSeedOrders(),
      appendOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
    }),
    { name: 'craf-order-history-v2' }
  )
);

export function formatOrderDisplayDate(iso: string): string {
  return ruDisplay(iso);
}
