import { createClient } from '@supabase/supabase-js';

// ─── Isi dengan URL dan anon key dari Supabase project kamu ───
// Cara get: Supabase Dashboard → Settings → API
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || '';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON belum diset di .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── ID record tunggal (upsert strategy: 1 row per season) ─────
export const DASHBOARD_ROW_ID = 1;

/**
 * Fetch processed dashboard data from Supabase.
 * Returns { processed, matched, skipped, period, savedAt } or null.
 */
export async function fetchDashboardData() {
  const { data, error } = await supabase
    .from('dashboard_data')
    .select('*')
    .eq('id', DASHBOARD_ROW_ID)
    .single();

  if (error || !data) return null;
  try {
    return JSON.parse(data.processed_json);
  } catch {
    return null;
  }
}

/**
 * Push (upsert) processed dashboard data to Supabase.
 * Overwrites the single row — lightweight JSON only, no raw files.
 */
export async function pushDashboardData(payload) {
  const { error } = await supabase
    .from('dashboard_data')
    .upsert(
      {
        id:            DASHBOARD_ROW_ID,
        processed_json: JSON.stringify(payload),
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (error) throw new Error(`Supabase push error: ${error.message}`);
}

/**
 * Reset / delete the dashboard data row from Supabase.
 */
export async function resetDashboardData() {
  const { error } = await supabase
    .from('dashboard_data')
    .delete()
    .eq('id', DASHBOARD_ROW_ID);

  if (error) throw new Error(`Supabase reset error: ${error.message}`);
}
