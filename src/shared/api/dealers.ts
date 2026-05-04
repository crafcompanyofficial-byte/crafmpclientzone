import { getSupabase } from './supabase';

export type DealerRow = {
  id: string;
  name: string;
  company: string | null;
  region_id: string | null;
  territory: unknown;
  status: string;
};

export type RegionRow = {
  id: string;
  name: string | null;
  /** JSONB e.g. `{ "lat": 41.2995, "lng": 69.2401 }` */
  coordinates?: unknown;
  lat?: number | null;
  lng?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type DealerMapPoint = DealerRow & {
  lat: number;
  lng: number;
  addressLabel: string;
};

function toFiniteNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Raw JSON `[lat, lng]` (two numbers). */
export function parseFlatCoordinateArray(val: unknown): [number, number] | null {
  if (!Array.isArray(val) || val.length !== 2) return null;
  const lat = Number(val[0]);
  const lng = Number(val[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

/**
 * Parse `{ lat, lng }` / `{ latitude, longitude }` from JSONB or plain objects.
 * Returns **[latitude, longitude]** for Yandex Placemark, or `null`.
 */
export function parseLatLngPair(source: unknown): [number, number] | null {
  const asArr = parseFlatCoordinateArray(source);
  if (asArr) return asArr;
  if (source === null || source === undefined || typeof source !== 'object') return null;
  const o = source as Record<string, unknown>;

  const latRaw = o.lat ?? o.latitude;
  const lngRaw = o.lng ?? o.longitude;
  const lat = toFiniteNumber(latRaw);
  const lng = toFiniteNumber(lngRaw);
  if (lat !== null && lng !== null) return [lat, lng];

  return null;
}

/**
 * Parse coordinates from `territory` JSONB and/or linked `regions` row.
 * Always returns **[latitude, longitude]** or `null`.
 */
export function extractDealerCoordinates(
  territory: unknown,
  region: RegionRow | null | undefined
): [number, number] | null {
  const territoryAsPair = parseFlatCoordinateArray(territory);
  if (territoryAsPair) return territoryAsPair;

  if (territory && typeof territory === 'object') {
    const t = territory as Record<string, unknown>;

    if (t.type === 'Point' && Array.isArray(t.coordinates)) {
      const coords = t.coordinates as unknown[];
      if (coords.length >= 2) {
        const lon = toFiniteNumber(coords[0]);
        const lat = toFiniteNumber(coords[1]);
        if (lat !== null && lon !== null) return [lat, lon];
      }
    }

    const direct = parseLatLngPair(territory);
    if (direct) return direct;

    const fromCenter = parseLatLngPair(t.center);
    if (fromCenter) return fromCenter;
  }

  if (region) {
    const coordsRaw = region.coordinates;
    const fromRegionArray = parseFlatCoordinateArray(coordsRaw);
    if (fromRegionArray) return fromRegionArray;
    const fromRegionJson = parseLatLngPair(coordsRaw);
    if (fromRegionJson) return fromRegionJson;

    const rlat = toFiniteNumber(region.lat ?? region.latitude);
    const rlng = toFiniteNumber(region.lng ?? region.longitude);
    if (rlat !== null && rlng !== null) return [rlat, rlng];
  }

  return null;
}

/** True only for a Yandex-ready `[lat, lng]` pair. */
export function isValidYandexPlacemarkPair(value: unknown): value is [number, number] {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const [a, b] = value;
  return typeof a === 'number' && typeof b === 'number' && Number.isFinite(a) && Number.isFinite(b);
}

export async function fetchActiveDealers(): Promise<{ data: DealerMapPoint[]; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: [], error: 'Supabase не настроен (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)' };
  }

  const { data: rows, error } = await supabase
    .from('dealers')
    .select('id, name, company, region_id, territory, status')
    .eq('status', 'active');

  if (error) {
    return { data: [], error: error.message };
  }

  const dealers = (rows ?? []) as DealerRow[];
  const regionIds = [...new Set(dealers.map((d) => d.region_id).filter((id) => id != null && id !== ''))] as string[];

  let regionsById = new Map<string, RegionRow>();
  if (regionIds.length > 0) {
    const { data: regions, error: regErr } = await supabase.from('regions').select('*').in('id', regionIds);

    if (!regErr && regions) {
      regionsById = new Map(
        (regions as Record<string, unknown>[]).map((raw) => {
          const id = String(raw.id ?? '');
          const name = (raw.name as string) ?? null;
          const coordinates = raw.coordinates;

          const fromCoords = parseFlatCoordinateArray(coordinates) ?? parseLatLngPair(coordinates);
          const lat =
            fromCoords?.[0] ??
            toFiniteNumber(raw.lat) ??
            toFiniteNumber(raw.latitude) ??
            toFiniteNumber(raw.center_lat) ??
            (typeof raw.center === 'object' && raw.center !== null
              ? toFiniteNumber((raw.center as Record<string, unknown>).lat)
              : null);
          const lng =
            fromCoords?.[1] ??
            toFiniteNumber(raw.lng) ??
            toFiniteNumber(raw.longitude) ??
            toFiniteNumber(raw.center_lng) ??
            (typeof raw.center === 'object' && raw.center !== null
              ? toFiniteNumber((raw.center as Record<string, unknown>).lng)
              : null);

          const row: RegionRow = {
            id,
            name,
            coordinates,
            lat,
            lng,
            latitude: lat,
            longitude: lng,
          };
          return [id, row];
        })
      );
    }
  }

  const out: DealerMapPoint[] = [];
  for (const d of dealers) {
    const regionKey = d.region_id != null && d.region_id !== '' ? String(d.region_id) : '';
    const region = regionKey ? regionsById.get(regionKey) : undefined;
    const coords = extractDealerCoordinates(d.territory, region);

    if (!coords || !isValidYandexPlacemarkPair(coords)) {
      console.warn('[dealers] skip dealer — invalid or missing coordinates', {
        dealerId: d.id,
        name: d.name,
        region_id: d.region_id,
        territory: d.territory,
        regionCoordinates: region?.coordinates,
        parsed: coords,
      });
      continue;
    }

    const [lat, lng] = coords;
    const addressLabel =
      (typeof d.territory === 'object' &&
        d.territory &&
        typeof (d.territory as { label?: string }).label === 'string' &&
        (d.territory as { label: string }).label) ||
      region?.name ||
      d.company ||
      d.name;

    out.push({
      ...d,
      lat,
      lng,
      addressLabel,
    });
  }

  return { data: out, error: null };
}

/** Yandex Geocoder 1.x — moves map to city/region. Returns [lat, lng]. */
export async function geocodeYandex(query: string, apiKey: string): Promise<[number, number] | null> {
  if (!query.trim()) return null;
  const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${encodeURIComponent(apiKey)}&format=json&geocode=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as {
    response?: { GeoObjectCollection?: { featureMember?: { GeoObject?: { Point?: { pos?: string } } }[] } };
  };
  const pos = json.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
  if (!pos || typeof pos !== 'string') return null;
  const parts = pos.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const lon = Number(parts[0]);
  const lat = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return [lat, lon];
}
