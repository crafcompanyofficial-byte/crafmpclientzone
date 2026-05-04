import { Loader2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSupabase } from '../api/supabase';
import { useUserStore, normalizeCustomerRow } from '../store/useUserStore';

const TELEGRAM_OPEN_ERROR = 'Iltimos, ilovani Telegram orqali oching';
const ONBOARDING_ROUTE = '/onboarding';

function isNoRowsError(err: { code?: string } | null): boolean {
  return err?.code === 'PGRST116';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const clearUser = useUserStore((s) => s.clearUser);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const checkAuth = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const tgId =
        window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? (import.meta.env.DEV ? 777777777 : null);

      if (tgId === null || tgId === undefined) {
        if (!isCancelled) {
          clearUser();
          setErrorMessage(TELEGRAM_OPEN_ERROR);
          setIsLoading(false);
        }
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        if (!isCancelled) {
          clearUser();
          setErrorMessage('Supabase konfiguratsiyasi topilmadi');
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase.from('customers').select('*').eq('telegram_id', tgId).single();

      if (isCancelled) return;

      if (error) {
        if (isNoRowsError(error)) {
          clearUser();
          setIsLoading(false);
          return;
        }

        clearUser();
        setErrorMessage(error.message ?? 'Autentifikatsiya xatosi');
        setIsLoading(false);
        return;
      }

      if (!data || typeof data !== 'object') {
        clearUser();
        setErrorMessage('Mijoz maʼlumoti yuklanmadi');
        setIsLoading(false);
        return;
      }

      const customer = normalizeCustomerRow(data as Record<string, unknown>);

      if (customer.is_blocked) {
        clearUser();
        setErrorMessage('Hisobingiz bloklangan.');
        setIsLoading(false);
        return;
      }

      if (!customer.id) {
        clearUser();
        setErrorMessage('Noto‘g‘ri mijoz yozuvi');
        setIsLoading(false);
        return;
      }

      setUser(customer);
      setIsLoading(false);
    };

    void checkAuth();

    return () => {
      isCancelled = true;
    };
  }, [clearUser, setUser]);

  useEffect(() => {
    if (isLoading || errorMessage) return;

    const isOnboardingRoute = location.pathname === ONBOARDING_ROUTE;

    if (!user && !isOnboardingRoute) {
      navigate(ONBOARDING_ROUTE, { replace: true });
      return;
    }

    if (user && isOnboardingRoute) {
      navigate('/', { replace: true });
    }
  }, [errorMessage, isLoading, location.pathname, navigate, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]">
        <Loader2 className="h-9 w-9 animate-spin text-[#E54B4B]" aria-hidden />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] p-6 text-center">
        <p className="max-w-sm text-base font-medium text-[#111827]">{errorMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
