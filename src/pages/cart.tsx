import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Minus, Package, Plus, X } from 'lucide-react';
import { getSupabase } from '../shared/api/supabase';
import { useCartStore } from '../shared/store/useCartStore';
import { useUserStore } from '../shared/store/useUserStore';
import { DS_BTN_PRIMARY, DS_INPUT, DS_TACTILE } from '../shared/ui/designTokens';

export type OrderPeriod = 'week' | 'month' | 'custom';

const periodFilters: { id: OrderPeriod; label: string }[] = [
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'custom', label: 'Период' },
];

function localDayString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function orderMatchesPeriod(
  createdAt: string,
  period: OrderPeriod,
  fromDate: string,
  toDate: string
): boolean {
  const orderDate = new Date(createdAt);
  if (Number.isNaN(orderDate.getTime())) return false;

  if (period === 'custom') {
    if (!fromDate.trim() || !toDate.trim()) return true;
    const od = localDayString(orderDate);
    return od >= fromDate && od <= toDate;
  }

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOrder = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()).getTime();
  const diffMs = startToday - startOrder;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 0) return false;
  if (period === 'week') return diffDays < 7;
  if (period === 'month') return diffDays < 30;
  return true;
}

type OrderItemRow = { quantity?: number | null };

type OrderRow = {
  id: string;
  order_code?: string | null;
  created_at: string;
  status?: string | null;
  total_amount?: number | null;
  order_items?: OrderItemRow[] | null;
};

function formatVariant(v: string | null) {
  if (!v) return null;
  return `Tur: ${v}`;
}

