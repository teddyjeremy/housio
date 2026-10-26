"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rpc } from "@/lib/db/rpc";
import { getSessionToken } from "@/lib/auth/session";
import { check, dbMessage, run, type ActionResult } from "@/lib/actions";
import type { Quote } from "@/types";

const stay = z.object({
  unit: z.string().uuid(),
  checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(30),
});

export async function getQuote(input: { unit: string; checkin: string; checkout: string; guests: number }): Promise<Quote> {
  const p = stay.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid_dates" };
  try {
    return await rpc<Quote>("api_quote", { p_unit: p.data.unit, p_checkin: p.data.checkin, p_checkout: p.data.checkout, p_guests: p.data.guests });
  } catch {
    return { ok: false, error: "network" };
  }
}

export interface ReserveState { error?: string }

export async function reserve(_prev: ReserveState, form: FormData): Promise<ReserveState> {
  const p = stay.safeParse({ unit: form.get("unit"), checkin: form.get("checkin"), checkout: form.get("checkout"), guests: form.get("guests") });
  if (!p.success) return { error: "Please choose valid dates and guests." };
  const back = String(form.get("back") ?? "/");
  const token = await getSessionToken();
  if (!token) redirect(`/login?next=${encodeURIComponent(back)}`);
  const names = String(form.get("names") ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, p.data.guests);
  let res: { ok: boolean; error?: string; reference?: string };
  try {
    res = await rpc("api_create_booking", { p_token: token, p_unit: p.data.unit, p_checkin: p.data.checkin, p_checkout: p.data.checkout, p_guests: p.data.guests, p_names: names });
  } catch (e) {
    if (e instanceof Error && e.message === "unauthorized") redirect(`/login?expired=1&next=${encodeURIComponent(back)}`);
    return { error: "We couldn't reach Housio. Please try again." };
  }
  if (!res.ok) return { error: dbMessage(res.error) };
  redirect(`/checkout/${res.reference}`);
}

export async function pay(bookingId: string, reference: string, outcome: "success" | "fail"): Promise<ActionResult<{ reference: string }>> {
  const r = await run(async () => {
    const token = await getSessionToken();
    return check(await rpc<{ ok: boolean; error?: string; reference: string }>("api_pay_booking", { p_token: token, p_booking: bookingId, p_outcome: outcome }));
  });
  if (r.ok) redirect(`/account/bookings/${reference}?confirmed=1`);
  return r as ActionResult<{ reference: string }>;
}

export async function cancelBooking(bookingId: string): Promise<ActionResult<{ refund: number }>> {
  return run(async () => {
    const token = await getSessionToken();
    const res = check(await rpc<{ ok: boolean; error?: string; refund: number }>("api_cancel_booking", { p_token: token, p_booking: bookingId }));
    revalidatePath("/account", "layout");
    return { refund: res.refund };
  });
}

const reviewSchema = z.object({ booking: z.string().uuid(), rating: z.coerce.number().int().min(1).max(5), body: z.string().trim().min(10, "Write at least 10 characters.").max(2000) });

export async function submitReview(_prev: { error?: string; ok?: boolean }, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const p = reviewSchema.safeParse({ booking: form.get("booking"), rating: form.get("rating"), body: form.get("body") });
  if (!p.success) return { error: p.error.issues[0].message };
  const r = await run(async () => {
    const token = await getSessionToken();
    return check(await rpc<{ ok: boolean; error?: string }>("api_create_review", { p_token: token, p_booking: p.data.booking, p_rating: p.data.rating, p_body: p.data.body }));
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/account", "layout");
  return { ok: true };
}
