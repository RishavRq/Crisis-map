import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[db] SUPABASE_URL and SUPABASE_ANON_KEY are not set. ' +
    'Database operations will fail. Set them in .env or environment.'
  );
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'http://localhost:54321',  // fallback to local Supabase
  SUPABASE_ANON_KEY || 'placeholder',
);

/** Quick connectivity check — returns true if DB is reachable */
export async function checkDbConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('reports').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
