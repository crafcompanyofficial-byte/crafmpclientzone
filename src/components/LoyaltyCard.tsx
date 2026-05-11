import { formatLoyaltyPoints } from '../shared/lib/formatLoyaltyPoints';
import type { CustomerLevel } from '../shared/store/useUserStore';
import { useUserStore } from '../shared/store/useUserStore';
import { DS_TACTILE } from '../shared/ui/designTokens';

const SHELL_CLASS =
  'aspect-[388/120] rounded-[25px] p-[20px] mb-[23px] relative overflow-hidden flex flex-col justify-between shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)]';

const GRADIENT_OVERLAY_CLASS = 'absolute inset-0 bg-gradient-to-r from-black/50 to-black/10 z-0 rounded-[inherit]';

function tierPresentation(level: CustomerLevel): { bgImage: string; levelName: string } {
  switch (level) {
    case 'silver':
      return { bgImage: '/silver-bg.png', levelName: 'Kumush' };
    case 'gold':
      return { bgImage: '/gold-bg.png', levelName: 'Oltin' };
    case 'bronze':
    default:
      return { bgImage: '/bronze-bg.png', levelName: 'Bronza' };
  }
}

const BRONZE_CAP = 1500;
const SILVER_START = 1500;
const GOLD_THRESHOLD = 4000;
const SILVER_SPAN = GOLD_THRESHOLD - SILVER_START;

function loyaltyProgress(level: CustomerLevel, points: number): { barPercent: number; progressLabel: string } {
  const p = Math.max(0, Number.isFinite(points) ? points : 0);
  const fp = formatLoyaltyPoints(p);

  if (level === 'gold') {
    return { barPercent: 100, progressLabel: `Maksimal bosqich • ${fp} ball` };
  }

  if (level === 'silver') {
    const raw = ((p - SILVER_START) / SILVER_SPAN) * 100;
    const barPercent = Math.min(100, Math.max(0, raw));
    return {
      barPercent,
      progressLabel: `Oltin bosqichigacha • ${fp} / ${GOLD_THRESHOLD} ball`,
    };
  }

  const raw = (p / BRONZE_CAP) * 100;
  const barPercent = Math.min(100, Math.max(0, raw));
  return {
    barPercent,
    progressLabel: `Kumush bosqichigacha • ${fp} / ${BRONZE_CAP} ball`,
  };
}

export type LoyaltyCardProps = {
  clickable: boolean;
  /** When `clickable`, called on press (e.g. `() => navigate('/points-history')`). */
  onClick?: () => void;
};

export function LoyaltyCard({ clickable, onClick }: LoyaltyCardProps) {
  const user = useUserStore((s) => s.user);
  const tier: CustomerLevel =
    user?.level === 'silver' || user?.level === 'gold' || user?.level === 'bronze' ? user.level : 'bronze';
  const pts = Number.isFinite(user?.points) ? user!.points : 0;
  const { bgImage, levelName } = tierPresentation(tier);
  const { barPercent, progressLabel } = loyaltyProgress(tier, pts);
  const barWidthPct = Math.min(100, Math.max(0, barPercent));

  const bgStyle = {
    backgroundImage: `url(${bgImage})`,
    backgroundSize: 'cover' as const,
    backgroundPosition: 'center' as const,
  };

  const content = (
    <>
      <div className={GRADIENT_OVERLAY_CLASS} aria-hidden />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between">
        <div>
          <p className="font-['Onest'] text-[12px] font-medium text-white/90">Reytingim</p>
          <p className="font-['Onest'] text-[28px] font-bold leading-tight text-white">{levelName}</p>
        </div>
        <div className="mt-2">
          <p className="font-['Onest'] text-[11px] font-medium leading-snug text-white/90">{progressLabel}</p>
          <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-black/20">
            <div
              className="h-full max-w-full rounded-full bg-white/80 transition-[width] duration-300"
              style={{ width: `${barWidthPct}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );

  if (!user) {
    return null;
  }

  if (clickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${DS_TACTILE} ${SHELL_CLASS} block min-w-0 w-full shrink-0 cursor-pointer border-0 bg-transparent text-left`}
        style={bgStyle}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`${SHELL_CLASS} min-w-0 w-full shrink-0`} style={bgStyle}>
      {content}
    </div>
  );
}
