import { Link } from 'react-router-dom';
import type { CustomerLevel } from '../shared/store/useUserStore';
import { useUserStore } from '../shared/store/useUserStore';
import { DS_TACTILE } from '../shared/ui/designTokens';

const SHELL_CLASS =
  'aspect-[388/120] rounded-[25px] p-[20px] mb-[23px] relative overflow-hidden flex flex-col justify-between shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)]';

const GRADIENT_OVERLAY_CLASS = 'absolute inset-0 bg-gradient-to-r from-black/50 to-black/10 z-0 rounded-[inherit]';

function levelConfig(level: CustomerLevel): {
  bgImage: string;
  target: number;
  next: string;
  levelName: string;
} {
  switch (level) {
    case 'silver':
      return { bgImage: '/silver-bg.png', target: 1500, next: 'Gold', levelName: 'Silver' };
    case 'gold':
      return { bgImage: '/gold-bg.png', target: 4000, next: 'Platinum', levelName: 'Gold' };
    default:
      return { bgImage: '/bronze-bg.png', target: 500, next: 'Silver', levelName: 'Bronze' };
  }
}

function progressPct(points: number, target: number): number {
  const p = Math.max(0, points);
  return target > 0 ? Math.min(100, (p / target) * 100) : 100;
}

export type LoyaltyCardProps = {
  clickable: boolean;
};

export function LoyaltyCard({ clickable }: LoyaltyCardProps) {
  const user = useUserStore((s) => s.user);
  const tier: CustomerLevel =
    user?.level === 'silver' || user?.level === 'gold' || user?.level === 'bronze' ? user.level : 'bronze';
  const pts = Number.isFinite(user?.points) ? user!.points : 0;
  const { bgImage, target, next, levelName } = levelConfig(tier);
  const pct = progressPct(pts, target);
  const caption = `${Math.min(pts, target)} / ${target} pts`;

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
          <p className="font-['Onest'] text-[11px] font-medium leading-snug text-white/90">
            Progress to {next} · {caption}
          </p>
          <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-black/20">
            <div
              className="h-full rounded-full bg-white/80 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
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
      <Link
        to="/points-history"
        className={`${DS_TACTILE} ${SHELL_CLASS} block min-w-0 w-full shrink-0`}
        style={bgStyle}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={`${SHELL_CLASS} min-w-0 w-full shrink-0`} style={bgStyle}>
      {content}
    </div>
  );
}
