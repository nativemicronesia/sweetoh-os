import type { PrintRegion } from "@/lib/domains/catalog/studio-layout";

export function regionPath(r: PrintRegion, size = 720) {
  const { x, y, width: w, height: h } = r.bounds;
  const px = x * size, py = y * size, pw = w * size, ph = h * size;
  if (r.shape === "ellipse") return `M ${px} ${py + ph / 2} a ${pw / 2} ${ph / 2} 0 1 1 ${pw} 0 a ${pw / 2} ${ph / 2} 0 1 1 ${-pw} 0 Z`;
  if (r.shape === "polygon") {
    const points = r.points ?? [];
    const winding = points.reduce((sum, p, i) => { const next = points[(i + 1) % points.length]; return sum + p.x * next.y - next.x * p.y; }, 0);
    // All subpaths use the same winding so overlapping print regions form a union.
    return (winding < 0 ? [...points].reverse() : points).map((p, i) => `${i ? "L" : "M"} ${px + p.x * pw} ${py + p.y * ph}`).join(" ") + " Z";
  }
  return `M ${px} ${py} h ${pw} v ${ph} h ${-pw} Z`;
}

