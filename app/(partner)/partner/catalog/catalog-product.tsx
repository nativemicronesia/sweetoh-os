"use client";
import { useState } from "react";
import { Check, MapPin, Ruler } from "lucide-react";
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
}) {
  const [index, setIndex] = useState(0);
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
          <img src={product.images[index]} alt={product.name} />
        </div>
        <div className="catalog-thumbnails" aria-label="Product images">
          {product.images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Product view ${i + 1}`}
              aria-pressed={index === i}
              onClick={() => setIndex(i)}
            >
              <img src={src} alt="" loading="lazy" />
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
            <strong>Sweet’Oh · Local production</strong>
            <p>You buy the blanks and print them yourself.</p>
          </div>
        </div>

        <form action={startCatalogDesign} className="space-y-3">
          <input type="hidden" name="blueprintId" value={product.id} />
          <input type="hidden" name="imageIndex" value={index} />
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
                : "The selected photo becomes your mockup. You’ll set prices after designing."}
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
