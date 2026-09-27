import { studioAsset } from "@/lib/studio/asset-library";
import { canSurfaceStudioAsset } from "@/lib/studio/asset-library-search";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const asset = studioAsset(id);
  if (!asset || !canSurfaceStudioAsset(asset)) return new Response("Studio asset not found", { status: 404 });
  return new Response(asset.svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
