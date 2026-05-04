import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../shared/api/supabase';
import { useUserStore, normalizeCustomerRow } from '../shared/store/useUserStore';
import {
  DS_BTN_PRIMARY,
  DS_FONT_ONEST,
  DS_INPUT,
  DS_TEXT_MAIN,
  DS_TEXT_SECONDARY,
} from '../shared/ui/designTokens';

export function Onboarding() {
  const navigate = useNavigate();
  const setUser = useUserStore((s) => s.setUser);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedRegion = region.trim();
    const trimmedCity = city.trim();

    if (!trimmedName || !trimmedPhone || !trimmedRegion || !trimmedCity) {
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

    const supabase = getSupabase();
    if (!supabase) {
      setErrorMessage('Supabase konfiguratsiyasi topilmadi');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          telegram_id,
          name: trimmedName,
          phone: trimmedPhone,
          region: trimmedRegion,
          city: trimmedCity,
          points: 0,
          level: 'bronze',
          is_blocked: false,
        })
        .select()
        .single();

      if (error) {
        console.error('[Onboarding] Supabase insert error (full object):', error);
        setErrorMessage(
          error.message?.trim()
            ? `Maʼlumotlarni saqlashda xatolik: ${error.message}`
            : 'Maʼlumotlarni saqlashda xatolik (tafsilotlar konsolda)'
        );
        return;
      }

      if (!data || typeof data !== 'object') {
        console.error('[Onboarding] Supabase insert returned no row:', { data });
        setErrorMessage('Mijoz yaratildi, ammo javob kelmay qoldi (konsolni tekshiring)');
        return;
      }

      const customer = normalizeCustomerRow(data as Record<string, unknown>);
      if (!customer.id) {
        console.error('[Onboarding] Insert row missing id:', data);
        setErrorMessage('Mijoz ID qaytarilmadi');
        return;
      }

      setUser(customer);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('[Onboarding] Unexpected error:', err);
      setErrorMessage('Kutilmagan xatolik (tafsilotlar konsolda)');
    } finally {
      setSubmitting(false);
    }
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

          <div>
            <label htmlFor="region" className={`mb-2 block ${DS_TEXT_SECONDARY}`}>
              Viloyat
            </label>
            <input
              id="region"
              type="text"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className={DS_INPUT}
              placeholder="Masalan: Toshkent viloyati"
              autoComplete="address-level1"
            />
          </div>

          <div>
            <label htmlFor="city" className={`mb-2 block ${DS_TEXT_SECONDARY}`}>
              Shahar
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={DS_INPUT}
              placeholder="Masalan: Chirchiq"
              autoComplete="address-level2"
            />
          </div>

          {errorMessage ? (
            <p className={`text-[14px] font-medium text-[#DC2626] ${DS_FONT_ONEST}`}>{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className={`${DS_BTN_PRIMARY} disabled:opacity-70 disabled:active:scale-100 disabled:cursor-not-allowed`}
          >
            {submitting ? 'Yuborilmoqda...' : 'Boshlash'}
          </button>
        </form>
      </div>
    </div>
  );
}
