import { getSupabase } from './supabase';

export type CategoryDbRow = {
  id: string;
  name: string;
  slug: string | null;
  sort_order: number | null;
  catalog_type?: string | null;
};

export type SubcategoryDbRow = {
  id: string;
  category_id: string;
  name: string;
  slug: string | null;
};

/** Row from `product_groups`; listing SKU comes from `product_variants.sku`. */
export type ProductGroupDbRow = {
  id: string;
  name: string | null;
  description?: string | null;
  block_name: string | null;
  category_id: string;
  subcategory_id: string | null;
  main_image: string | null;
  /** Optional loyalty / listing flags — may be omitted in DB migrations. */
  is_new?: boolean | null;
};

function variantPrice(v: Record<string, unknown>): number {
  const n = Number(v.price ?? v.retail_price ?? v.list_price ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Profile vs accessories scope from URL (`profiles` | `accessories`). */
export type CatalogTypeParam = 'profiles' | 'accessories';

/** Fetch categories for horizontal tabs scoped to one catalog (`catalog_type`). */
export async function fetchCategories(
  catalogType: CatalogTypeParam
): Promise<{ data: CategoryDbRow[]; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { data: [], error: 'Supabase не настроен' };

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, sort_order, catalog_type')
    .eq('catalog_type', catalogType);
  if (error) return { data: [], error: error.message };

  const rows = (Array.isArray(data) ? data : []) as CategoryDbRow[];
  rows.sort((a, b) => {
    const so = Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999);
    if (so !== 0) return so;
    return (a.name ?? '').localeCompare(b.name ?? '', 'ru');
  });

  return { data: rows, error: null };
}

export async function fetchSubcategories(categoryId: string): Promise<{ data: SubcategoryDbRow[]; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { data: [], error: 'Supabase не настроен' };

  const { data, error } = await supabase
    .from('subcategories')
    .select('id, category_id, name, slug')
    .eq('category_id', categoryId)
    .order('name');

  if (error) return { data: [], error: error.message };
  return { data: (Array.isArray(data) ? data : []) as SubcategoryDbRow[], error: null };
}

export type GroupsWithPrices = ProductGroupDbRow & {
  minPrice: number;
  /** `sku` on the cheapest variant row (for cards). */
  minPriceSku?: string | null;
};

type FetchGroupsOpts = {
  categoryId?: string | null;
  subcategoryId?: string | null;
  onlyNew?: boolean;
  onlyPromotion?: boolean;
};

function promotionRowGroupId(row: Record<string, unknown>): string {
  const v =
    row.product_group_id ??
    row.group_id ??
    row.product_group_uuid ??
    row.product_id;
  return String(v ?? '').trim();
}

/** IDs of groups listed in the separate `promotions` table (no `is_promotion` on `product_groups`). */
async function fetchProductGroupIdsFromPromotions(
  supabase: NonNullable<ReturnType<typeof getSupabase>>
): Promise<{ ids: string[]; error: string | null }> {
  let probe = await supabase.from('promotions').select('*');
  if (probe.error) return { ids: [], error: probe.error.message };

  const rows = (Array.isArray(probe.data) ? probe.data : []) as Record<string, unknown>[];
  const seen = new Set<string>();
  for (const row of rows) {
    const id = promotionRowGroupId(row);
    if (id) seen.add(id);
  }
  return { ids: [...seen], error: null };
}

/**
 * Loads `product_groups` and minimum variant price from `product_variants`.
 * Optionally filters by category / subcategory, `is_new`, or promotion rows in `promotions`.
 */
export async function fetchProductGroupsWithMinPrice(opts: FetchGroupsOpts): Promise<{
  data: GroupsWithPrices[];
  error: string | null;
}> {
  const supabase = getSupabase();
  if (!supabase) return { data: [], error: 'Supabase не настроен' };

  const groupFields =
    'id, name, description, block_name, category_id, subcategory_id, main_image, is_new';

  let qb = supabase.from('product_groups').select(groupFields);

  if (opts.categoryId) qb = qb.eq('category_id', opts.categoryId);
  if (opts.subcategoryId) qb = qb.eq('subcategory_id', opts.subcategoryId);
  if (opts.onlyNew) qb = qb.eq('is_new', true);
  if (opts.onlyPromotion) {
    const { ids, error: promErr } = await fetchProductGroupIdsFromPromotions(supabase);
    if (promErr) return { data: [], error: promErr };
    if (ids.length === 0) return { data: [], error: null };
    qb = qb.in('id', ids);
  }

  const { data: groupsRaw, error: gErr } = await qb;
  if (gErr) return { data: [], error: gErr.message };

  let groups = (Array.isArray(groupsRaw) ? groupsRaw : []) as ProductGroupDbRow[];

  return attachMinPricesFromVariants(supabase, groups);
}

type ProductGroupRowWithVariants = ProductGroupDbRow & {
  product_variants?: unknown;
};

function minPriceAndSkuFromEmbeddedVariants(raw: unknown): { minPrice: number; sku: string } {
  if (!Array.isArray(raw)) return { minPrice: 0, sku: '' };
  let min = 0;
  let sku = '';
  for (const v of raw) {
    if (!v || typeof v !== 'object') continue;
    const row = v as Record<string, unknown>;
    const p = variantPrice(row);
    if (!(p > 0)) continue;
    const rowSku = String(row.sku ?? '').trim();
    if (min === 0 || p < min) {
      min = p;
      sku = rowSku;
    } else if (p === min && !sku && rowSku) {
      sku = rowSku;
    }
  }
  return { minPrice: min, sku };
}

/** Homepage / catalog «Новинки»: direct `product_groups` + embedded variant prices where supported. */
export async function fetchNewProductGroups(limit?: number): Promise<{
  data: GroupsWithPrices[];
  error: string | null;
}> {
  const supabase = getSupabase();
  if (!supabase) return { data: [], error: 'Supabase не настроен' };

  const selectNested =
    'id, name, block_name, main_image, is_new, category_id, subcategory_id, product_variants(id, price, sku)';

  let query = supabase.from('product_groups').select(selectNested).eq('is_new', true);
  if (limit !== undefined) {
    query = query.limit(Math.max(1, Math.min(500, limit)));
  }

  const { data: rowsRaw, error } = await query;

  if (error) {
    const groupFieldsFlat =
      'id, name, description, block_name, category_id, subcategory_id, main_image, is_new';
    let flat = supabase.from('product_groups').select(groupFieldsFlat).eq('is_new', true);
    if (limit !== undefined) flat = flat.limit(Math.max(1, Math.min(500, limit)));
    const { data: groupsRaw, error: gErr } = await flat;
    if (gErr) return { data: [], error: gErr.message };
    const groups = (Array.isArray(groupsRaw) ? groupsRaw : []) as ProductGroupDbRow[];
    return attachMinPricesFromVariants(supabase, groups);
  }

  const rows = (Array.isArray(rowsRaw) ? rowsRaw : []) as ProductGroupRowWithVariants[];
  const data: GroupsWithPrices[] = rows.map((row) => {
    const { product_variants: vars, ...rest } = row;
    const { minPrice, sku } = minPriceAndSkuFromEmbeddedVariants(vars);
    return {
      ...(rest as ProductGroupDbRow),
      minPrice,
      minPriceSku: sku || null,
    };
  });

  return { data, error: null };
}

async function attachMinPricesFromVariants(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  groups: ProductGroupDbRow[]
): Promise<{ data: GroupsWithPrices[]; error: string | null }> {
  const list = [...groups];

  const ids = list.map((g) => g.id).filter(Boolean);
  if (ids.length === 0) return { data: [], error: null };

  let vars: Record<string, unknown>[] | null = null;
  let vErr: { message: string } | null = null;
  let probe = await supabase.from('product_variants').select('*').in('product_group_id', ids);
  if (probe.error?.message?.toLowerCase().includes('column')) {
    probe = await supabase.from('product_variants').select('*').in('group_id', ids);
  }
  vars = probe.data as Record<string, unknown>[] | null;
  vErr = probe.error;

  if (vErr) return { data: [], error: vErr.message };

  const variantRows = (Array.isArray(vars) ? vars : []) as Record<string, unknown>[];
  const gidKey = variantRows.length
    ? ['product_group_id', 'product_group_uuid', 'group_id', 'product_id'].find(
        (k) => k in (variantRows[0] ?? {})
      ) ?? 'product_group_id'
    : 'product_group_id';

  type Best = { price: number; sku: string };
  const bestByGroup = new Map<string, Best>();
  for (const row of variantRows) {
    const gid = String(row[gidKey] ?? '');
    if (!gid) continue;
    const p = variantPrice(row);
    if (!(p > 0)) continue;
    const rowSku = String(row.sku ?? '').trim();
    const prev = bestByGroup.get(gid);
    if (!prev || p < prev.price) {
      bestByGroup.set(gid, { price: p, sku: rowSku });
    } else if (prev && p === prev.price && !prev.sku && rowSku) {
      bestByGroup.set(gid, { price: p, sku: rowSku });
    }
  }

  const data: GroupsWithPrices[] = list.map((g) => {
    const b = bestByGroup.get(g.id);
    return {
      ...g,
      minPrice: b?.price ?? 0,
      minPriceSku: b?.sku ?? null,
    };
  });

  return { data, error: null };
}

/** Group product groups by `block_name`; stable key for empty/null names. */
export function groupCatalogByBlockName(groups: GroupsWithPrices[]): Map<string, GroupsWithPrices[]> {
  const m = new Map<string, GroupsWithPrices[]>();
  for (const g of groups) {
    const raw = (g.block_name ?? '').trim();
    const key = raw || '__misc__';
    const arr = m.get(key) ?? [];
    arr.push(g);
    m.set(key, arr);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ru'));
  }
  /** Sort blocks: misc last. */
  return new Map(
    [...m.entries()].sort(([ka], [kb]) => {
      if (ka === '__misc__') return 1;
      if (kb === '__misc__') return -1;
      return ka.localeCompare(kb, 'ru');
    })
  );
}

export function resolveCategoryIdFromSlug(
  categories: CategoryDbRow[],
  slug: string | null
): string | undefined {
  if (!slug?.trim()) return undefined;
  const s = slug.trim().toLowerCase();
  const bySlug = categories.find((c) => (c.slug ?? '').trim().toLowerCase() === s);
  if (bySlug) return bySlug.id;
  const byName = categories.find((c) => (c.name ?? '').trim().toLowerCase().replace(/\s+/g, '-') === s);
  return byName?.id;
}

/** One sellable SKU line from `product_variants` normalized for PDP. */
export type ProductVariantNormalized = {
  id: string;
  type: string;
  color_name: string;
  sku: string;
  price: number;
  stock: number;
};

/** Group row loaded for PDP (select * minus strict typing — common fields preserved). */
export type ProductDetailsGroup = ProductGroupDbRow &
  Partial<Record<string, unknown>> & { description?: string | null };

export type ProductImageRow = {
  url: string;
  sort_order: number | null;
};

function pickVariantType(row: Record<string, unknown>): string {
  const v = row.type ?? row.variant_type ?? row.profile_type ?? row.variant_kind;
  return String(v ?? '').trim();
}

function pickVariantColor(row: Record<string, unknown>): string {
  const v = row.color_name ?? row.color ?? row.color_label;
  const s = String(v ?? '').trim();
  return s || '—';
}

function pickVariantSku(row: Record<string, unknown>): string {
  return String(row.sku ?? '').trim();
}

function pickStock(row: Record<string, unknown>): number {
  const n = Number(row.stock ?? row.quantity_available ?? row.quantity ?? row.qty ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeProductVariantRows(rows: Record<string, unknown>[]): ProductVariantNormalized[] {
  return rows.map((raw) => ({
    id: String(raw.id ?? ''),
    type: pickVariantType(raw),
    color_name: pickVariantColor(raw),
    sku: pickVariantSku(raw) || '—',
    price: variantPrice(raw),
    stock: pickStock(raw),
  }));
}

/**
 * PDP: one `product_group` + its `product_variants` (FK `product_group_id` or `group_id`).
 */
export async function fetchProductDetails(groupId: string): Promise<{
  group: ProductDetailsGroup | null;
  variants: ProductVariantNormalized[];
  images: ProductImageRow[];
  error: string | null;
}> {
  const supabase = getSupabase();
  if (!supabase) return { group: null, variants: [], images: [], error: 'Supabase не настроен' };
  if (!groupId?.trim()) return { group: null, variants: [], images: [], error: 'Нет id товара' };

  const { data: grp, error: gErr } = await supabase.from('product_groups').select('*').eq('id', groupId.trim()).maybeSingle();

  if (gErr) return { group: null, variants: [], images: [], error: gErr.message };
  if (!grp || typeof grp !== 'object') return { group: null, variants: [], images: [], error: null };

  let probe = await supabase.from('product_variants').select('*').eq('product_group_id', groupId.trim());
  if (
    probe.error &&
    (probe.error.message.toLowerCase().includes('column') || probe.error.message.toLowerCase().includes('does not exist'))
  ) {
    probe = await supabase.from('product_variants').select('*').eq('group_id', groupId.trim());
  }

  const group = { ...(grp as Record<string, unknown>) } as ProductDetailsGroup;

  if (probe.error) {
    return { group, variants: [], images: [], error: probe.error.message };
  }

  const rawVars = (Array.isArray(probe.data) ? probe.data : []) as Record<string, unknown>[];
  const variants = normalizeProductVariantRows(rawVars);

  const { data: imagesRaw } = await supabase
    .from('product_images')
    .select('url, sort_order')
    .eq('product_group_id', groupId.trim())
    .order('sort_order');

  const images = (Array.isArray(imagesRaw) ? imagesRaw : []) as ProductImageRow[];

  return { group, variants: variants.filter((v) => v.id), images, error: null };
}
