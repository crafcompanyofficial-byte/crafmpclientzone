# Supabase (Edge Functions)

## Telegram notifications (`telegram-bot`)

Sends Telegram messages via the Bot HTTP API using a secret stored in Supabase — **never** expose `TELEGRAM_BOT_TOKEN` in the frontend.

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Project linked locally (once per machine/repo):

```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
```

### Secrets

Configure the bot token on the server:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=<your_bot_token_from_botfather>
```

You can confirm secrets in the Supabase Dashboard: **Project Settings → Edge Functions → Secrets**.

### Deploy

Deploy this function:

```bash
supabase functions deploy telegram-bot
```

### Invoke (after deploy)

- Use the Dashboard **Edge Functions → telegram-bot → Invoke URL**, or:

```bash
supabase functions deploy telegram-bot --no-verify-jwt
```

For **Database Webhooks**, create a webhook in the Dashboard that **POST**s JSON to the function URL when rows change (or call the URL from SQL `pg_net` / triggers as your team prefers).

### Local development

```bash
supabase start
supabase functions serve telegram-bot --no-verify-jwt --env-file supabase/.env.local
```

Create `supabase/.env.local` (gitignored recommended) with `TELEGRAM_BOT_TOKEN=...` for local tests.
