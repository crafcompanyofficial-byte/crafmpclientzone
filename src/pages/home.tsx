import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../shared/store/useCartStore';
import { useUserStore, normalizeCustomerRow } from '../shared/store/useUserStore';
import { CatalogProductCard, toCatalogCardItemFromDbGroup } from '../components/CatalogProductCard';
import { fetchNewProductGroups, type GroupsWithPrices } from '../shared/api/catalogDb';
import { bannerDomKey, fetchActiveBanners, type Banner } from '../shared/api/banners';
import { getSupabase, isSupabaseConfigured } from '../shared/api/supabase';
import { DS_FONT_ONEST, DS_TACTILE, DS_TEXT_SECONDARY } from '../shared/ui/designTokens';

const CARD_SHADOW = 'shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)]';

function levelShortLabelUz(level?: string): string {
  switch ((level ?? 'silver').toLowerCase()) {
    case 'bronze':
      return 'Bronza';
    case 'gold':
      return 'Oltin';
    case 'silver':
    default:
      return 'Kumush';
  }
}

const getLevelStyles = (level?: string) => {
  const normalizedLevel = level?.toLowerCase() || 'silver';
  switch (normalizedLevel) {
    case 'bronze':
      return 'bg-[#F5E6DA] text-[#8B5A33]';
    case 'gold':
      return 'bg-[#FCF0D2] text-[#A37B00]';
    case 'silver':
    default:
      return 'bg-[#EAEAEA] text-[#666666]';
  }
};

