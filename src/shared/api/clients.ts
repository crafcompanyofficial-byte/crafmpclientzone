import { getSupabase } from './supabase';

export type SyncClientDealerResult = {
  clientId: string | null;
  error: string | null;
};

type ProfileRow = { id: string; full_name?: string | null; phone?: string | null };
type ClientRow = { id: string };

/** PostgREST: `.single()` when the result set is empty */
function isNoRowsError(err: { code?: string } | null): boolean {
  return err?.code === 'PGRST116';
}

/**
 * 1) Resolve `profiles.id` by `telegram_id` (create profile if missing).
 * 2) Resolve `clients` row by `profile_id` (update `dealer_id` or insert).
 * Returns the `clients.id` used as `clientRecordId` in the app.
 */
export async function syncClientDealer(telegram_id: number, dealer_id: string): Promise<SyncClientDealerResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { clientId: null, error: 'Supabase sozlanmagan' };
  }

  const { data: profileFound, error: profileSelectError } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('telegram_id', telegram_id)
    .single();

  if (profileSelectError && !isNoRowsError(profileSelectError)) {
    return { clientId: null, error: profileSelectError.message };
  }

  let profile: ProfileRow | null =
    profileFound && !profileSelectError ? (profileFound as ProfileRow) : null;

  if (!profile?.id) {
    const { data: createdProfile, error: profileInsertError } = await supabase
      .from('profiles')
      .insert({ telegram_id: telegram_id, role: 'client', full_name: 'Client' })
      .select('id, full_name, phone')
      .single();

    if (profileInsertError) {
      return { clientId: null, error: profileInsertError.message };
    }
    profile = createdProfile as ProfileRow;
  }

  const profileId = profile.id;

  const { data: clientFound, error: clientSelectError } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', profileId)
    .single();

  if (clientSelectError && !isNoRowsError(clientSelectError)) {
    return { clientId: null, error: clientSelectError.message };
  }

  const existingClientId =
    clientFound && !clientSelectError ? (clientFound as ClientRow).id : null;

  if (existingClientId) {
    const { data: updatedClient, error: clientUpdateError } = await supabase
      .from('clients')
      .update({
        dealer_id: dealer_id,
        name: profile.full_name ?? 'Client',
        phone: profile.phone ?? null,
      })
      .eq('profile_id', profileId)
      .select('id')
      .single();

    if (clientUpdateError) {
      return { clientId: null, error: clientUpdateError.message };
    }

    const id = (updatedClient as ClientRow | null)?.id;
    return { clientId: id != null ? String(id) : null, error: null };
  }

  const { data: insertedClient, error: clientInsertError } = await supabase
    .from('clients')
    .insert({
      profile_id: profileId,
      dealer_id: dealer_id,
      name: profile.full_name ?? 'Client',
      phone: profile.phone ?? null,
    })
    .select('id')
    .single();

  if (clientInsertError) {
    return { clientId: null, error: clientInsertError.message };
  }

  const id = (insertedClient as ClientRow | null)?.id;
  return { clientId: id != null ? String(id) : null, error: null };
}

type ClientProfileQueryRow = {
  name: string | null;
  phone: string | null;
  profiles: { phone: string | null } | { phone: string | null }[] | null;
};

/**
 * Loads display name and phone for the authenticated client row (clients + profiles).
 */
export async function fetchClientProfile(clientId: string): Promise<{
  displayName: string | null;
  phone: string | null;
  error: string | null;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { displayName: null, phone: null, error: 'Supabase sozlanmagan' };
  }

  const { data, error } = await supabase
    .from('clients')
    .select('name, phone, profiles(phone)')
    .eq('id', clientId)
    .single();

  if (error) {
    return { displayName: null, phone: null, error: error.message };
  }

  const row = data as ClientProfileQueryRow;
  const prof = row.profiles;
  const profilePhone = Array.isArray(prof) ? prof[0]?.phone ?? null : prof?.phone ?? null;
  const phone = row.phone ?? profilePhone ?? null;
  const displayName = row.name ?? null;

  return { displayName, phone, error: null };
}
