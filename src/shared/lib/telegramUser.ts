import WebApp from '@twa-dev/sdk';

/** Reserved for local browser testing when `initDataUnsafe.user` is missing */
export const DEV_TELEGRAM_USER_ID = 777777777;

/**
 * Telegram user id for Supabase / sync flows.
 * Prefer `window.Telegram.WebApp` (per Telegram); fall back to `@twa-dev/sdk` `WebApp`.
 * In a normal browser, both are empty — use a stable dev fallback.
 */
/** True when opened inside Telegram with signed init payload (Mini App session). */
export function isTelegramMiniApp(): boolean {
  try {
    return Boolean(WebApp.initData?.trim?.() ?? window.Telegram?.WebApp?.initData);
  } catch {
    return false;
  }
}

export function getTelegramUserId(): number {
  const id =
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id || WebApp.initDataUnsafe?.user?.id;
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  return DEV_TELEGRAM_USER_ID;
}
