export const kes = (n: number | null | undefined) => (n == null ? "—" : `KES ${Math.round(n).toLocaleString("en-KE")}`);
export const TYPE_LABELS: Record<string, string> = {
  serviced_apartment: "Serviced apartment", studio: "Studio", holiday_home: "Holiday home", furnished_home: "Entire furnished home",
  suite: "Suite", private_room: "Private room", meeting_room: "Meeting room", lounge: "Private lounge", other: "Other",
};
export function formatDate(d: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "Africa/Nairobi" });
}
export function todayNairobi(): string {
  return new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
}
