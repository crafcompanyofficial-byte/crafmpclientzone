import React, { useEffect } from 'react';
import { MemoryRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { Toaster } from 'sonner';
import { isTelegramMiniApp } from '../shared/lib/telegramUser';
import { TelegramProvider } from '../shared/TelegramProvider';
import { AuthProvider } from '../shared/components/AuthProvider';
import { Onboarding } from '../pages/onboarding';
import { Home } from '../pages/home';
import { Catalog } from '../pages/catalog';
import { ProductDetails } from '../pages/product-details';
import { Cart } from '../pages/cart';
import { Profile } from './screens/Profile';
import { MapSelection } from '../pages/map-selection';
import { PointsHistory } from '../pages/points-history';
import { MainLayout } from './AuthGuard';

/** Must render under `MemoryRouter` / `BrowserRouter` — uses `useLocation` / `useNavigate`. */
function TelegramWebAppEffects() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTelegramMiniApp()) return;

    let onBack: (() => void) | undefined;
    try {
      const bb = WebApp.BackButton;
      if (!bb) return;
      onBack = () => navigate(-1);

      if (typeof bb.onClick === 'function' && onBack) {
        bb.onClick(onBack);
      }
    } catch (error) {
      console.error('TWA BackButton onClick:', error);
    }

    return () => {
      if (!onBack) return;
      try {
        const bb = WebApp.BackButton;
        if (bb && typeof bb.offClick === 'function') {
          bb.offClick(onBack);
        }
      } catch {
        /* ignore */
      }
    };
  }, [navigate]);

  useEffect(() => {
    if (!isTelegramMiniApp()) return;

    try {
      const bb = WebApp.BackButton;
      if (!bb) return;

      const isHome = location.pathname === '/';
      if (isHome && typeof bb.hide === 'function') bb.hide();
      else if (!isHome && typeof bb.show === 'function') bb.show();
    } catch (error) {
      console.error('TWA BackButton visibility:', error);
    }
  }, [location.pathname]);

  return null;
}

function RoutedAppShell() {
  return (
    <>
      <TelegramWebAppEffects />
      <AuthProvider>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />

          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/map-selection" element={<MapSelection />} />
            <Route path="/points-history" element={<PointsHistory />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </>
  );
}

export default function App() {
  return (
    <TelegramProvider>
      <MemoryRouter>
        <RoutedAppShell />
      </MemoryRouter>
      <Toaster position="top-center" richColors closeButton />
    </TelegramProvider>
  );
}
