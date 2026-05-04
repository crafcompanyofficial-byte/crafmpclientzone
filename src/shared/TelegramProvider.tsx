import { useEffect, type ReactNode } from 'react';
import WebApp from '@twa-dev/sdk';
import { isTelegramMiniApp } from './lib/telegramUser';

type WebAppExtras = typeof WebApp & {
  disableVerticalSwipes?: () => void;
  enableVerticalSwipes?: () => void;
  requestFullscreen?: () => void;
};

export function TelegramProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const bg = '#F5F5F5';
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;

    if (!isTelegramMiniApp()) return;

    try {
      if (typeof WebApp.ready === 'function') {
        WebApp.ready();
      }
      if (typeof WebApp.expand === 'function') {
        WebApp.expand();
      }

      const w = WebApp as WebAppExtras;
      if (typeof w.disableVerticalSwipes === 'function') {
        w.disableVerticalSwipes();
      }
      if (typeof w.requestFullscreen === 'function') {
        w.requestFullscreen();
      }

      const themed = WebApp as typeof WebApp & {
        setBackgroundColor?: (color: string) => void;
        setHeaderColor?: (color: string) => void;
        themeParams?: { bg_color?: string };
      };
      if (typeof themed.setHeaderColor === 'function') {
        themed.setHeaderColor(bg);
      }
      if (typeof themed.setBackgroundColor === 'function') {
        themed.setBackgroundColor(bg);
      }
    } catch (error) {
      console.error('TWA SDK Init Error:', error);
    }
  }, []);

  return <>{children}</>;
}
