import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Matches the `customers` table (strict client profile). */
export type CustomerLevel = 'bronze' | 'silver' | 'gold';

export interface Customer {
  id: string;
  telegram_id: number;
  name: string;
  phone: string;
  region: string;
  city: string;
  points: number;
  level: CustomerLevel;
  is_blocked: boolean;
}

export function normalizeCustomerLevel(raw: unknown): CustomerLevel {
  if (raw === 'bronze' || raw === 'silver' || raw === 'gold') return raw;
  return 'bronze';
}

/** Map a loose Supabase/API object to `Customer` (strict UI shape). */
export function normalizeCustomerRow(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id ?? ''),
    telegram_id: Number(row.telegram_id),
    name: String(row.name ?? ''),
    phone: String(row.phone ?? ''),
    region: String(row.region ?? ''),
    city: String(row.city ?? ''),
    points: Number(row.points ?? 0),
    level: normalizeCustomerLevel(row.level),
    is_blocked: Boolean(row.is_blocked),
  };
}

interface UserState {
  user: Customer | null;
  setUser: (user: Customer | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    { name: 'craf-client-user-v5-customers' }
  )
);
