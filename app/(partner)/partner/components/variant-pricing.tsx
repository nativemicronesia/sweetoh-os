"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import {
  isLightColor,
  type VariantColor,
  type VariantOptions,
} from "@/lib/domains/catalog/variants";

/**
 * Colors, sizes and size upcharges on the Details & pricing form — the
 * Printify "variants" table, posted with the rest of the listing fields.
 */
export function VariantPricing({
  available,
  current,
}: {
  available: { colors: VariantColor[]; sizes: string[] };
  current: VariantOptions | null;
}) {
  const [colors, setColors] = useState<string[]>(current?.colors.map((c) => c.name) ?? []);
  const [sizes, setSizes] = useState<string[]>(current?.sizes ?? []);
  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <fieldset className="variant-pricing md:col-span-2">
      <input type="hidden" name="variantsPresent" value="1" />
      {available.colors.length > 0 && (
        <div>
          <p className="vp-label">
            Colors <span>{colors.length} selected</span>
          </p>
          <div className="swatches">
            {available.colors.map((c) => {
              const on = colors.includes(c.name);
              return (
                <label key={c.name} className="swatch" title={c.name} style={{ background: c.hex }} data-on={on}>
                  <input
                    type="checkbox"
                    name="variantColor"
                    value={c.name}
                    checked={on}
                    onChange={() => setColors(toggle(colors, c.name))}
                    className="sr-only"
                    aria-label={c.name}
                  />
                  {on && <Check size={15} strokeWidth={3} color={isLightColor(c.hex) ? "#101828" : "#fff"} />}
                </label>
              );
            })}
          </div>
          {colors.length > 0 && <p className="pick-summary">{colors.join(", ")}</p>}
        </div>
      )}
      {available.sizes.length > 0 && (
        <div>
          <p className="vp-label">
            Sizes & extra charge <span>added to your selling price</span>
          </p>
          <table className="vp-table">
            <thead>
              <tr>
                <th>Offer</th>
                <th>Size</th>
                <th>Extra charge (USD)</th>
              </tr>
            </thead>
            <tbody>
              {available.sizes.map((s) => (
                <tr key={s} data-off={!sizes.includes(s)}>
                  <td>
                    <input
                      type="checkbox"
                      name="variantSize"
                      value={s}
                      checked={sizes.includes(s)}
                      onChange={() => setSizes(toggle(sizes, s))}
                      aria-label={`Offer ${s}`}
                    />
                  </td>
                  <td>{s}</td>
                  <td>
                    <input
                      type="number"
                      name={`upcharge:${s}`}
                      min={0}
                      step="0.01"
                      defaultValue={((current?.sizeUpchargeCents[s] ?? 0) / 100).toFixed(2)}
                      disabled={!sizes.includes(s)}
                      aria-label={`Extra charge for ${s}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </fieldset>
  );
}
