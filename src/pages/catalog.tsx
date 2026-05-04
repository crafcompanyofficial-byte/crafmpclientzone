import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import {
  CatalogProductCard,
  type CatalogProductCardItem,
  toCatalogCardItemFromDbGroup,
} from '../components/CatalogProductCard';
import {
  fetchCategories,
  fetchNewProductGroups,
  fetchProductGroupsWithMinPrice,
  fetchSubcategories,
  groupCatalogByBlockName,
  resolveCategoryIdFromSlug,
  type CatalogTypeParam,
  type GroupsWithPrices,
  type SubcategoryDbRow,
  type CategoryDbRow,
} from '../shared/api/catalogDb';
import { isSupabaseConfigured } from '../shared/api/supabase';
import { DS_FONT_ONEST, DS_TACTILE } from '../shared/ui/designTokens';

const ACTIVE_TAB = `${DS_TACTILE} rounded-[13px] shrink-0 bg-[#E54B4B] px-4 py-1.5 font-['Onest'] text-[clamp(14px,3.5vw,18px)] font-bold whitespace-nowrap text-white`;
const INACTIVE_TAB = `${DS_TACTILE} rounded-[13px] shrink-0 bg-[#DEDEDE] px-4 py-1.5 font-['Onest'] text-[clamp(14px,3.5vw,18px)] font-medium whitespace-nowrap text-[#666666]`;
const SUB_ACTIVE = `${DS_TACTILE} rounded-[13px] shrink-0 bg-[#E54B4B] px-4 py-1.5 font-['Onest'] text-[clamp(14px,3.5vw,18px)] font-bold whitespace-nowrap text-white`;
const SUB_INACTIVE = `${DS_TACTILE} rounded-[13px] shrink-0 bg-[#DEDEDE] px-4 py-1.5 font-['Onest'] text-[clamp(14px,3.5vw,18px)] font-medium whitespace-nowrap text-[#666666]`;

type CardRow = CatalogProductCardItem;

function groupDbToCard(g: GroupsWithPrices): CatalogProductCardItem {
  return toCatalogCardItemFromDbGroup(g);
}

/** Default “whole category” pseudo-filter — Profiles use this alone; Accessories use real Aldox/Thermo/PVC. */
function isPlaceholderSubcategoryName(name: string | null | undefined): boolean {
  const n = (name ?? '').trim().toLowerCase();
  return n === 'все' || n === 'vse' || n === 'all' || n === 'barchasi';
}

function isListingFilter(v: string | null): v is 'promotions' | 'new' {
  return v === 'promotions' || v === 'new';
}

/** Top-level catalog URL scope (`?type=`): profiles vs accessories — not DB category slug. */
function isCatalogScopeType(v: string | null): v is CatalogTypeParam {
  return v === 'profiles' || v === 'accessories';
}

