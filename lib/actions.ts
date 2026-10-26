import "server-only";
import { friendlyError, UserError, ValidationError } from "@/lib/db/errors";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw error;
    if (error instanceof Error && (error.message === "unauthorized" || error.message === "forbidden")) {
      return { ok: false, error: error.message === "forbidden" ? "You do not have permission to do that." : "Your session has ended. Please sign in again." };
    }
    if (!(error instanceof ValidationError) && !(error instanceof UserError)) console.error("[housio] action failed", error instanceof Error ? error.message : error);
    return { ok: false, error: friendlyError(error) };
  }
}

export { DB_MESSAGES } from "@/lib/messages";
import { DB_MESSAGES } from "@/lib/messages";

export function dbMessage(code: string | undefined): string {
  return (code && DB_MESSAGES[code]) || "Something went wrong. Please try again.";
}

export function check<T extends { ok: boolean; error?: string }>(res: T): T {
  if (!res.ok) throw new UserError(dbMessage(res.error));
  return res;
}
