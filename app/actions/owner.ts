"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rpc } from "@/lib/db/rpc";
import { requireActionRole } from "@/lib/auth/session";
import { check, run, type ActionResult } from "@/lib/actions";
import { UserError } from "@/lib/db/errors";
import { dateRange, propertySchema, spaceSchema, type PropertyInput } from "@/lib/validation";

type Res = { ok: boolean; error?: string; id?: string; slug?: string };
const uuid = z.string().uuid();

export async function saveProperty(id: string | null, input: PropertyInput): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { token } = await requireActionRole(["owner"]);
    const p = propertySchema.safeParse(input);
    if (!p.success) throw new UserError(p.error.issues[0].message);
    const d = p.data;
    const payload = { ...d, stay_types: [d.stay_short && "short", d.stay_long && "long"].filter(Boolean) };
    const res = check(await rpc<Res>("api_owner_save_property", { p_token: token, p_property: id ? uuid.parse(id) : null, p_data: payload }));
    revalidatePath("/owner", "layout");
    return { id: res.id! };
  });
}

export async function saveSpace(unit: string, space: string | null, input: unknown, remove = false): Promise<ActionResult<undefined>> {
  return run(async () => {
    const { token } = await requireActionRole(["owner"]);
    const data = remove ? { delete: true } : spaceSchema.parse(input);
    check(await rpc<Res>("api_owner_save_space", { p_token: token, p_unit: uuid.parse(unit), p_space: space ? uuid.parse(space) : null, p_data: data }));
    revalidatePath("/owner", "layout");
    return undefined;
  });
}

export async function blockDates(unit: string, from: string | null, to: string | null, remove: string | null): Promise<ActionResult<undefined>> {
  return run(async () => {
    const { token } = await requireActionRole(["owner"]);
    if (!remove) { const r = dateRange.safeParse({ from, to }); if (!r.success) throw new UserError(r.error.issues[0].message); }
    check(await rpc<Res>("api_owner_block_dates", { p_token: token, p_unit: uuid.parse(unit), p_from: from, p_to: to, p_remove: remove }));
    revalidatePath("/owner", "layout");
    return undefined;
  });
}

export async function setRate(unit: string, from: string | null, to: string | null, rate: number | null, remove: string | null): Promise<ActionResult<undefined>> {
  return run(async () => {
    const { token } = await requireActionRole(["owner"]);
    check(await rpc<Res>("api_owner_set_rate", { p_token: token, p_unit: uuid.parse(unit), p_from: from, p_to: to, p_rate: rate, p_remove: remove }));
    revalidatePath("/owner", "layout");
    return undefined;
  });
}

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", glb: "model/gltf-binary" };

export async function uploadAsset(form: FormData): Promise<ActionResult<undefined>> {
  return run(async () => {
    const { token } = await requireActionRole(["owner"]);
    const property = uuid.parse(form.get("property"));
    const kind = z.enum(["photo", "floor_plan", "model"]).parse(form.get("kind"));
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new UserError("Choose a file to upload.");
    if (file.size > 4 * 1024 * 1024) throw new UserError("Files must be 4 MB or smaller.");
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mime = MIME[ext];
    if (!mime) throw new UserError("Use JPEG, PNG, WebP or GLB.");
    const buf = Buffer.from(await file.arrayBuffer());
    // Check magic bytes so a renamed file can't pass as an image or model.
    const sig = buf.subarray(0, 4).toString("hex");
    const ok = mime === "model/gltf-binary" ? buf.subarray(0, 4).toString("ascii") === "glTF"
      : mime === "image/png" ? sig === "89504e47" : mime === "image/jpeg" ? sig.startsWith("ffd8") : buf.subarray(8, 12).toString("ascii") === "WEBP";
    if (!ok) throw new UserError("That file doesn't look like a valid image or GLB model.");
    check(await rpc<Res>("api_owner_add_asset", { p_token: token, p_property: property, p_kind: kind, p_mime: mime, p_base64: buf.toString("base64"),
      p_caption: String(form.get("caption") ?? "").slice(0, 200), p_is_exact_model: form.get("exact") === "on" }));
    revalidatePath("/owner", "layout");
    return undefined;
  });
}

export async function deleteAsset(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const { token } = await requireActionRole(["owner"]);
    check(await rpc<Res>("api_owner_delete_asset", { p_token: token, p_asset: uuid.parse(id) }));
    revalidatePath("/owner", "layout");
    return undefined;
  });
}

export async function submitForReview(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const { token } = await requireActionRole(["owner"]);
    check(await rpc<Res>("api_owner_submit", { p_token: token, p_property: uuid.parse(id) }));
    revalidatePath("/owner", "layout");
    return undefined;
  });
}

export async function deleteProperty(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const { token } = await requireActionRole(["owner"]);
    check(await rpc<Res>("api_owner_delete_property", { p_token: token, p_property: uuid.parse(id) }));
    revalidatePath("/owner", "layout");
    return undefined;
  });
}
