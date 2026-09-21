import sharp from "sharp";
import { PHOTO_WIDTHS } from "@/lib/studio/photo";

export const runtime = "nodejs";

/** Resized, CDN-cached copy of a Printify catalog photo. See lib/studio/photo.ts. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const width = Number(params.get("w"));
  let src: URL;
  try {
    src = new URL(params.get("src") ?? "");
  } catch {
    return new Response("Bad photo URL", { status: 400 });
  }
  if (src.protocol !== "https:" || src.hostname !== "images.printify.com" || src.username || src.password)
    return new Response("Unsupported photo", { status: 400 });
  if (!(PHOTO_WIDTHS as readonly number[]).includes(width)) return new Response("Unsupported width", { status: 400 });

  const upstream = await fetch(src, { redirect: "error", signal: AbortSignal.timeout(30000) }).catch(() => null);
  if (!upstream?.ok) return new Response("Photo unavailable", { status: 502 });
  const body = await sharp(Buffer.from(await upstream.arrayBuffer()))
    .rotate()
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
