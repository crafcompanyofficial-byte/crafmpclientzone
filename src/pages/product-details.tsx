import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Minus, Plus } from 'lucide-react';
import {
  fetchProductDetails,
  type ProductDetailsGroup,
  type ProductImageRow,
  type ProductVariantNormalized,
} from '../shared/api/catalogDb';
import { useCartStore } from '../shared/store/cartStore';
import { DS_TACTILE } from '../shared/ui/designTokens';

const WRAPPER_CLASS =
  'relative mx-auto flex min-h-screen w-full max-w-[700px] flex-col overflow-x-hidden bg-[#F5F5F5] pb-24 pt-[60px]';

const TYPE_BTN_ACTIVE = `${DS_TACTILE} rounded-[13px] bg-[#E54B4B] px-4 py-2 font-['Onest'] text-[clamp(14px,3.5vw,18px)] font-medium text-white`;
const TYPE_BTN_IDLE = `${DS_TACTILE} rounded-[13px] bg-[#F2F2F2] px-4 py-2 font-['Onest'] text-[clamp(14px,3.5vw,18px)] font-medium text-[#1A1A1A]`;

const COLOR_FALLBACK_ACTIVE = `${DS_TACTILE} rounded-[13px] border-2 border-[#E54B4B] bg-white px-4 py-2 font-['Onest'] text-[clamp(14px,3.5vw,18px)] font-medium text-[#1A1A1A]`;
const COLOR_FALLBACK_IDLE = `${DS_TACTILE} rounded-[13px] border-2 border-transparent bg-[#F2F2F2] px-4 py-2 font-['Onest'] text-[clamp(14px,3.5vw,18px)] font-medium text-[#565656]`;

function uniqueSortedTypes(list: ProductVariantNormalized[]): string[] {
  const s = new Set<string>();
  for (const v of list) s.add(v.type);
  return [...s].sort((a, b) => a.localeCompare(b, 'ru'));
}

function variantsOfType(list: ProductVariantNormalized[], selectedType: string): ProductVariantNormalized[] {
  return list.filter((v) => v.type === selectedType);
}

function uniqueSortedColors(sub: ProductVariantNormalized[]): string[] {
  const s = new Set<string>();
  for (const v of sub) s.add(v.color_name);
  return [...s].sort((a, b) => a.localeCompare(b, 'ru'));
}

function labelForType(t: string): string {
  return t.trim() === '' ? 'Стандарт' : t;
}

