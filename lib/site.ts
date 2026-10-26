export const SITE_NAME = "Housio";
export const SITE_TAGLINE = "Don't just see it. Experience it.";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const DEMO_PASSWORD = "HousioDemo123!";
export const DEMO_ACCOUNTS = [
  { role: "guest", label: "Guest", email: "guest@demo.housio.local", blurb: "Search, save, compare and book stays." },
  { role: "owner", label: "Owner", email: "owner@demo.housio.local", blurb: "Owner Studio: listings, availability, bookings." },
  { role: "admin", label: "Admin", email: "admin@demo.housio.local", blurb: "Review listings, verify owners, moderate reviews." },
] as const;
