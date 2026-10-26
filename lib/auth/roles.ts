import type { Role } from "@/types";

export const ROLE_HOME: Record<Role, string> = { guest: "/account", owner: "/owner", admin: "/admin" };
const AREAS: [string, Role[]][] = [["/owner", ["owner"]], ["/admin", ["admin"]], ["/account", ["guest", "owner", "admin"]], ["/checkout", ["guest", "owner", "admin"]]];

export function rolesForPath(pathname: string): Role[] | null {
  for (const [prefix, roles] of AREAS) if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return roles;
  return null;
}

export function safeNext(next: string | null | undefined, role: Role): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")) {
    const roles = rolesForPath(next.split("?")[0]);
    if (!roles || roles.includes(role)) return next;
  }
  return ROLE_HOME[role];
}
