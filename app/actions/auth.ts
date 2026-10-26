"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { rpc } from "@/lib/db/rpc";
import { clearSessionCookie, clientKey, getSessionToken, setSessionCookie } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/roles";
import { dbMessage } from "@/lib/actions";
import type { Role } from "@/types";

export interface AuthState { error?: string; values?: Record<string, string> }
type AuthResponse = { ok: true; token: string; role: Role } | { ok: false; error: string };

const loginSchema = z.object({ email: z.string().trim().email("Enter a valid email address."), password: z.string().min(1, "Enter your password.").max(200) });
const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters.").max(128),
  role: z.enum(["guest", "owner"]),
});

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const raw = { email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: { email: raw.email } };
  let res: AuthResponse;
  try {
    res = await rpc<AuthResponse>("api_login", { p_email: parsed.data.email, p_password: parsed.data.password, p_client: await clientKey() });
  } catch {
    return { error: "We couldn't reach Housio right now. Please try again shortly.", values: { email: raw.email } };
  }
  if (!res.ok) return { error: res.error === "rate_limited" ? dbMessage("rate_limited") : "That email and password don't match an active account.", values: { email: raw.email } };
  await setSessionCookie(res.token);
  redirect(safeNext(String(form.get("next") ?? "") || null, res.role));
}

export async function register(_prev: AuthState, form: FormData): Promise<AuthState> {
  const raw = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), password: String(form.get("password") ?? ""), role: String(form.get("role") ?? "guest") };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: { name: raw.name, email: raw.email } };
  let res: AuthResponse;
  try {
    res = await rpc<AuthResponse>("api_register", { p_email: parsed.data.email, p_password: parsed.data.password, p_name: parsed.data.name, p_role: parsed.data.role, p_client: await clientKey() });
  } catch {
    return { error: "We couldn't reach Housio right now. Please try again shortly.", values: { name: raw.name, email: raw.email } };
  }
  if (!res.ok) return { error: dbMessage(res.error), values: { name: raw.name, email: raw.email } };
  await setSessionCookie(res.token);
  redirect(safeNext(String(form.get("next") ?? "") || null, res.role));
}

export async function demoLogin(form: FormData): Promise<void> {
  const email = String(form.get("email") ?? "");
  if (!/^(guest|owner|admin)@demo\.housio\.local$/.test(email)) redirect("/login");
  const res = await rpc<AuthResponse>("api_login", { p_email: email, p_password: "HousioDemo123!", p_client: await clientKey() });
  if (!res.ok) redirect("/login?demo_failed=1");
  await setSessionCookie(res.token);
  redirect(safeNext(String(form.get("next") ?? "") || null, res.role));
}

export async function logout(): Promise<void> {
  const token = await getSessionToken();
  if (token) await rpc("api_logout", { p_token: token }).catch(() => undefined);
  await clearSessionCookie();
  redirect("/");
}
