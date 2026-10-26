import { NextResponse, type NextRequest } from "next/server";
import { rolesForPath } from "@/lib/auth/roles";

/**
 * Optimistic check only: bounces visitors without a session cookie away from
 * protected areas. Real authorization happens on the server for every page
 * and action, using the role stored in the database.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-hs-path", pathname + search);

  if (rolesForPath(pathname) && !request.cookies.get("hs_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
