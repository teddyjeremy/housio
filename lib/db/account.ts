import "server-only";
import { rpc } from "@/lib/db/rpc";
import type { Booking } from "@/types";

export const myBookings = (token: string) => rpc<Booking[]>("api_my_bookings", { p_token: token });
export const myBooking = (token: string, ref: string) => rpc<Booking | null>("api_booking", { p_token: token, p_reference: ref });
export const myNotifications = (token: string) =>
  rpc<{ id: number; kind: string; message: string; link: string | null; read: boolean; created_at: string }[]>("api_notifications", { p_token: token });
