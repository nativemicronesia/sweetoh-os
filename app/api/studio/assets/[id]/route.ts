import { studioAsset } from "@/lib/studio/asset-library";
import { canSurfaceStudioAsset } from "@/lib/studio/asset-library-search";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const asset = studioAsset(id);
  if (!asset || !canSurfaceStudioAsset(asset)) return new Response("Studio asset not found", { status: 404 });
  if (asset.imageUrl) {
    const publicRoot = path.resolve(process.cwd(), "public");
    const filePath = path.resolve(publicRoot, `.${asset.imageUrl}`);
    if (!filePath.startsWith(`${publicRoot}${path.sep}`)) return new Response("Studio asset not found", { status: 404 });
    let image: Buffer;
    try { image = await readFile(filePath); } catch { return new Response("Studio asset not found", { status: 404 }); }
    const mimeType = asset.imageUrl.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (!asset.svg) return new Response("Studio asset not found", { status: 404 });
  return new Response(asset.svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
