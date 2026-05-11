import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../shared/store/useUserStore';
import {
  DS_BTN_PRIMARY,
  DS_FONT_ONEST,
  DS_INPUT,
  DS_TEXT_MAIN,
  DS_TEXT_SECONDARY,
} from '../shared/ui/designTokens';

export function Onboarding() {
  const navigate = useNavigate();
  const onboardingDraft = useUserStore((s) => s.onboardingDraft);
  const setOnboardingDraft = useUserStore((s) => s.setOnboardingDraft);

  const [name, setName] = useState(() => onboardingDraft?.name ?? '');
  const [phone, setPhone] = useState(() => onboardingDraft?.phone ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedPhone) {
      setErrorMessage('Iltimos, barcha maydonlarni to‘ldiring');
      return;
    }

    const tgIdRaw =
      window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? (import.meta.env.DEV ? 777777777 : null);

    if (tgIdRaw === null || tgIdRaw === undefined) {
      setErrorMessage('Iltimos, ilovani Telegram orqali oching');
      return;
    }

    const telegram_id = Number(tgIdRaw);
    if (!Number.isFinite(telegram_id)) {
      setErrorMessage('Telegram identifikatori noto‘g‘ri formatda');
      return;
    }

    setErrorMessage(null);
    setOnboardingDraft({ name: trimmedName, phone: trimmedPhone });
    navigate('/map-selection?mode=onboarding');
  };

  return (
    <div
      className={`flex min-h-dvh animate-fade-in-up items-center justify-center bg-[#F5F5F5] px-[16px] py-10 ${DS_FONT_ONEST}`}
    >
      <div className="w-full max-w-md rounded-[25px] bg-white p-6 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)]">
        <div className="mb-6 flex flex-col items-center">
          <img src="/craf-logo.svg" alt="CRAF" className="mb-3 h-12 w-auto" />
          <h1 className={`${DS_TEXT_MAIN} text-[20px]`}>Xush kelibsiz</h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-[16px]">
          <div>
            <label htmlFor="name" className={`mb-2 block ${DS_TEXT_SECONDARY}`}>
              Ismingiz
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={DS_INPUT}
              placeholder="Ismingizni kiriting"
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="phone" className={`mb-2 block ${DS_TEXT_SECONDARY}`}>
              Telefon raqamingiz
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={DS_INPUT}
              placeholder="+998"
              autoComplete="tel"
            />
          </div>

          {errorMessage ? (
            <p className={`text-[14px] font-medium text-[#DC2626] ${DS_FONT_ONEST}`}>{errorMessage}</p>
          ) : null}

          <button type="submit" className={DS_BTN_PRIMARY}>
            Keyingisi
          </button>
        </form>
      </div>
    </div>
  );
}
