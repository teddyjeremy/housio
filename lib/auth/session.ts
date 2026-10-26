import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { rpc } from "@/lib/db/rpc";
import { ROLE_HOME } from "@/lib/auth/roles";
import type { CurrentUser, Role } from "@/types";

export const SESSION_COOKIE = "hs_session";
export const SESSION_MAX_AGE = 60 * 60 * 12;

export async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user, resolved by the database from the session token. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    return await rpc<CurrentUser | null>("api_me", { p_token: token });
  } catch {
    return null;
  }
});

/** Guards a page: redirects to sign-in when signed out and to the right portal when the role differs. */
export async function requireRole(roles: Role[]): Promise<{ user: CurrentUser; token: string }> {
  const token = await getSessionToken();
  const user = await getCurrentUser();
  if (!user || !token) {
    const h = await headers();
    const path = h.get("x-hs-path") ?? "";
    redirect(`/login?expired=1${path ? `&next=${encodeURIComponent(path)}` : ""}`);
  }
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return { user, token };
}

/** Guards a server action. Throws instead of redirecting so the action can return an error. */
export async function requireActionRole(roles: Role[]): Promise<{ user: CurrentUser; token: string }> {
  const token = await getSessionToken();
  const user = await getCurrentUser();
  if (!user || !token) throw new Error("unauthorized");
  if (!roles.includes(user.role)) throw new Error("forbidden");
  return { user, token };
}

export async function clientKey(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (fwd || h.get("x-real-ip") || "local").slice(0, 64);
}
