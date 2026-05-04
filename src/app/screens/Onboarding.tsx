import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { DS_TACTILE } from '../../shared/ui/designTokens';

const ONBOARDING_BG =
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80';

/** Unused in router; retained for backward compatibility — use `/onboarding`. */
export function Onboarding() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ONBOARDING_BG})` }} />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/65"
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 animate-fade-in-up flex-col px-6">
        <div className="flex flex-col items-center pt-10 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/95 shadow-craf">
            <MapPin className="h-10 w-10 text-[#E54B4B]" strokeWidth={2} />
          </div>
          <h1 className="mb-3 text-2xl font-bold text-white drop-shadow-sm">CRAF ga xush kelibsiz</h1>
          <p className="max-w-sm text-base leading-relaxed text-white/90 drop-shadow-sm">
            Hududingizdagi dolzarb katalog va narxlarni ko'rish uchun O'zbekiston xaritasidan diler tanlang.
          </p>
        </div>

        <div className="min-h-6 flex-1" />

        <div className="pb-8 pt-4">
          <button
            type="button"
            onClick={() => navigate('/map-selection?mode=onboarding')}
            className={`${DS_TACTILE} shadow-craf w-full rounded-full bg-[#E54B4B] py-4 text-lg font-bold text-white`}
          >
            Keyingi
          </button>
          <p className="mt-3 text-center text-xs text-white/80">
            Xarita Toshkent markazida ochiladi — shaharni qidiruv orqali topishingiz mumkin.
          </p>
        </div>
      </div>
    </div>
  );
}
