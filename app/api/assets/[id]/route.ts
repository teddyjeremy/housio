import { rpc } from "@/lib/db/rpc";
import { getSessionToken } from "@/lib/auth/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const token = await getSessionToken();
  const file = await rpc<{ mime: string; data: string } | null>("api_asset_file", { p_asset: id, p_token: token }).catch(() => null);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(file.data, "base64"), {
    headers: { "Content-Type": file.mime, "Cache-Control": token ? "private, max-age=300" : "public, max-age=3600", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" },
  });
}