export function Home() {
  const navigate = useNavigate();
  const totalQty = useCartStore((s) => s.totalQuantity());
  const subtotal = useCartStore((s) => s.subtotal());
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const customerId = user?.id ?? null;

  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState(true);
  const [newItems, setNewItems] = useState<GroupsWithPrices[]>([]);
  const [newItemsLoading, setNewItemsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured()) {
        if (!cancelled) setIsLoadingBanners(false);
        return;
      }
      try {
        const { data, error } = await fetchActiveBanners();
        if (cancelled) return;
        if (error) {
          console.error('[Home] fetchActiveBanners:', error);
        }
        setBanners(data);
      } finally {
        if (!cancelled) setIsLoadingBanners(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setNewItems([]);
      setNewItemsLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setNewItemsLoading(true);
      const { data } = await fetchNewProductGroups(10);
      if (cancelled) return;
      setNewItemsLoading(false);
      setNewItems(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!customerId || !isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('customers').select('*').eq('id', customerId).single();
      if (cancelled || !data || typeof data !== 'object') return;
      setUser(normalizeCustomerRow(data as Record<string, unknown>));
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, setUser]);

  const bannerScrollRef = useRef<HTMLDivElement>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const autoPlayPauseUntilRef = useRef(0);

  const getBannerStep = (el: HTMLDivElement): number => {
    const firstChild = el.firstElementChild as HTMLElement | null;
    if (!firstChild) return el.clientWidth;
    const gap = Number.parseFloat(window.getComputedStyle(el).columnGap || '0') || 0;
    return firstChild.clientWidth + gap;
  };

  useEffect(() => {
    if (banners.length <= 1) {
      setBannerIndex(0);
      return;
    }
    setBannerIndex((prev) => Math.min(prev, banners.length - 1));
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const el = bannerScrollRef.current;
    if (!el) return;
    const intervalId = window.setInterval(() => {
      if (Date.now() < autoPlayPauseUntilRef.current) return;
      const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      const nextScrollLeft = el.scrollLeft + el.clientWidth;
      if (nextScrollLeft >= maxScrollLeft - 2) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }
      el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [banners.length]);

  const cartQtyBottom =
    totalQty === 0
      ? "Bo'sh"
      : totalQty === 1
        ? '1 dona'
        : `${totalQty} dona`;

  return (
    <div className={`flex min-h-full flex-1 flex-col pb-8 pt-[60px] ${DS_FONT_ONEST}`}>
      <div className="flex w-full flex-col gap-[20px] px-[16px]">
        <Link
          to="/profile"
          className={`${DS_TACTILE} block w-full`}
          aria-label="Profil va sozlamalar"
        >
          <div className={`flex w-full items-center justify-between rounded-[20px] bg-white p-[16px] ${CARD_SHADOW}`}>
            <div className="flex min-w-0 items-center gap-[12px] md:gap-[16px]">
              <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[#E54B4B] text-[clamp(18px,4.5vw,24px)] font-bold uppercase text-white md:h-[56px] md:w-[56px] font-['Onest']">
                {user?.name?.charAt(0) || 'M'}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="font-['Onest'] text-[clamp(16px,4vw,20px)] font-semibold leading-tight text-[#1A1A1A] line-clamp-1">
                  {user?.name || 'Mehmon'}
                </span>
                <span className="mt-0.5 font-['Onest'] text-[clamp(12px,3vw,14px)] text-[#A1A1A1]">
                  {user?.phone || '+998'}
                </span>
              </div>
            </div>
            <div
              className={`px-[10px] py-[4px] rounded-full text-[clamp(10px,2.5vw,12px)] font-medium font-['Onest'] lowercase tracking-wide shrink-0 ml-2 ${getLevelStyles(user?.level)}`}
            >
              {levelShortLabelUz(user?.level)}
            </div>
          </div>
        </Link>

        {isLoadingBanners ? (
          <div
            className="h-[180px] w-full animate-pulse rounded-[20px] bg-[#EAEAEA] sm:h-[220px] md:h-[250px]"
            aria-hidden
          />
        ) : banners.length > 0 ? (
          <div>
            <div
              ref={bannerScrollRef}
              onScroll={(e) => {
                const step = getBannerStep(e.currentTarget);
                const idx = Math.round(e.currentTarget.scrollLeft / step);
                const n = Math.max(1, banners.length);
                setBannerIndex(Math.min(n - 1, Math.max(0, idx)));
                autoPlayPauseUntilRef.current = Date.now() + 7000;
              }}
              onPointerDown={() => {
                autoPlayPauseUntilRef.current = Date.now() + 7000;
              }}
              onTouchStart={() => {
                autoPlayPauseUntilRef.current = Date.now() + 7000;
              }}
              className={`no-scrollbar relative flex w-full overflow-x-auto scroll-smooth snap-x snap-mandatory ${
                banners.length > 1 ? 'pb-[30px]' : 'pb-0'
              }`}
            >
              {banners.map((banner, idx) => {
                const href = banner.link_url?.trim();
                const mediaClass =
                  'w-full h-[180px] object-cover rounded-[20px] overflow-hidden sm:h-[220px] md:h-[250px]';
                const image = (
                  <img
                    src={banner.image_url}
                    alt=""
                    className={mediaClass}
                    draggable={false}
                  />
                );

                let slideInner: ReactNode;
                if (href?.startsWith('/')) {
                  slideInner = (
                    <Link to={href} className={`${DS_TACTILE} block ${mediaClass}`} aria-label="Banner — reklama">
                      {image}
                    </Link>
                  );
                } else if (href) {
                  slideInner = (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${DS_TACTILE} block ${mediaClass}`}
                      aria-label="Banner — reklama"
                    >
                      {image}
                    </a>
                  );
                } else {
                  slideInner = <div className={`block ${mediaClass}`}>{image}</div>;
                }

                return (
                  <div
                    key={bannerDomKey(banner, idx)}
                    className="relative min-w-full shrink-0 snap-center"
                  >
                    {slideInner}
                  </div>
                );
              })}
            </div>
            {banners.length > 1 ?
              <div
                className={`-mt-[30px] flex h-[30px] items-center justify-center gap-2 ${DS_FONT_ONEST}`}
              >
                {banners.map((_, idx) => (
                  <span
                    key={idx}
                    className={
                      idx === bannerIndex ?
                        'h-[8px] w-[24px] rounded-full bg-[#E54B4B] transition-all'
                      : 'h-[8px] w-[8px] rounded-full bg-[#EAEAEA] transition-all'
                    }
                  />
                ))}
              </div>
            : null}
          </div>
        ) : null}

        <div className={`grid grid-cols-2 gap-[16px]`}>
          <div className="flex flex-col items-center gap-[7px]">
            <Link
              to="/catalog?type=profiles"
              className={`${DS_TACTILE} block aspect-[189/105] w-full overflow-hidden rounded-[25px]`}
              aria-label="Profillar"
            >
              <img
                src="/profiles-button.png"
                alt=""
                className="w-full h-full object-cover pointer-events-none"
                onError={(e) => {
                  e.currentTarget.src = '/profiles-bg.jpg';
                }}
              />
            </Link>
            <span className={`${DS_FONT_ONEST} font-semibold text-[clamp(16px,4vw,16px)] text-[#1A1A1A]`}>Profillar</span>
          </div>
          <div className="flex flex-col items-center gap-[7px]">
            <Link
              to="/catalog?type=accessories"
              className={`${DS_TACTILE} block aspect-[189/105] w-full overflow-hidden rounded-[25px]`}
              aria-label="Aksessuarlar"
            >
              <img
                src="/accessories-button.png"
                alt=""
                className="w-full h-full object-cover pointer-events-none"
                onError={(e) => {
                  e.currentTarget.src = '/accessories-bg.jpg';
                }}
              />
            </Link>
            <span className={`${DS_FONT_ONEST} font-semibold text-[clamp(16px,4vw,16px)] text-[#1A1A1A]`}>Aksessuarlar</span>
          </div>
        </div>

        <div
          className={`flex flex-col gap-[20px] rounded-[25px] ${CARD_SHADOW} bg-white p-[22px] ${DS_FONT_ONEST}`}
        >
          <span className={`${DS_FONT_ONEST} text-[18px] font-semibold text-[#1A1A1A]`}>Sizning savatchangiz</span>

          <button
            type="button"
            onClick={() => navigate('/cart')}
            className={`${DS_TACTILE} flex w-full items-center justify-between border-none bg-transparent p-0 text-left outline-none`}
          >
            <div className="flex items-center gap-[12px] min-w-0">
              <span className="shrink-0 text-[clamp(24px,6vw,34px)]" aria-hidden>
                🛒
              </span>
              <div className="flex flex-col gap-[2px] min-w-0">
                <span className={`${DS_TEXT_SECONDARY}`}>Savatchadagi tovarlar</span>
                <span className={`${DS_FONT_ONEST} text-[18px] font-semibold text-[#1A1A1A]`}>
                  {cartQtyBottom}
                </span>
              </div>
            </div>
            <span className="shrink-0 text-[30px] font-semibold tabular-nums text-[#E54B4B]">
              {subtotal > 0 ? `${subtotal.toLocaleString('uz-UZ')} $` : '—'}
            </span>
          </button>
        </div>

        {newItemsLoading || newItems.length > 0 ?
          <section className={DS_FONT_ONEST}>
            <div className="mb-[16px] flex w-full items-center justify-between gap-[8px]">
              <h2
                className={`${DS_FONT_ONEST} min-w-0 shrink truncate font-semibold text-[clamp(18px,4.5vw,18px)] text-[#1A1A1A]`}
              >
                📦 Yangi tovarlar
              </h2>
              <button
                type="button"
                onClick={() => navigate('/catalog?filter=new')}
                className={`${DS_TACTILE} shrink-0 origin-center border-none bg-transparent p-0 font-['Onest'] text-[16px] font-semibold text-[#E54B4B] outline-none`}
              >
                Barchasi →
              </button>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar">
              {newItemsLoading ?
                [0, 1, 2].map((k) => (
                  <div
                    key={`new-skel-${k}`}
                    className={`h-[275px] w-[188px] shrink-0 animate-pulse rounded-[20px] bg-white p-2 ${CARD_SHADOW}`}
                  >
                    <div className="mb-2 h-[188px] w-full rounded-xl bg-[#E8E8E8]" />
                    <div className="mb-2 h-2 w-12 rounded bg-[#E8E8E8]" />
                    <div className="mb-2 h-8 w-full rounded bg-[#E8E8E8]" />
                    <div className="h-3 w-16 rounded bg-[#E8E8E8]" />
                  </div>
                ))
              : newItems.map((item) => (
                  <div key={item.id} className="w-[188px] shrink-0">
                    <CatalogProductCard item={toCatalogCardItemFromDbGroup(item)} />
                  </div>
                ))}
            </div>
          </section>
        : null}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
