"use client";

import { useEffect } from "react";
import { type StudioTemplate, type TemplateElement } from "@/lib/studio/templates";
import { fontFamily, fontSupportsBold, loadCatalogFont } from "@/lib/studio/fonts";
import { studioAssetUrl } from "@/lib/studio/asset-library-client";

const W = 300, H = 400;

function starPath(cx: number, cy: number, r: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(cx + Math.cos(a) * radius).toFixed(1)},${(cy + Math.sin(a) * radius).toFixed(1)}`;
  }).join(" ");
}
function burstPath(cx: number, cy: number, r: number) {
  return Array.from({ length: 32 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * 0.8;
    const a = -Math.PI / 2 + (i * Math.PI) / 16;
    return `${(cx + Math.cos(a) * radius).toFixed(1)},${(cy + Math.sin(a) * radius).toFixed(1)}`;
  }).join(" ");
}

/** Approximate preview of one element; the real layers are created when the template is applied. */
function PreviewElement({ element, ink, index }: { element: TemplateElement; ink: string; index: number }) {
  if (element.type === "graphic") {
    const size = element.w * W;
    // eslint-disable-next-line @next/next/no-img-element
    return <image href={studioAssetUrl(element.id)} x={element.cx * W - size / 2} y={element.cy * H - size / 2} width={size} height={size} preserveAspectRatio="xMidYMid meet" />;
  }
  if (element.type === "shape") {
    const cx = element.cx * W, cy = element.cy * H, size = element.w * W;
    const paint = { fill: element.fill ?? "none", stroke: element.stroke, strokeWidth: element.stroke ? (element.strokeWidth ?? 4) * 0.55 : undefined };
    if (element.shape === "circle") return <circle cx={cx} cy={cy} r={size / 2} {...paint} />;
    if (element.shape === "star") return <polygon points={starPath(cx, cy, size / 2)} {...paint} />;
    if (element.shape === "burst") return <polygon points={burstPath(cx, cy, size / 2)} {...paint} />;
    if (element.shape === "line") return <line x1={cx - size / 2} x2={cx + size / 2} y1={cy} y2={cy} stroke={element.stroke ?? ink} strokeWidth={(element.strokeWidth ?? 4) * 0.55} strokeLinecap="round" />;
    return <rect x={cx - size / 2} y={cy - (element.h ?? element.w) * W / 2} width={size} height={(element.h ?? element.w) * W} rx={element.shape === "rounded" ? size * 0.12 : 0} {...paint} />;
  }
  const size = element.size * Math.min(W, H);
  const color = element.color === "ink" ? ink : element.color;
  const style = {
    fontFamily: fontFamily(element.font),
    fontSize: size,
    fontWeight: element.bold && fontSupportsBold(element.font) ? 700 : 400,
    fontStyle: element.italic ? "italic" : "normal",
    letterSpacing: (element.letterSpacing ?? 0) / 1000 * size,
    paintOrder: "stroke fill",
  } as const;
  const stroke = element.outline ? { stroke: element.outline, strokeWidth: (element.outlineWidth ?? 4) * 0.5, strokeLinejoin: "round" as const } : {};
  const cx = element.cx * W, cy = element.cy * H;
  if (element.arc) {
    const R = element.arc.radius * Math.min(W, H);
    const top = element.arc.side === "top";
    const length = element.text.length * size * 0.66;
    const half = Math.min(length / R, 1.45 * Math.PI) / 2;
    const a0 = top ? -Math.PI / 2 - half : Math.PI / 2 + half;
    const a1 = top ? -Math.PI / 2 + half : Math.PI / 2 - half;
    const d = `M ${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)} A ${R} ${R} 0 ${half * 2 > Math.PI ? 1 : 0} ${top ? 1 : 0} ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)}`;
    const id = `tp-${index}`;
    return (
      <g>
        <defs><path id={id} d={d} /></defs>
        <text fill={color} style={style} textAnchor="middle" {...stroke}><textPath href={`#${id}`} startOffset="50%">{element.text}</textPath></text>
      </g>
    );
  }
  if (element.curve) {
    const length = element.text.length * size * 0.66;
    const theta = Math.max(0.12, (Math.abs(element.curve) / 100) * Math.PI * 1.5);
    const r = length / theta;
    const up = element.curve > 0;
    const a0 = up ? -Math.PI / 2 - theta / 2 : Math.PI / 2 + theta / 2;
    const a1 = up ? -Math.PI / 2 + theta / 2 : Math.PI / 2 - theta / 2;
    const ccy = up ? cy + r - size * 0.1 : cy - r + size * 0.1;
    const d = `M ${cx + r * Math.cos(a0)} ${ccy + r * Math.sin(a0)} A ${r} ${r} 0 ${theta > Math.PI ? 1 : 0} ${up ? 1 : 0} ${cx + r * Math.cos(a1)} ${ccy + r * Math.sin(a1)}`;
    const id = `tp-${index}`;
    return (
      <g>
        <defs><path id={id} d={d} /></defs>
        <text fill={color} style={style} textAnchor="middle" {...stroke}><textPath href={`#${id}`} startOffset="50%">{element.text}</textPath></text>
      </g>
    );
  }
  return <text x={cx} y={cy} fill={color} style={style} textAnchor="middle" dominantBaseline="central" {...stroke}>{element.text}</text>;
}

export function TemplatePreview({ template, ink }: { template: StudioTemplate; ink: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tp-svg" aria-hidden>
      {template.elements.map((element, index) => <PreviewElement key={index} element={element} ink={ink} index={index} />)}
    </svg>
  );
}


/** Load the families a set of templates uses, so previews render in the real fonts. */
export function useTemplateFonts(templates: readonly StudioTemplate[]) {
  useEffect(() => {
    const keys = new Set(templates.flatMap((template) => template.elements.flatMap((element) => (element.type === "text" ? [element.font] : []))));
    for (const key of keys) void loadCatalogFont(key, true);
  }, [templates]);
}
