/**
 * Supabase Edge Function: Telegram outbound notifications (Deno).
 *
 * Trigger: HTTP POST from Supabase Database Webhooks on `orders` / `customers` updates.
 *
 * Secrets (Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
 * - `TELEGRAM_BOT_TOKEN`
 * - `SUPABASE_URL` (usually auto-provided)
 * - `SUPABASE_SERVICE_ROLE_KEY` (usually auto-provided)
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const TG_API = "https://api.telegram.org";

type DbWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown>;
};

type HandlerResult =
  | { action: "send"; chatId: string; text: string }
  | { action: "skip"; reason: string }
  | { action: "error"; message: string; status?: number };

function normStatus(s: unknown): string {
  return String(s ?? "").trim();
}

function isConfirmedStatus(status: unknown): boolean {
  const v = normStatus(status);
  return v === "confirmed" || v === "completed" || v === "Tasdiqlangan";
}

function isCancelledStatus(status: unknown): boolean {
  const v = normStatus(status);
  return v === "cancelled" || v === "Bekor qilingan";
}

async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token?.trim()) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set — add it via Supabase Secrets");
  }

  const url = `${TG_API}/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json().catch(() => ({})) as {
    ok?: boolean;
    description?: string;
  };

  if (!res.ok || data.ok === false) {
    throw new Error(
      `Telegram sendMessage failed: ${res.status} ${data.description ?? res.statusText}`,
    );
  }
}

async function handleOrdersUpdate(
  payload: DbWebhookPayload,
  supabase: SupabaseClient,
): Promise<HandlerResult> {
  const record = payload.record;
  const oldRecord = payload.old_record;
  if (!record || !oldRecord) {
    return { action: "skip", reason: "orders UPDATE missing record or old_record" };
  }

  const newStatus = record.status;
  const oldStatus = oldRecord.status;

  const toConfirmed =
    isConfirmedStatus(newStatus) && !isConfirmedStatus(oldStatus);
  const toCancelled =
    isCancelledStatus(newStatus) && !isCancelledStatus(oldStatus);

  if (!toConfirmed && !toCancelled) {
    return {
      action: "skip",
      reason: "orders status change does not match confirmed/cancelled transition",
    };
  }

  const customerId = record.customer_id;
  if (customerId == null || String(customerId).trim() === "") {
    return { action: "skip", reason: "orders row missing customer_id" };
  }

  const orderId = record.id;
  if (orderId == null || String(orderId).trim() === "") {
    return { action: "skip", reason: "orders row missing id" };
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .select("telegram_id")
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    return {
      action: "error",
      message: `customers lookup failed: ${error.message}`,
    };
  }

  const telegramId = customer?.telegram_id;
  if (telegramId == null || telegramId === "") {
    return { action: "skip", reason: "customer has no telegram_id" };
  }

  const shortId = String(orderId).slice(0, 8).toUpperCase();
  const text = toConfirmed
    ? `✅ Sizning buyurtmangiz (#${shortId}) tasdiqlandi va ishlashga o'tdi!`
    : `❌ Sizning buyurtmangiz (#${shortId}) bekor qilindi.`;

  return { action: "send", chatId: String(telegramId), text };
}

function handleCustomersUpdate(payload: DbWebhookPayload): HandlerResult {
  const record = payload.record;
  const oldRecord = payload.old_record;
  if (!record || !oldRecord) {
    return { action: "skip", reason: "customers UPDATE missing record or old_record" };
  }

  if (record.level === oldRecord.level) {
    return { action: "skip", reason: "level unchanged" };
  }

  const telegramId = record.telegram_id;
  if (telegramId == null || telegramId === "") {
    return { action: "skip", reason: "customer has no telegram_id" };
  }

  const levelUpper = String(record.level ?? "").toUpperCase();
  const text =
    `🎉 Tabriklaymiz! Sizning yangi reytingingiz: ${levelUpper}`;

  return { action: "send", chatId: String(telegramId), text };
}

async function routeWebhook(
  payload: DbWebhookPayload,
  supabase: SupabaseClient,
): Promise<HandlerResult> {
  const op = String(payload.type ?? "").toUpperCase();
  if (payload.table === "orders" && op === "UPDATE") {
    return handleOrdersUpdate(payload, supabase);
  }
  if (payload.table === "customers" && op === "UPDATE") {
    return handleCustomersUpdate(payload);
  }
  return { action: "skip", reason: "unsupported table or operation" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  let payload: DbWebhookPayload;
  try {
    const body = await req.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "Invalid JSON body: expected an object" }, 400);
    }
    payload = body as DbWebhookPayload;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) {
    return json(
      {
        error:
          "Server misconfigured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing",
      },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const result = await routeWebhook(payload, supabase);

    if (result.action === "skip") {
      return json({ ok: true, skipped: true, reason: result.reason }, 200);
    }

    if (result.action === "error") {
      const status = result.status ?? 500;
      return json({ ok: false, error: result.message }, status);
    }

    await sendTelegramMessage(result.chatId, result.text);
    return json({ ok: true, sent_to: result.chatId }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("telegram-bot error:", message);
    return json({ ok: false, error: message }, 500);
  }
});

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}
