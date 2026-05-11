import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { getSupabase, isSupabaseConfigured } from '../shared/api/supabase';
import { useUserStore } from '../shared/store/useUserStore';
import { formatLoyaltyPoints } from '../shared/lib/formatLoyaltyPoints';
import { DS_FONT_ONEST, DS_TEXT_MAIN, DS_TEXT_SECONDARY } from '../shared/ui/designTokens';

type OrderPtsRow = {
  id: string;
  total_amount?: number | null;
  confirmed_at?: string | null;
  created_at?: string | null;
};

function orderShortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function thirtyDaysAgoIso(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

function orderTimestamp(row: OrderPtsRow): string | null {
  return row.confirmed_at?.trim()
    ? row.confirmed_at
    : row.created_at?.trim()
      ? row.created_at
      : null;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
}

export function PointsHistory() {
  const user = useUserStore((s) => s.user);

  const [orders, setOrders] = useState<OrderPtsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured()) {
      setOrders([]);
      setLoading(false);
      setError(null);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const since = thirtyDaysAgoIso();
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('id, total_amount, confirmed_at, created_at')
      .eq('customer_id', user.id)
      .in('status', ['confirmed', 'completed', 'Tasdiqlangan']);

    if (fetchError) {
      setError(fetchError.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    const list = (Array.isArray(data) ? data : []) as OrderPtsRow[];
    const cutoff = since.getTime();

    const filtered = list
      .filter((row) => {
        const ts = orderTimestamp(row);
        if (!ts) return false;
        const t = new Date(ts).getTime();
        return !Number.isNaN(t) && t >= cutoff;
      })
      .sort((a, b) => {
        const ta = new Date(orderTimestamp(a) ?? 0).getTime();
        const tb = new Date(orderTimestamp(b) ?? 0).getTime();
        return tb - ta;
      });

    setOrders(filtered);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <div
      className={`relative mx-auto flex min-h-screen w-full max-w-[700px] flex-col overflow-x-hidden bg-[#F5F5F5] pb-10 pt-[var(--app-header-offset)] ${DS_FONT_ONEST}`}
    >
      <header className="w-full shrink-0 px-[16px] pb-3 pt-2">
        <h1 className="truncate text-center text-[18px] font-semibold leading-tight text-[#1A1A1A] font-['Onest']">
          Ballar tarixi
        </h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-[16px]">
        <LoyaltyCard clickable={false} />

        <div className="mb-[23px] rounded-[25px] bg-white p-[20px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)]">
          <h2 className={`mb-3 ${DS_TEXT_MAIN} text-[18px] font-semibold`}>Shartlar</h2>
          <p className={DS_TEXT_SECONDARY}>
            Sizning haridingizdan 1% keshbek ball sifatida qaytadi. 1 ball = 10$.
          </p>
        </div>

        <h2 className="mb-[16px] font-['Onest'] text-[18px] font-semibold text-[#1A1A1A]">Oylik tarix</h2>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#E54B4B]" aria-hidden />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-[14px] text-[#666666]">{error}</p>
        ) : orders.length === 0 ? (
          <p className="py-8 text-center text-[14px] font-medium text-[#999999]">
            So‘nggi 30 kunda tasdiqlangan buyurtma topilmadi
          </p>
        ) : (
          orders.map((order) => {
            const pts = Number(order.total_amount ?? 0) / 10;
            const ptsLabel = formatLoyaltyPoints(pts);
            const ts = orderTimestamp(order) ?? '';
            return (
              <div
                key={order.id}
                className="mb-[12px] flex items-center justify-between rounded-[20px] bg-white p-[16px] shadow-sm"
              >
                <div className="min-w-0 pr-3 font-['Onest']">
                  <p className="text-[14px] font-medium leading-tight text-[#666666]">
                    {orderShortId(order.id)}
                  </p>
                  <p className="text-[14px] leading-tight text-[#666666]">{shortDate(ts)}</p>
                </div>
                <span className="shrink-0 text-[16px] font-semibold text-[#4CAF50] font-['Onest'] whitespace-nowrap">
                  +{ptsLabel} ball
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
