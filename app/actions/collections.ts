"use server";

import { revalidatePath } from "next/cache";
import { rpc } from "@/lib/db/rpc";
import { getSessionToken } from "@/lib/auth/session";
import { check, run, type ActionResult } from "@/lib/actions";

export async function saveToCollection(collectionId: string | null, name: string | null, slug: string | null, add = true): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const token = await getSessionToken();
    if (!token) throw new Error("unauthorized");
    const res = check(await rpc<{ ok: boolean; error?: string; id: string }>("api_collection_save", { p_token: token, p_collection: collectionId, p_name: name, p_slug: slug, p_add: add }));
    revalidatePath("/account/collections");
    return { id: res.id };
  });
}

export async function deleteCollection(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const token = await getSessionToken();
    await rpc("api_collection_delete", { p_token: token, p_collection: id });
    revalidatePath("/account/collections");
    return undefined;
  });
}

export async function vote(share: string, slug: string, value: -1 | 0 | 1): Promise<ActionResult<undefined>> {
  return run(async () => {
    const token = await getSessionToken();
    if (!token) throw new Error("unauthorized");
    check(await rpc<{ ok: boolean; error?: string }>("api_collection_vote", { p_token: token, p_share: share, p_slug: slug, p_vote: value }));
    revalidatePath(`/collections/${share}`);
    return undefined;
  });
}

export async function myCollections(): Promise<{ id: string; name: string; share_token: string; slugs: string[] }[]> {
  const token = await getSessionToken();
  if (!token) return [];
  return rpc("api_my_collections", { p_token: token }).catch(() => []) as Promise<{ id: string; name: string; share_token: string; slugs: string[] }[]>;
}
