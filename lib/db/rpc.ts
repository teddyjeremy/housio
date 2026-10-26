import "server-only";
import { getServerEnv } from "@/lib/env";
import { ConfigError, ForbiddenError, UnauthorizedError, ValidationError } from "@/lib/db/errors";

interface PostgrestError {
  code?: string;
  message?: string;
}

/**
 * Calls a Housio database function through the Supabase Data API.
 * Only `api_*` functions are callable; each one checks the session token itself.
 */
export async function rpc<T>(fn: `api_${string}`, args: Record<string, unknown> = {}): Promise<T> {
  const env = getServerEnv();
  if (!env) throw new ConfigError();
  const res = await fetch(`${env.supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: env.supabaseKey,
      ...(env.supabaseKey.startsWith("ey") ? { Authorization: `Bearer ${env.supabaseKey}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (res.status === 204) return null as T;
  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = (body ?? {}) as PostgrestError;
    if (err.code === "28000") throw new UnauthorizedError();
    if (err.code === "42501") throw new ForbiddenError();
    if (err.code === "22023" || err.code === "23514" || err.code === "22P02" || err.code === "22007" || err.code === "22008") {
      throw new ValidationError(err.message ?? "invalid");
    }
    if (err.code === "23505") throw new ValidationError("duplicate");
    throw new Error(`Database call ${fn} failed (${res.status})`);
  }
  return body as T;
}
