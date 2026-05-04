import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { toast } from 'sonner';
import { LoyaltyCard } from '../../components/LoyaltyCard';
import { getSupabase, isSupabaseConfigured } from '../../shared/api/supabase';
import { useUserStore, normalizeCustomerRow } from '../../shared/store/useUserStore';
import {
  DS_BTN_PRIMARY_ROW,
  DS_FONT_ONEST,
  DS_INPUT,
  DS_TACTILE,
  DS_TEXT_MAIN,
  DS_TEXT_SECONDARY,
} from '../../shared/ui/designTokens';

const CARD_SHELL = `${DS_FONT_ONEST} rounded-[25px] bg-white p-[20px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)]`;

export function Profile() {
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const clientRecordId = user?.id ?? null;
  const clientName = user?.name ?? null;
  const clientPhone = user?.phone ?? null;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(clientName?.trim() ?? '');
    setPhone(clientPhone?.trim() ?? '');
  }, [clientName, clientPhone]);

  useEffect(() => {
    if (!clientRecordId || !isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('customers').select('*').eq('id', clientRecordId).single();
      if (cancelled || !data || typeof data !== 'object') return;
      setUser(normalizeCustomerRow(data as Record<string, unknown>));
    })();
    return () => {
      cancelled = true;
    };
  }, [clientRecordId, setUser]);

  const handleSave = useCallback(async () => {
    if (!clientRecordId || !user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const updatedName = name.trim();
    const updatedPhone = phone.trim();

    setSaving(true);
    const { error } = await supabase
      .from('customers')
      .update({ name: updatedName, phone: updatedPhone })
      .eq('id', clientRecordId);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    useUserStore.getState().setUser({
      ...user,
      name: updatedName,
      phone: updatedPhone,
    });
    toast.success("Muvaffaqiyatli saqlandi!");
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
  }, [clientRecordId, name, phone, user]);

  return (
    <div className={`flex min-h-full flex-1 flex-col pb-8 pt-[var(--app-header-offset)] ${DS_FONT_ONEST}`}>
      <div className="mx-auto mt-4 w-full space-y-[23px] px-[16px] pb-6">
        <div className={CARD_SHELL}>
          <h3 className={`${DS_TEXT_MAIN} mb-4`}>Shaxsiy ma&apos;lumotlar</h3>

          <div className="flex flex-col gap-[16px]">
            <div>
              <label htmlFor="profile-name" className={`mb-2 block ${DS_TEXT_SECONDARY}`}>
                Ism
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={DS_INPUT}
                placeholder="Ism"
              />
            </div>

            <div>
              <label htmlFor="profile-phone" className={`mb-2 block ${DS_TEXT_SECONDARY}`}>
                Telefon
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={DS_INPUT}
                placeholder="+998 ..."
              />
            </div>
          </div>

          <div className={`mt-[20px] flex items-stretch gap-[12px]`}>
            <Link
              to="/map-selection"
              className={`${DS_TACTILE} flex min-h-[39px] w-[50px] shrink-0 items-center justify-center rounded-[13px] bg-[#F2F2F2]`}
              aria-label="Joylashuvni o'zgartirish"
            >
              <MapPin className="h-5 w-5 text-[#565656]" strokeWidth={2} aria-hidden />
            </Link>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className={`min-w-0 flex-1 ${DS_BTN_PRIMARY_ROW} disabled:opacity-60 disabled:active:scale-100`}
            >
              {saving ? 'Saqlanmoqda…' : 'Saqlash'}
            </button>
          </div>
        </div>

        <LoyaltyCard clickable />

        <div className={`rounded-[20px] bg-white p-[16px] shadow-sm ${DS_FONT_ONEST}`}>
          <h3 className="mb-4 font-['Onest'] text-[16px] font-bold text-[#1A1A1A]">Qo&apos;llab-quvvatlash xizmati</h3>
          <div className="flex flex-col gap-3">
            <a
              href="tel:+998953944047"
              className={`${DS_TACTILE} flex items-center gap-3 rounded-[14px] bg-[#F9F9F9] p-3 no-underline`}
            >
              <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <Phone className="h-[18px] w-[18px] text-[#E54B4B]" strokeWidth={2} aria-hidden />
              </div>
              <span className="font-['Onest'] text-[14px] font-medium text-[#1A1A1A]">+998 95 394 40 47</span>
            </a>

            <a
              href="https://t.me/crafcom_manager"
              target="_blank"
              rel="noopener noreferrer"
              className={`${DS_TACTILE} flex items-center gap-3 rounded-[14px] bg-[#F9F9F9] p-3 no-underline`}
            >
              <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <Send className="h-[18px] w-[18px] text-[#E54B4B]" strokeWidth={2} aria-hidden />
              </div>
              <span className="font-['Onest'] text-[14px] font-medium text-[#1A1A1A]">@crafcom_manager</span>
            </a>

            <a
              href="mailto:crafcomapnyofficial@gmail.com"
              className={`${DS_TACTILE} flex min-w-0 items-center gap-3 rounded-[14px] bg-[#F9F9F9] p-3 no-underline`}
            >
              <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <Mail className="h-[18px] w-[18px] text-[#E54B4B]" strokeWidth={2} aria-hidden />
              </div>
              <span className="min-w-0 truncate font-['Onest'] text-[14px] font-medium text-[#1A1A1A]">
                crafcomapnyofficial@gmail.com
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
