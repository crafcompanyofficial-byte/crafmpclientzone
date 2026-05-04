import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { UZBEKISTAN_REGIONS } from '../shared/data/uzbekistanRegions';
import { getSupabase, isSupabaseConfigured } from '../shared/api/supabase';
import { DS_FONT_ONEST, DS_SEARCH_INPUT, DS_TACTILE } from '../shared/ui/designTokens';
import { normalizeCustomerRow, useUserStore } from '../shared/store/useUserStore';

const LIST_ROW = `${DS_TACTILE} flex w-full min-w-0 items-center justify-between border-b border-gray-100 py-4 text-left font-['Onest'] text-[16px] font-medium text-[#1A1A1A] active:bg-gray-50 disabled:pointer-events-none disabled:opacity-60`;

export function MapSelection() {
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredRegions = useMemo(() => {
    if (!normalizedQuery) return [...UZBEKISTAN_REGIONS];
    return UZBEKISTAN_REGIONS.filter((r) => r.name.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery]);

  const regionCities = useMemo(() => {
    if (!selectedRegion) return [];
    const rec = UZBEKISTAN_REGIONS.find((r) => r.name === selectedRegion);
    if (!rec) return [];
    if (!normalizedQuery) return [...rec.cities];
    return rec.cities.filter((c) => c.toLowerCase().includes(normalizedQuery));
  }, [selectedRegion, normalizedQuery]);

  const onSelectCity = async (city: string) => {
    if (!user?.id || !selectedRegion) return;
    const next = { ...user, region: selectedRegion, city };
    setSaving(true);

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('customers')
          .update({ region: selectedRegion, city })
          .eq('id', user.id);
        if (error) {
          toast.error(error.message);
          setSaving(false);
          return;
        }
        const { data } = await supabase.from('customers').select('*').eq('id', user.id).single();
        if (data && typeof data === 'object') {
          setUser(normalizeCustomerRow(data as Record<string, unknown>));
        } else {
          setUser(next);
        }
      } else {
        setUser(next);
      }
    } else {
      setUser(next);
    }

    setSaving(false);
    toast.success('Joylashuv yangilandi');
    navigate(-1);
  };

  const pageTitle = selectedRegion ? 'Tanlash' : 'Tanlang';
  const subtitle = selectedRegion ? selectedRegion : 'Viloyat tanlang';

  return (
    <div
      className={`flex min-h-0 w-full max-w-full flex-1 flex-col overflow-x-hidden pt-[var(--app-header-offset)] ${DS_FONT_ONEST}`}
    >
      <div className="w-full shrink-0 border-b border-gray-100 px-[16px] py-4">
        <h1 className="truncate text-[18px] font-semibold text-[#1A1A1A]">{pageTitle}</h1>
        <p className="mt-0.5 truncate text-[14px] font-medium text-[#565656]">{subtitle}</p>
      </div>

      <div className="w-full shrink-0 px-[16px] pb-3 pt-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={selectedRegion ? 'Shahar qidirish…' : 'Viloyat qidirish…'}
          autoComplete="off"
          disabled={saving}
          className={DS_SEARCH_INPUT}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-[16px] pb-10">
        {!selectedRegion &&
          filteredRegions.map((r) => (
            <button
              key={r.name}
              type="button"
              disabled={saving}
              onClick={() => {
                setSelectedRegion(r.name);
                setSearchQuery('');
              }}
              className={LIST_ROW}
            >
              <span className="truncate pr-2">{r.name}</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#B0B0B0]" aria-hidden />
            </button>
          ))}

        {selectedRegion &&
          regionCities.map((city) => (
            <button
              key={city}
              type="button"
              disabled={saving}
              onClick={() => void onSelectCity(city)}
              className={LIST_ROW}
            >
              <span className="truncate pr-2">{city}</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#B0B0B0]" aria-hidden />
            </button>
          ))}

        {!selectedRegion && filteredRegions.length === 0 ? (
          <p className="py-8 text-center text-[14px] font-medium text-[#565656]">Natija topilmadi</p>
        ) : null}
        {selectedRegion && regionCities.length === 0 ? (
          <p className="py-8 text-center text-[14px] font-medium text-[#565656]">Natija topilmadi</p>
        ) : null}
      </div>
    </div>
  );
}