export function Cart() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const cartItems = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = useCartStore((s) => s.subtotal());

  const user = useUserStore((s) => s.user);
  const customerId = user?.id ?? null;

  const { loyaltyDiscountRate, loyaltyDiscountPercent } = useMemo(() => {
    const level = user?.level;
    const rate = level === 'gold' ? 0.1 : level === 'silver' ? 0.05 : 0;
    return { loyaltyDiscountRate: rate, loyaltyDiscountPercent: Math.round(rate * 100) };
  }, [user?.level]);

  const [activeTab, setActiveTab] = useState<'cart' | 'history'>('cart');
  const [selectedPeriod, setSelectedPeriod] = useState<OrderPeriod>('week');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [historyOrders, setHistoryOrders] = useState<OrderRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (tabParam === 'history') setActiveTab('history');
    else setActiveTab('cart');
  }, [tabParam]);

  const loadHistory = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !customerId) {
      setHistoryOrders([]);
      setHistoryError(!customerId ? "Mijoz ma'lumotlari topilmadi" : 'Supabase sozlanmagan');
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product_variants (
            *,
            product_groups (*)
          )
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setHistoryLoading(false);
    if (error) {
      setHistoryError(error.message);
      setHistoryOrders([]);
      return;
    }
    setHistoryOrders((Array.isArray(data) ? data : []) as OrderRow[]);
  }, [customerId]);

  useEffect(() => {
    if (activeTab !== 'history') return;
    void loadHistory();
  }, [activeTab, loadHistory]);

  const filteredOrders = useMemo(
    () =>
      historyOrders.filter((o) =>
        orderMatchesPeriod(o.created_at, selectedPeriod, fromDate, toDate)
      ),
    [historyOrders, selectedPeriod, fromDate, toDate]
  );

  const discount = subtotal * loyaltyDiscountRate;
  const total = subtotal - discount;
  const cartTotal = Math.round(total);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    const supabase = getSupabase();
    if (!supabase) {
      toast.error('Supabase sozlanmagan');
      return;
    }
    if (!customerId) {
      toast.error("Mijoz ma'lumotlari topilmadi — qaytadan kiriting");
      return;
    }

    setCheckoutLoading(true);
    const { data: newOrder, error: orderErr } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        total_amount: cartTotal,
        status: 'pending',
      })
      .select('id')
      .single();

    if (orderErr || !newOrder) {
      toast.error(orderErr?.message ?? "Buyurtmani yaratib bo'lmadi");
      setCheckoutLoading(false);
      return;
    }

    const { error: itemsErr } = await supabase.from('order_items').insert(
      cartItems.map((item) => ({
        order_id: newOrder.id,
        product_variant_id: item.variantId,
        quantity: item.quantity,
        price: item.price,
      }))
    );

    if (itemsErr) {
      toast.error(itemsErr.message);
      setCheckoutLoading(false);
      return;
    }

    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('medium');
    clearCart();
    setCheckoutLoading(false);
    setActiveTab('history');
    navigate('/cart?tab=history', { replace: true });
    void loadHistory();
  };

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#F5F5F5] pt-[60px]">
      <div className="sticky top-[60px] z-40 bg-[#F5F5F5]">
        <div className="w-full max-w-[700px] px-[16px] pt-3 pb-0">
          <div className="mb-[20px] flex w-full rounded-[14px] bg-[#EAEAEA] p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('cart');
                navigate('/cart', { replace: true });
              }}
              className={`${DS_TACTILE} flex-1 rounded-[10px] py-2 font-['Onest'] text-[14px] ${
                activeTab === 'cart'
                  ? 'bg-white font-bold text-[#1A1A1A] shadow-sm'
                  : 'font-medium text-[#A1A1A1]'
              }`}
            >
              Savat
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('history');
                navigate('/cart?tab=history', { replace: true });
              }}
              className={`${DS_TACTILE} flex-1 rounded-[10px] py-2 font-['Onest'] text-[14px] ${
                activeTab === 'history'
                  ? 'bg-white font-bold text-[#1A1A1A] shadow-sm'
                  : 'font-medium text-[#A1A1A1]'
              }`}
            >
              Buyurtmalar tarixi
            </button>
          </div>
        </div>
      </div>

      <div
        className={`w-full max-w-[700px] px-[16px] pb-32 ${activeTab === 'history' ? 'pt-0' : 'pt-4'}`}
      >
        {activeTab === 'cart' && (
          <div>
            {cartItems.length === 0 ? (
              <div className="mt-12 flex flex-col items-center justify-center">
                <img
                  src="/empty-cart.png"
                  alt="Empty"
                  className="mb-6 w-[180px] object-contain sm:w-[220px]"
                />
                <p className="font-['Onest'] text-[15px] font-bold text-[#2E2E2E]">
                  Savatingiz bo&apos;sh
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cartItems.map((item) => {
                    const typeLabel = formatVariant(item.type?.trim() || null);
                    return (
                    <div
                      key={item.variantId}
                      className={`${DS_TACTILE} flex gap-3 rounded-craf-card bg-white p-4 shadow-craf`}
                    >
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F5F5F5]">
                        {item.image?.trim() ?
                          <img
                            src={item.image.trim()}
                            alt=""
                            className="h-full w-full object-cover"
                            draggable={false}
                          />
                        : <Package className="h-8 w-8 text-[#999]" strokeWidth={1.5} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 font-['Onest'] text-[12px] text-[#A1A1A1]">{item.sku}</div>
                        <h3 className="mb-1 line-clamp-2 font-['Onest'] text-[clamp(14px,3.5vw,16px)] font-semibold text-[#1A1A1A]">
                          {item.name}
                        </h3>
                        <div className="mb-2 space-y-0.5 font-['Onest'] text-[12px] text-[#565656]">
                          {typeLabel ? <div>{typeLabel}</div> : null}
                          <div>Rang: {item.color}</div>
                        </div>
                        <div className="font-['Onest'] text-[clamp(16px,4vw,20px)] font-bold text-[#1A1A1A]">
                          {`$ ${item.price.toLocaleString('ru-RU')}`}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end justify-between">
                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          className="text-[#999] transition-colors hover:text-[#E54B4B]"
                          aria-label="O'chirish"
                        >
                          <X className="h-5 w-5" strokeWidth={2} />
                        </button>

                        <div className="flex items-center gap-2 rounded-full bg-[#F5F5F5] px-3 py-1.5">
                          <button
                            type="button"
                            onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                            className="flex h-5 w-5 items-center justify-center text-[#666]"
                          >
                            <Minus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                          <span className="min-w-[16px] text-center font-['Onest'] text-[14px] font-bold text-[#1A1A1A]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                            className="flex h-5 w-5 items-center justify-center text-[#666]"
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>

                <div className="rounded-craf-card bg-white p-5 shadow-craf">
                  <h3 className="mb-4 font-['Onest'] text-[clamp(16px,4vw,20px)] font-bold text-[#1A1A1A]">Jami</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between font-['Onest'] text-[14px]">
                      <span className="text-[#565656]">Oraliq jami</span>
                      <span className="font-semibold text-[#1A1A1A]">
                        {`$ ${subtotal.toLocaleString('ru-RU')}`}
                      </span>
                    </div>
                    {loyaltyDiscountRate > 0 ?
                      <div className="flex justify-between font-['Onest'] text-[14px]">
                        <span className="text-[#565656]">{`Chegirma (${loyaltyDiscountPercent}%)`}</span>
                        <span className="font-semibold text-green-600">
                          {`-$ ${discount.toLocaleString('ru-RU')}`}
                        </span>
                      </div>
                    : null}
                    <div className="h-px bg-black/10" />
                    <div className="flex justify-between">
                      <span className="font-['Onest'] text-[clamp(16px,4vw,20px)] font-bold text-[#1A1A1A]">Jami</span>
                      <span className="font-['Onest'] text-[clamp(16px,4vw,20px)] font-bold text-[#1A1A1A]">
                        {`$ ${cartTotal.toLocaleString('ru-RU')}`}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <>
            <div className="mb-6">
              <div className="w-full flex justify-start gap-2">
                {periodFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setSelectedPeriod(filter.id)}
                    className={`${DS_TACTILE} rounded-[13px] px-4 py-2 font-['Onest'] text-[14px] ${
                      selectedPeriod === filter.id
                        ? 'bg-[#E54B4B] font-bold text-white'
                        : 'bg-[#DEDEDE] font-medium text-[#666666]'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {selectedPeriod === 'custom' && (
                <div className="flex w-full flex-wrap justify-start gap-4">
                  <label className="flex min-w-0 flex-col gap-1 font-['Onest'] text-[14px] font-medium text-[#565656]">
                    Dan
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={DS_INPUT} />
                  </label>
                  <label className="flex min-w-0 flex-col gap-1 font-['Onest'] text-[14px] font-medium text-[#565656]">
                    Gacha
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={DS_INPUT} />
                  </label>
                </div>
              )}
            </div>

            {historyError && (
              <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 font-['Onest'] text-[14px] text-amber-800">
                {historyError}
              </p>
            )}

            <div className="space-y-3">
              {historyLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-9 w-9 animate-spin text-[#E54B4B]" aria-hidden />
                </div>
              ) : historyOrders.length === 0 ? (
                <div className="mt-12 flex flex-col items-center justify-center">
                  <img
                    src="/empty-history.png"
                    alt="Empty"
                    className="mb-6 w-[180px] object-contain sm:w-[220px]"
                  />
                  <p className="font-['Onest'] text-[15px] font-bold text-[#2E2E2E]">
                    Tarixingiz bo&apos;sh
                  </p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <p className="py-8 text-center font-['Onest'] text-[14px] text-[#A1A1A1]">
                  Tanlangan davrda buyurtmalar yo&apos;q
                </p>
              ) : (
                filteredOrders.map((order) => {
                  const totalAmt = Math.round(Number(order.total_amount ?? 0));
                  const orderTitle = `ORD-${String(order.id).split('-')[0]?.toUpperCase() ?? ''}`;
                  return (
                    <div
                      key={order.id}
                      className={`${DS_TACTILE} mb-3 rounded-[20px] bg-white p-[16px]`}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h3 className="font-['Onest'] text-[clamp(14px,3.5vw,16px)] font-bold text-[#1A1A1A]">
                            {orderTitle}
                          </h3>
                          <p className="mt-1 font-['Onest'] text-[12px] text-[#A1A1A1]">
                            {new Date(order.created_at).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>

                        <span className="rounded-full bg-[#FDF3D0] px-3 py-1 font-['Onest'] text-[12px] font-medium text-[#B0891D]">
                          {order.status === 'pending' ? 'Jarayonda' : (order.status ?? '')}
                        </span>
                      </div>
                      <div className="my-3 border-t border-gray-100" />
                      <div className="flex items-center justify-between">
                        <span className="font-['Onest'] text-[14px] text-[#565656]">
                          {order.order_items?.length || 0} ta mahsulot
                        </span>
                        <span className="font-['Onest'] text-[clamp(16px,4vw,20px)] font-bold text-[#1A1A1A]">
                          $ {totalAmt.toLocaleString('ru-RU')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {activeTab === 'cart' && cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/10 bg-white px-[16px] py-4">
          <div className="w-full max-w-[700px]">
            <button
              type="button"
              disabled={checkoutLoading}
              onClick={() => void handleCheckout()}
              className={`${DS_BTN_PRIMARY} text-[clamp(14px,3.5vw,18px)] disabled:pointer-events-none disabled:opacity-50`}
            >
              {checkoutLoading ? 'Yuborilmoqda…' : 'Buyurtma berish'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
