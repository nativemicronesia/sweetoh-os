"use client";
import { useEffect, useRef, useState } from "react";
import { Check, MapPin, Ruler, Sparkles } from "lucide-react";
import { analyzePhoto, printAreaInBox, type PhotoInfo } from "@/lib/studio/tint";
import { Badge } from "@/components/ui/badge";
import { isLightColor, type VariantColor } from "@/lib/domains/catalog/variants";
import { SubmitButton } from "../components/submit-button";
import { startCatalogDesign } from "../actions/catalog";

type Options = {
  colors: VariantColor[];
  sizes: string[];
  printAreas: { position: string; width: number; height: number }[];
};

const AREA_LABEL: Record<string, string> = {
  front: "Front",
  back: "Back",
  left_sleeve: "Left sleeve",
  right_sleeve: "Right sleeve",
  neck: "Neck label",
};

export function CatalogProduct({
  product,
  options,
  initial,
  provider = { title: "Sweet’Oh · Local production", text: "You buy the blanks and print them yourself." },
}: {
  product: {
    id: number;
    name: string;
    description: string;
    brand: string;
    model: string;
    images: string[];
    category: string;
  };
  options: Options | null;
  initial?: { colors: string[]; sizes: string[] } | null;
  /** Who produces it — the partner prints locally; creators use Printify or request Sweet'Oh. */
  provider?: { title: string; text: string };
}) {
  const [index, setIndex] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const picked = useRef(false);
  const [info, setInfo] = useState<Record<number, PhotoInfo>>({});
  // Find the cleanest flat photo to design on, like Printify's editor view.
  useEffect(() => {
    let live = true;
    (async () => {
      const found: Record<number, PhotoInfo> = {};
      for (const [i, src] of product.images.slice(0, 12).entries()) {
        found[i] = await analyzePhoto(src).catch(() => ({ score: -2, box: null }));
        if (!live) return;
      }
      const top = Object.entries(found).sort((a, b) => b[1].score - a[1].score)[0];
      setInfo(found);
      if (top && top[1].score > 0) {
        setBest(Number(top[0]));
        if (!picked.current) setIndex(Number(top[0]));
      }
    })();
    return () => {
      live = false;
    };
  }, [product.images]);
  const front = options?.printAreas.find((a) => a.position === "front") ?? options?.printAreas[0];
  const box = info[index]?.box;
  const area = box ? printAreaInBox(box, front ? front.height / front.width : 1) : null;
  const [more, setMore] = useState(false);
  const colorNames = options?.colors.map((c) => c.name) ?? [];
  const basics = colorNames.filter((c) => c === "White" || c === "Black");
  const [colors, setColors] = useState<string[]>(
    initial?.colors.filter((c) => colorNames.includes(c)) ??
      (basics.length ? basics : colorNames.slice(0, 1)),
  );
  const [sizes, setSizes] = useState<string[]>(
    initial?.sizes.filter((s) => options?.sizes.includes(s)) ?? options?.sizes ?? [],
  );
  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  const needsColor = Boolean(options?.colors.length) && colors.length === 0;
  const needsSize = Boolean(options?.sizes.length) && sizes.length === 0;
  const areas = [...(options?.printAreas ?? [])].sort(
    (a, b) =>
      Object.keys(AREA_LABEL).indexOf(a.position) - Object.keys(AREA_LABEL).indexOf(b.position),
  );

  return (
    <section className="catalog-detail">
      <div>
        <div className="catalog-detail-image">
          <img key={product.images[index]} src={product.images[index]} alt={product.name} />
          {area && (
            <span
              className="detail-print-area"
              style={{
                left: `${area.x * 100}%`,
                top: `${area.y * 100}%`,
                width: `${area.width * 100}%`,
                height: `${area.height * 100}%`,
              }}
            >
              Print area
            </span>
          )}
        </div>
        <div className="catalog-thumbnails" aria-label="Product images">
          {product.images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Product view ${i + 1}`}
              aria-pressed={index === i}
              onClick={() => {
                picked.current = true;
                setIndex(i);
              }}
            >
              <img src={src} alt="" loading="lazy" />
              {best === i && (
                <span className="thumb-best" title="Best photo for designing">
                  <Sparkles size={11} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-6 py-2">
        <div className="space-y-3">
          <Badge variant="secondary">{product.category}</Badge>
          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
          <p className="text-muted-foreground">
            {[product.brand, product.model].filter(Boolean).join(" · ")}
          </p>
        </div>

        {options?.colors.length ? (
          <fieldset className="pick">
            <legend>
              Colors you’ll offer
              <span>
                {colors.length} of {options.colors.length} selected
              </span>
            </legend>
            <div className="pick-actions">
              <button type="button" onClick={() => setColors(colorNames)}>
                Select all
              </button>
              <button type="button" onClick={() => setColors([])}>
                Clear
              </button>
            </div>
            <div className="swatches">
              {options.colors.map((c) => {
                const on = colors.includes(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={on}
                    className="swatch"
                    style={{ background: c.hex }}
                    onClick={() => setColors(toggle(colors, c.name))}
                  >
                    {on && (
                      <Check
                        size={16}
                        strokeWidth={3}
                        color={isLightColor(c.hex) ? "#101828" : "#fff"}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {colors.length > 0 && <p className="pick-summary">{colors.join(", ")}</p>}
          </fieldset>
        ) : null}

        {options?.sizes.length ? (
          <fieldset className="pick">
            <legend>
              Sizes you’ll offer
              <span>
                {sizes.length} of {options.sizes.length} selected
              </span>
            </legend>
            <div className="size-chips">
              {options.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={sizes.includes(s)}
                  onClick={() => setSizes(toggle(sizes, s))}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {areas.length > 0 && (
          <div className="print-areas">
            <h2>
              <Ruler size={16} /> Print areas
            </h2>
            <ul>
              {areas.map((a) => (
                <li key={a.position}>
                  <span>{AREA_LABEL[a.position] ?? a.position.replace(/_/g, " ")}</span>
                  <span>
                    {a.width} × {a.height} px
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="catalog-provider">
          <MapPin size={20} />
          <div>
            <strong>{provider.title}</strong>
            <p>{provider.text}</p>
          </div>
        </div>

        <form action={startCatalogDesign} className="space-y-3">
          <input type="hidden" name="blueprintId" value={product.id} />
          <input type="hidden" name="imageIndex" value={index} />
          <input type="hidden" name="area" value={area ? JSON.stringify(area) : ""} />
          <input type="hidden" name="colors" value={JSON.stringify(colors)} />
          <input type="hidden" name="sizes" value={JSON.stringify(sizes)} />
          <SubmitButton pendingLabel="Preparing your product…" disabled={needsColor || needsSize}>
            Start designing →
          </SubmitButton>
          <p className="text-xs text-muted-foreground">
            {needsColor
              ? "Pick at least one color."
              : needsSize
                ? "Pick at least one size."
                : best === index
                  ? "This flat photo is best for designing. You’ll set prices after designing."
                  : "The selected photo is what you’ll design on. You’ll set prices after designing."}
          </p>
        </form>

        <div className="catalog-description">
          <h2>Product details</h2>
          <p
            data-clamped={!more}
            className="whitespace-pre-line text-sm leading-6 text-muted-foreground"
          >
            {product.description}
          </p>
          {product.description.length > 420 && (
            <button type="button" className="catalog-more" onClick={() => setMore(!more)}>
              {more ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
