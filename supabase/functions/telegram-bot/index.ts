/**
 * Supabase Edge Function: Telegram outbound notifications (Deno).
 *
 * Trigger via HTTP POST (e.g. Supabase Database Webhooks pointing at this function URL).
 *
 * SECURITY — never commit secrets:
 * - `TELEGRAM_BOT_TOKEN` must be set in Supabase Dashboard → Project Settings → Edge Functions → Secrets,
 *   or via CLI: `supabase secrets set TELEGRAM_BOT_TOKEN=your_bot_token`
 * - Do NOT put the token in frontend code or in this repo.
 */

const TG_API = "https://api.telegram.org";

type DbWebhookPayload = {
  type?: "INSERT" | "UPDATE" | "DELETE";
  schema?: string;
  table?: string;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown>;
};

/** Optional explicit discriminator your DB trigger/webhook payload can send. */
type NotificationPayload = DbWebhookPayload & {
  notification_type?:
    | "order_confirmation"
    | "points_credited"
    | "level_up";
  /** Target Telegram chat — set from webhook / trigger payload. */
  chat_id?: string;
  telegram_chat_id?: string;
};

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

function pickChatId(payload: NotificationPayload): string | null {
  const direct = payload.chat_id ?? payload.telegram_chat_id;
  if (direct != null && String(direct).trim() !== "") {
    return String(direct).trim();
  }
  const fromRecord = payload.record?.telegram_chat_id ??
    payload.record?.chat_id;
  if (fromRecord != null && String(fromRecord).trim() !== "") {
    return String(fromRecord).trim();
  }
  return null;
}

/**
 * Placeholder routing: map webhook / trigger payloads to message text.
 * Replace with real copy, i18n, and DB fields once your schema is final.
 */
function resolveNotification(
  payload: NotificationPayload,
): { chatId: string; text: string } | null {
  const chatId = pickChatId(payload);
  if (!chatId) return null;

  const explicit = payload.notification_type;
  if (explicit === "order_confirmation") {
    return {
      chatId,
      text: "✅ Sizning buyurtmangiz tasdiqlandi...",
    };
  }
  if (explicit === "points_credited") {
    return {
      chatId,
      text: "💰 Sizga bonus ballar taqdim etildi...",
    };
  }
  if (explicit === "level_up") {
    return {
      chatId,
      text: "🏆 Tabriklaymiz! Sizning darajangiz ko'tarildi...",
    };
  }

  const table = payload.table;
  const op = payload.type;

  // Example inference from Database Webhooks (adjust table/column names to match your schema)
  if (table === "orders" && op === "INSERT") {
    return {
      chatId,
      text: "✅ Sizning buyurtmangiz tasdiqlandi...",
    };
  }
  if (table === "customer_points_history" || table === "bonus_transactions") {
    if (op === "INSERT") {
      return {
        chatId,
        text: "💰 Sizga bonus ballar taqdim etildi...",
      };
    }
  }
  if (
    table === "customers" && op === "UPDATE" &&
    payload.old_record?.level !== undefined &&
    payload.record?.level !== undefined &&
    payload.old_record.level !== payload.record.level
  ) {
    return {
      chatId,
      text: "🏆 Tabriklaymiz! Sizning darajangiz ko'tarildi...",
    };
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  try {
    const payload = await req.json() as NotificationPayload;
    const resolved = resolveNotification(payload);

    if (!resolved) {
      return json(
        {
          error: "Nothing to send — missing chat_id or unknown payload shape",
          hint:
            "Set chat_id / telegram_chat_id on the payload or include notification_type + chat_id.",
        },
        422,
      );
    }

    await sendTelegramMessage(resolved.chatId, resolved.text);
    return json({ ok: true, sent_to: resolved.chatId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("telegram-bot error:", message);
    return json({ error: message }, 500);
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
