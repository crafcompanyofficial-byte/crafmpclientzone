import { getSupabase } from './supabase';

/** Matches the `banners` table schema (`link_url`; legacy `link` accepted when normalizing rows). */
export interface Banner {
  id: string;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function bannerDomKey(banner: Banner, index: number): string {
  if (banner.id) return banner.id;
  return `banner-${index}`;
}

function normalizeBannerRow(row: unknown): Banner | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = String(r.id ?? '').trim();
  const image_url = typeof r.image_url === 'string' ? r.image_url.trim() : '';
  if (!id || !image_url) return null;

  const rawLink = r.link_url ?? r.link;
  let link_url: string | null = null;
  if (typeof rawLink === 'string') {
    const t = rawLink.trim();
    link_url = t === '' ? null : t;
  } else if (rawLink !== null && rawLink !== undefined) {
    link_url = String(rawLink).trim() || null;
  }

  return {
    id,
    image_url,
    link_url,
    is_active: Boolean(r.is_active),
    sort_order: num(r.sort_order, 0),
  };
}

export async function fetchActiveBanners(): Promise<{ data: Banner[]; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: [], error: 'Supabase sozlanmagan' };
  }

  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  const rows = Array.isArray(data) ? data : [];
  const banners: Banner[] = [];
  for (const row of rows) {
    const b = normalizeBannerRow(row);
    if (b) banners.push(b);
  }

  return { data: banners, error: null };
}
