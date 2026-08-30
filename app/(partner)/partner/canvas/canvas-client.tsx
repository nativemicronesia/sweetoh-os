"use client";

import { useMemo, useState, useTransition } from "react";
import { DesignCanvas } from "@/components/design-canvas";
import { saveCanvasCompositionAction } from "../actions/library";

export type CanvasBlankOption = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export type CanvasDesignOption = {
  id: string;
  name: string;
  previewUrl: string | null;
};

export function PartnerCanvasClient({
  blanks,
  designs,
  initialDesignId,
}: {
  blanks: CanvasBlankOption[];
  designs: CanvasDesignOption[];
  initialDesignId: string | null;
}) {
  const [blankId, setBlankId] = useState(blanks[0]?.id ?? "");
  const [designId, setDesignId] = useState(initialDesignId ?? designs[0]?.id ?? "");
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const blank = useMemo(
    () => blanks.find((item) => item.id === blankId) ?? null,
    [blanks, blankId],
  );
  const design = useMemo(
    () => designs.find((item) => item.id === designId) ?? null,
    [designs, designId],
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Blank
          <select
            value={blankId}
            onChange={(event) => setBlankId(event.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--so-border)",
              background: "var(--so-black)",
              color: "var(--so-cream)",
            }}
          >
            {blanks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Design
          <select
            value={designId}
            onChange={(event) => setDesignId(event.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--so-border)",
              background: "var(--so-black)",
              color: "var(--so-cream)",
            }}
          >
            {designs.length === 0 ? (
              <option value="">No library designs yet</option>
            ) : (
              designs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      <label className="block text-sm" style={{ color: "var(--so-cream-dim)" }}>
        Composition name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={
            blank && design ? `${design.name} on ${blank.name}` : "My composition"
          }
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--so-border)",
            background: "var(--so-black)",
            color: "var(--so-cream)",
          }}
        />
      </label>

      {error ? (
        <p className="text-sm" style={{ color: "var(--so-rose)" }}>
          {error}
        </p>
      ) : null}
      {pending ? (
        <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Saving to library…
        </p>
      ) : null}

      <DesignCanvas
        tone="dark"
        blankUrl={blank?.imageUrl ?? null}
        designUrl={design?.previewUrl ?? null}
        blankLabel={blank?.name ?? "blank"}
        designLabel={design?.name ?? "design"}
        exportLabel="Save to library"
        onExport={async (blob, suggested) => {
          setError(null);
          const file = new File([blob], `${suggested}.png`, { type: "image/png" });
          const formData = new FormData();
          formData.set(
            "name",
            name.trim() ||
              (blank && design ? `${design.name} on ${blank.name}` : suggested),
          );
          formData.set("file", file);
          startTransition(async () => {
            try {
              await saveCanvasCompositionAction(formData);
            } catch (err) {
              // redirect() throws; ignore NEXT_REDIRECT
              if (err && typeof err === "object" && "digest" in err) return;
              setError("Couldn't save composition.");
            }
          });
        }}
      />
    </div>
  );
}
