"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rpc } from "@/lib/db/rpc";
import { requireActionRole } from "@/lib/auth/session";
import { check, run, type ActionResult } from "@/lib/actions";

type Res = { ok: boolean; error?: string };
const uuid = z.string().uuid();

export async function reviewListing(id: string, decision: "approve" | "reject", note: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const { token } = await requireActionRole(["admin"]);
    check(await rpc<Res>("api_admin_review_listing", { p_token: token, p_property: uuid.parse(id), p_decision: z.enum(["approve", "reject"]).parse(decision), p_note: note.slice(0, 500) }));
    revalidatePath("/admin", "layout");
    return undefined;
  });
}
export async function verifyOwner(id: string, status: "verified" | "rejected"): Promise<ActionResult<undefined>> {
  return run(async () => {
    const { token } = await requireActionRole(["admin"]);
    check(await rpc<Res>("api_admin_verify_owner", { p_token: token, p_owner: uuid.parse(id), p_status: status }));
    revalidatePath("/admin", "layout");
    return undefined;
  });
}
export async function moderateReview(id: string, decision: "published" | "rejected"): Promise<ActionResult<undefined>> {
  return run(async () => {
    const { token } = await requireActionRole(["admin"]);
    check(await rpc<Res>("api_admin_moderate_review", { p_token: token, p_review: uuid.parse(id), p_decision: decision }));
    revalidatePath("/admin", "layout");
    return undefined;
  });
}
