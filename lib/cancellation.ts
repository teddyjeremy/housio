// Mirror of app.refund_for(). Check-in is 14:00 Nairobi time (UTC+3).
export type Policy = "flexible" | "moderate" | "strict";

export const POLICY_TEXT: Record<Policy, { title: string; summary: string }> = {
  flexible: { title: "Flexible", summary: "Full refund up to 24 hours before check-in. After that, 50% of the stay (excluding service fee) until check-in." },
  moderate: { title: "Moderate", summary: "Full refund up to 5 days before check-in. After that, 50% of the stay (excluding service fee) until check-in." },
  strict: { title: "Strict", summary: "Full refund up to 14 days before check-in, 50% (excluding service fee) up to 7 days before. No refund within 7 days." },
};

export function checkinInstant(checkin: string): number {
  return Date.parse(`${checkin}T14:00:00+03:00`);
}

export function refundFor(policy: Policy, total: number, serviceFee: number, checkin: string, at: Date = new Date()): number {
  const hours = (checkinInstant(checkin) - at.getTime()) / 3_600_000;
  if (hours <= 0) return 0;
  const half = Math.round((total - serviceFee) * 0.5);
  if (policy === "flexible") return hours >= 24 ? total : half;
  if (policy === "moderate") return hours >= 120 ? total : half;
  return hours >= 336 ? total : hours >= 168 ? half : 0;
}