export function Catalog() {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const categorySlugParam = searchParams.get('category');
  const filterParam = searchParams.get('filter');
  const legacyFilter = isListingFilter(filterParam);
  const catalogScopeValid = isCatalogScopeType(typeParam);

  const [searchQuery, setSearchQuery] = useState('');

  const [categories, setCategories] = useState<CategoryDbRow[]>([]);
  const [categoriesErr, setCategoriesErr] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(
    () => !legacyFilter && catalogScopeValid
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [subcategories, setSubcategories] = useState<SubcategoryDbRow[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string>('');

  const [groups, setGroups] = useState<GroupsWithPrices[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsErr, setGroupsErr] = useState<string | null>(null);

  const [legacyGroups, setLegacyGroups] = useState<GroupsWithPrices[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyErr, setLegacyErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || legacyFilter || !isCatalogScopeType(typeParam)) {
      setCategoriesLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setCategoriesLoading(true);
      const { data, error } = await fetchCategories(typeParam);
      if (cancelled) return;
      setCategoriesLoading(false);
      if (error) setCategoriesErr(error);
      else setCategoriesErr(null);
      setCategories(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [legacyFilter, typeParam]);

  useEffect(() => {
    if (legacyFilter || categories.length === 0 || !isCatalogScopeType(typeParam)) return;
    const fromSlug = resolveCategoryIdFromSlug(categories, categorySlugParam);
    setSelectedCategoryId(fromSlug ?? categories[0].id);
  }, [categories, categorySlugParam, legacyFilter, typeParam]);

  useEffect(() => {
    if (legacyFilter || !selectedCategoryId) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await fetchSubcategories(selectedCategoryId);
      if (cancelled) return;
      if (!error) setSubcategories(data);
      else setSubcategories([]);
    })();
    setSelectedSubId('');
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, legacyFilter]);

  const showSubcategoryRow = useMemo(() => {
    const nonEmptyNames = subcategories.filter((s) => (s.name ?? '').trim().length > 0);
    const effective = nonEmptyNames.length > 0 ? nonEmptyNames : subcategories;

    if (effective.length === 0) return false;
    /** Single technical “all categories” stub — Profiles; hide filter row entirely. */
    if (effective.length === 1 && isPlaceholderSubcategoryName(effective[0].name)) {
      return false;
    }

    /** Only placeholder labels (shouldn’t ship, but avoids a useless pill row). */
    if (effective.length > 0 && effective.every((s) => isPlaceholderSubcategoryName(s.name))) {
      return false;
    }

    return true;
  }, [subcategories]);

  useEffect(() => {
    if (legacyFilter || !selectedCategoryId || !isSupabaseConfigured() || !catalogScopeValid) return;
    let cancelled = false;
    void (async () => {
      setGroupsLoading(true);
      setGroupsErr(null);
      const subcategoryFilter =
        showSubcategoryRow && selectedSubId ? selectedSubId : undefined;
      const { data, error } = await fetchProductGroupsWithMinPrice({
        categoryId: selectedCategoryId,
        subcategoryId: subcategoryFilter,
      });
      if (cancelled) return;
      setGroupsLoading(false);
      if (error) setGroupsErr(error);
      setGroups(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, selectedSubId, legacyFilter, catalogScopeValid, showSubcategoryRow]);

  useEffect(() => {
    if (!legacyFilter) {
      setLegacyGroups([]);
      return;
    }
    if (!isSupabaseConfigured()) {
      setLegacyErr('Supabase sozlanmagan');
      setLegacyGroups([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLegacyLoading(true);
      setLegacyErr(null);
      const { data, error } =
        filterParam === 'promotions' ?
          await fetchProductGroupsWithMinPrice({ onlyPromotion: true })
        : await fetchNewProductGroups();
      if (cancelled) return;
      setLegacyLoading(false);
      if (error) {
        setLegacyErr(error);
        setLegacyGroups([]);
        return;
      }
      setLegacyGroups(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [legacyFilter, filterParam]);

  const blockMap = useMemo(() => groupCatalogByBlockName(groups), [groups]);
  const legacyBlockMap = useMemo(() => groupCatalogByBlockName(legacyGroups), [legacyGroups]);

  const ecommerceBlocksEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const entries = [...blockMap.entries()].map(([blockKey, list]) => {
      const rows: CardRow[] = list.map(groupDbToCard);
      const title = blockKey === '__misc__' ? 'Boshqa mahsulotlar' : blockKey;
      return [title, rows] as [string, CardRow[]];
    });

    const filtered =
      q.length === 0
        ? entries
        : entries
            .map(([title, rows]) => {
              const rr = rows.filter(
                (r) =>
                  r.name.toLowerCase().includes(q) ||
                  r.sku.toLowerCase().includes(q) ||
                  title.toLowerCase().includes(q)
              );
              return [title, rr] as [string, CardRow[]];
            })
            .filter(([, rr]) => rr.length > 0);

    return filtered;
  }, [blockMap, searchQuery]);

  const legacyBlockEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const entries = [...legacyBlockMap.entries()].map(([blockKey, list]) => {
      const rows: CardRow[] = list.map(groupDbToCard);
      const title = blockKey === '__misc__' ? 'Boshqa mahsulotlar' : blockKey;
      return [title, rows] as [string, CardRow[]];
    });
    const filtered =
      q.length === 0
        ? entries
        : entries
            .map(([title, rows]) => {
              const rr = rows.filter(
                (r) =>
                  r.name.toLowerCase().includes(q) ||
                  r.sku.toLowerCase().includes(q) ||
                  title.toLowerCase().includes(q)
              );
              return [title, rr] as [string, CardRow[]];
            })
            .filter(([, rr]) => rr.length > 0);
    return filtered;
  }, [legacyBlockMap, searchQuery]);

  const listTitle = legacyFilter
    ? filterParam === 'promotions'
      ? 'Aksiyalar'
      : 'Yangi tovarlar'
    : null;

  const showCategoryTabs = !legacyFilter && catalogScopeValid && categories.length > 0;
  const showSubTabs = !legacyFilter && catalogScopeValid && showSubcategoryRow;

  const loadingMain =
    legacyFilter ? legacyLoading
    : !catalogScopeValid ? false
    : categoriesLoading || groupsLoading;
  const errorMain = legacyFilter ? legacyErr : groupsErr ?? categoriesErr;
  const hasBlocks =
    legacyFilter ?
      legacyBlockEntries.some(([, r]) => r.length > 0)
    : ecommerceBlocksEntries.some(([, r]) => r.length > 0);

  if (!legacyFilter && !catalogScopeValid) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col pt-[var(--app-header-offset)]">
      {!legacyFilter && (
        <div className="sticky top-[var(--app-header-offset)] z-20 flex-shrink-0 bg-[#F5F5F5] px-[16px] pb-[16px] pt-[16px]">
          <div className="flex flex-col gap-[16px]">
            <div>
              <label className={`${DS_FONT_ONEST} sr-only`} htmlFor="catalog-search-input">
                Mahsulot qidiruvi
              </label>
              <div className="flex h-[39px] items-center gap-2 rounded-[13px] bg-[#EBEBEB] px-[12px]">
                <Search className="h-[18px] w-[18px] shrink-0 text-[#A1A1A1]" strokeWidth={2} aria-hidden />
                <input
                  id="catalog-search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Qidirish..."
                  autoComplete="off"
                  className="h-full min-w-0 flex-1 border-none bg-transparent font-['Onest'] text-[clamp(16px,4vw,22px)] font-normal text-[#1A1A1A] outline-none placeholder:text-[#A1A1A1] focus:ring-0"
                />
              </div>
            </div>

            {showCategoryTabs ?
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {categories.map((c) => {
                  const active = c.id === selectedCategoryId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(c.id)}
                      className={active ? ACTIVE_TAB : INACTIVE_TAB}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            : null}

            {showSubTabs ?
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedSubId('')}
                  className={selectedSubId === '' ? SUB_ACTIVE : SUB_INACTIVE}
                >
                  Barchasi
                </button>
                {subcategories.map((s) => {
                  const active = s.id === selectedSubId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSubId(s.id)}
                      className={active ? SUB_ACTIVE : SUB_INACTIVE}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            : null}
          </div>
        </div>
      )}

      {legacyFilter ?
        <div className="sticky top-[var(--app-header-offset)] z-20 flex-shrink-0 bg-[#F5F5F5] px-[16px] pb-[16px] pt-[16px]">
          <div className="flex flex-col gap-[16px]">
            {listTitle ?
              <h2 className="font-['Onest'] text-[18px] font-semibold leading-tight text-[#1A1A1A]">
                {listTitle}
              </h2>
            : null}
            <div className="flex h-[39px] items-center gap-2 rounded-[13px] bg-[#EBEBEB] px-[12px]">
              <Search className="h-[18px] w-[18px] shrink-0 text-[#A1A1A1]" strokeWidth={2} aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Qidirish..."
                autoComplete="off"
                className="h-full min-w-0 flex-1 border-none bg-transparent font-['Onest'] text-[clamp(16px,4vw,22px)] font-normal text-[#1A1A1A] outline-none placeholder:text-[#A1A1A1] focus:ring-0"
                aria-label="Qidirish"
              />
            </div>
          </div>
        </div>
      : null}

      <div
        className={`mx-auto flex min-h-0 w-full max-w-[700px] flex-1 flex-col overflow-x-hidden bg-[#F5F5F5] ${DS_FONT_ONEST}`}
      >
        <div className="min-h-0 flex-1 px-[16px] pb-24">
        {!legacyFilter &&
        catalogScopeValid &&
        !categoriesLoading &&
        !categoriesErr &&
        categories.length === 0 &&
        isSupabaseConfigured() ?
          <p className="pt-8 text-center text-[clamp(14px,3.5vw,18px)] text-[#999999]">Katalog bo'sh — kategoriyalar qo'shing</p>
        : null}

        {!legacyFilter && catalogScopeValid && !isSupabaseConfigured() ?
          <p className="pt-8 text-center text-[clamp(14px,3.5vw,18px)] text-[#999999]">Supabase sozlanmagan</p>
        : null}

        {errorMain && !loadingMain ?
          <p className="mt-4 rounded-[13px] bg-amber-50 px-4 py-3 text-[clamp(14px,3.5vw,18px)] text-amber-900">{errorMain}</p>
        : null}

        {loadingMain ?
          <div className="flex min-h-[40vh] flex-1 justify-center py-20">
            <Loader2 className="h-9 w-9 animate-spin text-[#E54B4B]" aria-hidden />
          </div>
        : !hasBlocks && !errorMain ?
          <p className="flex-1 px-2 py-16 text-center text-[clamp(14px,3.5vw,18px)] font-medium text-[#999999]">
            {legacyFilter ?
              filterParam === 'promotions'
                ? 'Faol aksiyalar yo\'q'
                : 'Yangi tovarlar yo\'q'
            : 'Ushbu kategoriyada hali tovar yo\'q'}
          </p>
        : (legacyFilter ? legacyBlockEntries : ecommerceBlocksEntries).map(([blockTitle, rows]) =>
            rows.length === 0 ? null : (
              <div key={blockTitle} className="mb-[24px]">
                <div className="mb-3 inline-block">
                  <h2 className="font-['Onest'] text-[18px] font-semibold leading-tight text-[#1A1A1A]">
                    {blockTitle}
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[12px] sm:gap-[16px] w-full items-stretch">
                  {rows.map((item) => (
                    <CatalogProductCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )
          )
        }
        </div>

        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    </div>
  );
}
