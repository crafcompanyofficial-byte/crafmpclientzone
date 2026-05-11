import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabase } from '../api/supabase';

/** Matches the `customers` table (strict client profile). */
export type CustomerLevel = 'bronze' | 'silver' | 'gold';

/** In-memory draft for multi-step onboarding (not persisted). */
export type OnboardingDraft = {
  name: string;
  phone: string;
  region?: string;
  city?: string;
};

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
  onboardingDraft: OnboardingDraft | null;
  setUser: (user: Customer | null) => void;
  clearUser: () => void;
  setOnboardingDraft: (draft: OnboardingDraft | null) => void;
  updateOnboardingDraft: (partial: Partial<Pick<OnboardingDraft, 'region' | 'city'>>) => void;
  clearOnboardingDraft: () => void;
  registerCustomer: (input: {
    telegram_id: number;
    name: string;
    phone: string;
    region: string;
    city: string;
  }) => Promise<{ ok: true; customer: Customer } | { ok: false; message: string }>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      onboardingDraft: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      setOnboardingDraft: (draft) => set({ onboardingDraft: draft }),
      updateOnboardingDraft: (partial) =>
        set((state) => {
          if (!state.onboardingDraft) return state;
          return { onboardingDraft: { ...state.onboardingDraft, ...partial } };
        }),
      clearOnboardingDraft: () => set({ onboardingDraft: null }),
      registerCustomer: async (input) => {
        const supabase = getSupabase();
        if (!supabase) {
          return { ok: false, message: 'Supabase konfiguratsiyasi topilmadi' };
        }

        try {
          const { data, error } = await supabase
            .from('customers')
            .insert({
              telegram_id: input.telegram_id,
              name: input.name,
              phone: input.phone,
              region: input.region,
              city: input.city,
              points: 0,
              level: 'bronze',
              is_blocked: false,
            })
            .select()
            .single();

          if (error) {
            console.error('[registerCustomer] Supabase insert error (full object):', error);
            return {
              ok: false,
              message: error.message?.trim()
                ? `Maʼlumotlarni saqlashda xatolik: ${error.message}`
                : 'Maʼlumotlarni saqlashda xatolik (tafsilotlar konsolda)',
            };
          }

          if (!data || typeof data !== 'object') {
            console.error('[registerCustomer] Supabase insert returned no row:', { data });
            return {
              ok: false,
              message: 'Mijoz yaratildi, ammo javob kelmay qoldi (konsolni tekshiring)',
            };
          }

          const customer = normalizeCustomerRow(data as Record<string, unknown>);
          if (!customer.id) {
            console.error('[registerCustomer] Insert row missing id:', data);
            return { ok: false, message: 'Mijoz ID qaytarilmadi' };
          }

          set({ user: customer, onboardingDraft: null });
          return { ok: true, customer };
        } catch (err) {
          console.error('[registerCustomer] Unexpected error:', err);
          return { ok: false, message: 'Kutilmagan xatolik (tafsilotlar konsolda)' };
        }
      },
    }),
    {
      name: 'craf-client-user-v5-customers',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
