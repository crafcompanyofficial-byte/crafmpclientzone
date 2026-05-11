/**
 * Telegram `BackButton` is controlled globally in `App.tsx` (`TelegramWebAppEffects`).
 * Uses `@twa-dev/sdk` (`WebApp.BackButton`): show/hide by route, `navigate(-1)` on tap.
 *
 * Hide any custom HTML back controls when needed via `isTelegramMiniApp()` from `telegramUser.ts`.
 * This hook stays a no-op to avoid duplicate handlers.
 */
export function useTelegramBackButton(_visible: boolean, _onBack: () => void) {
  return;
}
