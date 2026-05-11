/**
 * Vercel Serverless Function — Telegram notifications (Supabase Database Webhook target).
 * POST /api/telegram-webhook
 *
 * Set `TELEGRAM_BOT_TOKEN` in Vercel → Project → Settings → Environment Variables (never in client code).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

type SupabaseDbWebhookPayload = {
  type?: 'INSERT' | 'UPDATE' | 'DELETE';
  table?: string;
  schema?: string;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown>;
};

async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token?.trim()) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
  };

  if (!res.ok || data.ok === false) {
    throw new Error(
      `Telegram API error: ${res.status} ${data.description ?? res.statusText}`,
    );
  }
}

function pickChatId(record: Record<string, unknown> | undefined): string | null {
  if (!record) return null;
  const id = record.telegram_chat_id ?? record.chat_id;
  if (id == null || String(id).trim() === '') return null;
  return String(id).trim();
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/**
 * Placeholder routing — adjust `table`, column names, and status transitions to match your schema.
 */
async function handleSupabasePayload(
  payload: SupabaseDbWebhookPayload,
): Promise<{ sent: boolean; reason: string }> {
  const { type, table, record, old_record } = payload;
  const chatId = pickChatId(record);
  if (!chatId) {
    return { sent: false, reason: 'missing telegram_chat_id (or chat_id) on record' };
  }

  // --- Order completed → confirmation (example: orders / order headers) ---
  const status = record?.status;
  if (
    (table === 'orders' || table === 'customer_orders') &&
    typeof status === 'string' &&
    status === 'completed'
  ) {
    await sendTelegramMessage(chatId, '✅ Sizning buyurtmangiz tasdiqlandi!');
    return { sent: true, reason: 'order completed' };
  }

  // --- Points / balance increased (example: loyalty_points, customers profile) ---
  if (
    type === 'UPDATE' &&
    (table === 'customers' ||
      table === 'loyalty_points' ||
      table === 'bonus_balances')
  ) {
    const newBal =
      num(record?.points_balance) ??
      num(record?.bonus_points) ??
      num(record?.balance);
    const oldBal =
      num(old_record?.points_balance) ??
      num(old_record?.bonus_points) ??
      num(old_record?.balance);
    if (newBal != null && oldBal != null && newBal > oldBal) {
      await sendTelegramMessage(chatId, '💰 Sizga bonus ballar taqdim etildi!');
      return { sent: true, reason: 'balance increased' };
    }
  }

  return { sent: false, reason: 'no matching rule' };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    const payload = body as SupabaseDbWebhookPayload;

    const result = await handleSupabasePayload(payload);

    /**
     * Always 200 OK so Supabase webhook does not endlessly retry on "unknown row" skips.
     * Inspect `sent` / `reason` in Vercel logs for debugging.
     */
    res.status(200).json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('telegram-webhook:', message);
    res.status(200).json({
      ok: true,
      sent: false,
      reason: 'handler error',
      error: message,
    });
  }
}