export function ProductDetails() {
  const COLOR_MAP: Record<string, string> = {
    '9016': '#FFFFFF',
    '8017': '#4A2A22',
    '8003': '#825830',
    J306: '#D4C5B0',
    '7011': '#525B64',
    Qora: '#000000',
    Oq: '#FFFFFF',
  };

  const resolveColorHex = (colorName: string): string | null => {
    const t = colorName.trim();
    if (COLOR_MAP[t]) return COLOR_MAP[t];
    const ci = Object.keys(COLOR_MAP).find((k) => k.toLowerCase() === t.toLowerCase());
    if (ci) return COLOR_MAP[ci];
    const sub = Object.keys(COLOR_MAP).find((k) => t.includes(k));
    return sub ? COLOR_MAP[sub] : null;
  };

  const SWATCH_BASE =
    'w-10 h-10 shrink-0 rounded-full border border-gray-200 shadow-sm relative transition-all';

  const { id } = useParams<{ id: string }>();

  const [group, setGroup] = useState<ProductDetailsGroup | null>(null);
  const [variants, setVariants] = useState<ProductVariantNormalized[]>([]);
  const [images, setImages] = useState<ProductImageRow[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedType, setSelectedType] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [id]);

  useEffect(() => {
    if (!id?.trim()) {
      setGroup(null);
      setVariants([]);
      setImages([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      const { group: g, variants: v, images: gallery, error } = await fetchProductDetails(id);
      if (cancelled) return;
      setLoading(false);
      if (error && !g) {
        setLoadError(error);
        setGroup(null);
        setVariants([]);
        setImages([]);
        return;
      }
      setGroup(g ?? null);
      setVariants(v);
      setImages(gallery ?? []);
      setLoadError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!variants.length) {
      setSelectedType('');
      setSelectedColor('');
      setQuantity(1);
      return;
    }
    const types = uniqueSortedTypes(variants);
    setSelectedType(types[0] ?? '');
    setQuantity(1);
  }, [id, variants]);

  useEffect(() => {
    const sub = variantsOfType(variants, selectedType);
    const colors = uniqueSortedColors(sub);
    if (!colors.length) {
      setSelectedColor('');
      return;
    }
    setSelectedColor((prev) => (colors.includes(prev) ? prev : colors[0]));
  }, [selectedType, variants]);

  const typeOptions = useMemo(() => uniqueSortedTypes(variants), [variants]);
  const colorOptions = useMemo(
    () => uniqueSortedColors(variantsOfType(variants, selectedType)),
    [variants, selectedType]
  );

  const activeVariant = useMemo(() => {
    const sub = variantsOfType(variants, selectedType);
    return sub.find((v) => v.color_name === selectedColor);
  }, [variants, selectedType, selectedColor]);

  const price = activeVariant ? activeVariant.price : 0;
  const sku = activeVariant?.sku ?? '—';

  const showTypeSelector = typeOptions.length > 1 || (typeOptions.length === 1 && typeOptions[0] !== '');
  const mainImage =
    typeof group?.main_image === 'string' && group.main_image.trim() ? group.main_image.trim() : '';

  const title = typeof group?.name === 'string' && group.name.trim() ? group.name.trim() : 'Товар';
  const rawDescription =
    typeof group?.description === 'string' && group.description.trim() ? group.description.trim() : null;

  if (loading) {
    return (
      <div className={`${WRAPPER_CLASS} items-center justify-center`}>
        <Loader2 className="h-10 w-10 animate-spin text-[#E54B4B]" aria-hidden />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`${WRAPPER_CLASS} items-center justify-center px-6`}>
        <p className="mb-4 text-center font-['Onest'] text-[#565656]">{loadError}</p>
        <Link to="/" className={`${DS_TACTILE} inline-block font-['Onest'] font-semibold text-[#E54B4B]`}>
          На главную
        </Link>
      </div>
    );
  }

  if (!group) {
    return (
      <div className={`${WRAPPER_CLASS} items-center justify-center px-6`}>
        <p className="mb-4 text-center font-['Onest'] text-[#565656]">Товар не найден</p>
        <Link to="/" className={`${DS_TACTILE} inline-block font-['Onest'] font-semibold text-[#E54B4B]`}>
          На главную
        </Link>
      </div>
    );
  }

  const priceShown = Number.isFinite(price) && price > 0 ? Math.round(price) : 0;

  const handleAddToCart = () => {
    if (!activeVariant || !group.id) return;
    useCartStore.getState().addItem({
      variantId: activeVariant.id,
      groupId: String(group.id),
      name: String(group.name ?? 'Товар'),
      sku: activeVariant.sku,
      price: activeVariant.price,
      quantity,
      color: activeVariant.color_name,
      type: activeVariant.type || labelForType(''),
      image: typeof group.main_image === 'string' ? group.main_image.trim() || null : null,
    });
    toast.success('Товар добавлен в корзину', { duration: 2600 });
  };

  return (
    <div className={WRAPPER_CLASS}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="relative z-0 mx-auto aspect-square w-full max-w-[700px] shrink-0 overflow-hidden bg-[#F5F5F5]">
        {images.length > 0 ?
          <>
            <div
              className="flex h-full w-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
              onScroll={(e) =>
                setActiveImageIndex(
                  Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth)
                )
              }
            >
              {images.map((img, i) => (
                <div key={`${img.sort_order}-${img.url}-${i}`} className="relative h-full w-full shrink-0 snap-center">
                  <img
                    src={img.url}
                    alt="Product"
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
            <div className="absolute bottom-[40px] left-0 right-0 flex justify-center gap-2">
              {images.map((img, i) => (
                <span
                  key={`dot-${i}-${img.url}`}
                  aria-hidden
                  className={`h-2 w-2 rounded-full ${i === activeImageIndex ? 'bg-[#1A1A1A]' : 'bg-black/20'}`}
                />
              ))}
            </div>
          </>
        : <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
            {mainImage ?
              <img
                src={mainImage}
                alt="Product"
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
            : <span className="select-none text-6xl opacity-30" aria-hidden="true">
                📦
              </span>
            }
          </div>
        }
      </div>

      <div className="relative z-10 -mt-6 flex min-h-[50vh] flex-1 flex-col rounded-t-[30px] bg-white p-[20px] pb-[100px]">
        <h1 className="mb-1 font-['Onest'] text-[clamp(24px,6vw,34px)] font-bold text-[#1A1A1A]">{title}</h1>
        <p className="mb-4 font-['Onest'] text-[clamp(12px,2.8vw,14px)] uppercase text-[#A1A1A1]">{sku}</p>
        <p className="mb-6 font-['Onest'] text-[clamp(24px,6vw,34px)] font-bold text-[#999999]">
          {priceShown > 0 ? `${priceShown} $` : '—'}
        </p>

        <p className="mb-6 leading-relaxed font-['Onest'] text-[clamp(14px,3.5vw,18px)] text-[#565656]">
          {rawDescription || 'Описание отсутствует'}
        </p>

        {variants.length === 0 ? (
          <p className="font-['Onest'] text-[clamp(14px,3.5vw,18px)] text-[#565656]">Нет доступных вариантов для заказа</p>
        ) : (
          <>
            {showTypeSelector ?
              <div className="mb-6">
                <p className="mb-2 font-['Onest'] text-[clamp(14px,3.5vw,18px)] font-medium text-[#565656]">Вариант</p>
                <div className="flex flex-wrap gap-2">
                  {typeOptions.map((t) => {
                    const active = selectedType === t;
                    return (
                      <button
                        key={`type-${t || 'default'}`}
                        type="button"
                        onClick={() => setSelectedType(t)}
                        className={active ? TYPE_BTN_ACTIVE : TYPE_BTN_IDLE}
                      >
                        {labelForType(t)}
                      </button>
                    );
                  })}
                </div>
              </div>
            : null}

            <div className="mb-3">
              <p className="mb-2 font-['Onest'] text-[clamp(14px,3.5vw,18px)] font-medium text-[#565656]">Цвет</p>
              <div className="flex flex-wrap items-center gap-3">
                {colorOptions.map((c) => {
                  const hex = resolveColorHex(c);
                  const active = selectedColor === c;
                  if (!hex) {
                    return (
                      <button
                        key={`color-pill-${selectedType}-${c}`}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        className={active ? COLOR_FALLBACK_ACTIVE : COLOR_FALLBACK_IDLE}
                      >
                        {c}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={`color-swatch-${selectedType}-${c}`}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      aria-label={c}
                      className={`${DS_TACTILE} rounded-full border-none bg-transparent p-0 outline-none ${active ? 'ring-2 ring-[#E54B4B] ring-offset-2' : ''}`}
                    >
                      <div className={SWATCH_BASE} style={{ backgroundColor: hex }} />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[700px] -translate-x-1/2 items-center gap-4 border-t border-gray-100 bg-white p-[16px]">
        <div className="flex h-[48px] w-[120px] shrink-0 items-center justify-between rounded-[13px] bg-[#F2F2F2] px-2">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className={`${DS_TACTILE} flex h-9 w-9 items-center justify-center rounded-lg border-none bg-transparent p-0 text-[#1A1A1A]`}
            aria-label="Меньше"
          >
            <Minus className="h-5 w-5" strokeWidth={2} />
          </button>
          <span className="min-w-[24px] text-center font-['Onest'] text-[clamp(16px,4vw,22px)] font-semibold tabular-nums text-[#1A1A1A]">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className={`${DS_TACTILE} flex h-9 w-9 items-center justify-center rounded-lg border-none bg-transparent p-0 text-[#1A1A1A]`}
            aria-label="Больше"
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <button
          type="button"
          disabled={!activeVariant}
          onClick={handleAddToCart}
          className={`${DS_TACTILE} flex h-[48px] flex-1 items-center justify-center gap-2 rounded-[13px] border-none bg-[#E54B4B] font-['Onest'] text-[clamp(14px,3.5vw,18px)] font-medium text-white outline-none disabled:pointer-events-none disabled:opacity-45`}
        >
          В корзину
        </button>
      </div>
    </div>
  );
}
