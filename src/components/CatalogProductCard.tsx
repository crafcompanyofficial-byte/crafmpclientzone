import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GroupsWithPrices } from '../shared/api/catalogDb';
import { DS_TACTILE } from '../shared/ui/designTokens';

export type CatalogProductCardItem = {
  id: string;
  /** Min-price variant SKU or stable fallback when variants lack `sku`. */
  sku: string;
  name: string;
  priceLabel: string;
  image: string | null;
  is_new?: boolean;
};

/** When `product_groups` has no SKU; stable placeholder until variants are surfaced. */
export function skuFallbackFromProductId(id: string): string {
  const t = id.replace(/-/g, '').slice(0, 6).toUpperCase();
  return t ? `CRF-${t}` : 'CRF-XXX';
}

export function resolveCatalogSku(raw: string | null | undefined, id: string): string {
  const primary = String(raw ?? '').trim();
  if (primary) return primary;
  return id.trim() ? skuFallbackFromProductId(id) : 'N/A';
}

export function toCatalogCardItemFromDbGroup(item: GroupsWithPrices): CatalogProductCardItem {
  const min = Number(item.minPrice ?? 0);
  const minSku = item.minPriceSku != null ? String(item.minPriceSku).trim() : '';
  const skuLabel = resolveCatalogSku(minSku || null, item.id);
  return {
    id: item.id,
    sku: skuLabel,
    name: String(item.name ?? 'Товар').trim() || 'Товар',
    priceLabel: min > 0 ? `${Math.round(min)} $` : '12 $',
    image: item.main_image?.trim() ? item.main_image.trim() : null,
    is_new: item.is_new === true,
  };
}

const ROOT_CLASS = `${DS_TACTILE} flex h-full w-full flex-col overflow-hidden rounded-[20px] bg-white text-inherit no-underline`;

const NEW_BADGE =
  "absolute top-3 right-3 bg-[#E54B4B] text-white px-2 py-0.5 text-[clamp(10px,2.5vw,12px)] rounded-full uppercase font-bold z-10 font-['Onest'] tracking-wider";

type CatalogProductCardProps = {
  item: CatalogProductCardItem;
};

export function CatalogProductCard({ item }: CatalogProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [item.id, item.image]);

  const showImage = Boolean(item.image) && !imageFailed;

  return (
    <Link to={`/product/${item.id}`} className={ROOT_CLASS}>
      <div className="relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden bg-[#EBEBEB]">
        {showImage ?
          <img
            src={item.image ?? ''}
            alt={item.name}
            className="h-full w-full object-cover"
            draggable={false}
            onError={() => setImageFailed(true)}
          />
        : <span className="pointer-events-none text-4xl opacity-20 select-none" aria-hidden="true">
            📦
          </span>
        }
        {item.is_new === true ?
          <span className={NEW_BADGE}>NEW</span>
        : null}
      </div>
      <div className="flex flex-1 flex-col justify-between p-[12px]">
        <div>
          <p className="mb-1 font-['Onest'] text-[clamp(10px,2.5vw,12px)] uppercase text-[#A1A1A1]">
            {item.sku || 'N/A'}
          </p>
          <p className="line-clamp-2 font-['Onest'] text-[clamp(14px,3.5vw,18px)] font-bold leading-tight text-[#1A1A1A]">
            {item.name}
          </p>
        </div>
        <p className="font-['Onest'] text-[clamp(16px,4vw,22px)] font-bold text-[#565656]">{item.priceLabel}</p>
      </div>
    </Link>
  );
}
