import "server-only";

export interface ServerEnv {
  supabaseUrl: string;
  supabaseKey: string;
}

/** Returns null when the database is not configured, so pages can show a setup message. */
export function getServerEnv(): ServerEnv | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ""), supabaseKey };
}
