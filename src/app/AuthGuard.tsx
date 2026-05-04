import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUserStore } from '../shared/store/useUserStore';
import { AppHeader } from '../components/AppHeader';

export function useAuthHydration(): boolean {
  const [hydrated, setHydrated] = useState(() => useUserStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useUserStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  return hydrated;
}

export function HydrationGate() {
  const hydrated = useAuthHydration();
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]">
        <Loader2 className="h-9 w-9 animate-spin text-[#E54B4B]" aria-hidden />
      </div>
    );
  }
  return <Outlet />;
}

export function RequireClient() {
  const userId = useUserStore((s) => s.user?.id);
  if (!userId) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}

export function OnboardingGate() {
  const userId = useUserStore((s) => s.user?.id);
  if (userId) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

/** Fixed flat header + main content. Only for authenticated app routes (not onboarding / map). */
export function MainLayout() {
  const { pathname } = useLocation();
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[700px] flex-col overflow-x-hidden bg-[#F5F5F5]">
      <AppHeader />
      <main key={pathname} className="flex min-h-0 w-full flex-1 flex-col animate-fade-in-up">
        <Outlet />
      </main>
    </div>
  );
}
