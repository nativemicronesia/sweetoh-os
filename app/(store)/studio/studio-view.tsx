"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DesignCanvas } from "@/components/design-canvas";
import { useCart } from "@/lib/cart/cart-context";
import { formatPrice } from "@/lib/shared/format";
import type { ProductCategory } from "@/lib/domains/catalog/categories";
import {
  confirmDesignAndAddToCart,
  generateDesignPreview,
  transcribeVoiceNote,
} from "./actions";

export type StudioBlank = {
  id: string;
  name: string;
  priceCents: number;
  category: ProductCategory;
  imageUrl: string | null;
};

export type StudioLibraryItem = {
  id: string;
  name: string;
  previewUrl: string | null;
};

type DesignMode = "ai" | "upload" | "library" | "place";

const MODE_LABELS: Record<DesignMode, string> = {
  ai: "Create with AI",
  upload: "Upload design",
  library: "Browse library",
  place: "Place on blank",
};

export function StudioView({
  blanks,
  library,
  categoryLabels,
}: {
  blanks: StudioBlank[];
  library: StudioLibraryItem[];
  categoryLabels: { value: ProductCategory; label: string }[];
}) {
  const router = useRouter();
  const { addItem } = useCart();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");
  const [basedOnProductId, setBasedOnProductId] = useState(blanks[0]?.id ?? "");
  const [designMode, setDesignMode] = useState<DesignMode>("ai");
  const [prompt, setPrompt] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [libraryAssetId, setLibraryAssetId] = useState<string | null>(null);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const [generating, startGenerating] = useTransition();
  const [confirming, startConfirming] = useTransition();
  const [transcribing, startTranscribing] = useTransition();
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const filteredBlanks = useMemo(
    () =>
      categoryFilter === "all"
        ? blanks
        : blanks.filter((blank) => blank.category === categoryFilter),
    [blanks, categoryFilter],
  );

  const selectedBlank = blanks.find((blank) => blank.id === basedOnProductId) ?? null;
  const selectedLibrary = library.find((item) => item.id === libraryAssetId) ?? null;

  function pickBlank(id: string) {
    setBasedOnProductId(id);
    setProjectId(null);
    setPreviewUrl(null);
    setAdded(false);
    setStep(2);
  }

  function generate() {
    setError(null);
    setProjectId(null);
    setPreviewUrl(null);
    setAdded(false);

    if (!basedOnProductId || !selectedBlank) {
      setError("Pick a blank product first.");
      setStep(1);
      return;
    }
    if (!customerEmail.trim()) {
      setError("We need your email so we can follow up on this design.");
      return;
    }
    if (designMode === "ai" && !prompt.trim()) {
      setError("Describe your design, or record a voice note.");
      return;
    }
    if (designMode === "upload" && !referenceFile) {
      setError("Upload a design image.");
      return;
    }
    if (designMode === "library" && !libraryAssetId) {
      setError("Pick a design from the library.");
      return;
    }
    if (designMode === "place") {
      setError("Use Place on blank — drag, then tap Preview mockup on the canvas.");
      return;
    }

    const formData = new FormData();
    formData.set("prompt", prompt);
    formData.set("customerEmail", customerEmail);
    formData.set("customerName", customerName);
    formData.set("designMode", designMode);
    formData.set("blankProductName", selectedBlank.name);
    formData.set("blankProductId", selectedBlank.id);
    if (libraryAssetId) formData.set("libraryAssetId", libraryAssetId);
    if (referenceFile) formData.set("referenceImage", referenceFile);

    startGenerating(async () => {
      const result = await generateDesignPreview(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setProjectId(result.projectId);
      setPreviewUrl(result.mockupPreviewUrl);
      setStep(3);
    });
  }

  function confirmAndAddToCart() {
    if (!projectId || !basedOnProductId) return;
    setError(null);

    startConfirming(async () => {
      const result = await confirmDesignAndAddToCart({ projectId, basedOnProductId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      addItem({
        productId: result.productId,
        slug: result.slug,
        name: result.name,
        priceCents: result.priceCents,
        imageUrl: result.imageUrl,
      });
      setAdded(true);
      setTimeout(() => router.push("/cart"), 900);
    });
  }

  async function startRecording() {
    if (typeof window === "undefined" || !navigator.mediaDevices) {
      setError("Voice recording isn't supported in this browser — try typing instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;

        const formData = new FormData();
        formData.set("audio", blob, "voice-note.webm");
        startTranscribing(async () => {
          const result = await transcribeVoiceNote(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setPrompt((prev) => (prev ? `${prev} ${result.text}` : result.text));
        });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Mic permission needed to record a voice note.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  return (
    <div className="space-y-8">
      <ol className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-wide so-muted">
        {[
          { n: 1 as const, label: "Blank" },
          { n: 2 as const, label: "Design" },
          { n: 3 as const, label: "Preview" },
        ].map((item) => (
          <li key={item.n}>
            <button
              type="button"
              onClick={() => setStep(item.n)}
              className={`rounded-full px-3 py-1 ${
                step === item.n
                  ? "bg-[color:var(--so-gold)] text-[color:var(--so-black)]"
                  : "border border-[color:var(--so-border)] so-muted hover:border-[color:var(--so-gold)]"
              }`}
            >
              {item.n}. {item.label}
            </button>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--so-cream)]">Choose a blank</h2>
            <p className="mt-1 text-sm so-muted">
              Pick what Sweet&apos;Oh will print on — apparel, kids, home, and more.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`rounded-full border px-3 py-1 text-xs ${
                categoryFilter === "all"
                  ? "border-[color:var(--so-gold)] bg-[color:var(--so-gold)] text-[color:var(--so-black)]"
                  : "border-[color:var(--so-border)] text-[color:var(--so-mist)]"
              }`}
            >
              All
            </button>
            {categoryLabels.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategoryFilter(item.value)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  categoryFilter === item.value
                    ? "border-[color:var(--so-gold)] bg-[color:var(--so-gold)] text-[color:var(--so-black)]"
                    : "border-[color:var(--so-border)] text-[color:var(--so-mist)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {filteredBlanks.length === 0 ? (
            <p className="text-sm so-muted">No blanks in this aisle yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBlanks.map((blank) => {
                const selected = blank.id === basedOnProductId;
                return (
                  <button
                    key={blank.id}
                    type="button"
                    onClick={() => pickBlank(blank.id)}
                    className={`overflow-hidden rounded-xl border text-left transition ${
                      selected
                        ? "border-[color:var(--so-gold)] ring-2 ring-[color:var(--so-gold)]"
                        : "border-[color:var(--so-border)] hover:border-[color:var(--so-gold-dim)]"
                    }`}
                  >
                    <div className="aspect-square bg-[color:var(--so-surface)]">
                      {blank.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={blank.imageUrl}
                          alt={blank.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs so-muted">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="text-sm font-medium text-[color:var(--so-cream)]">{blank.name}</p>
                      <p className="text-xs so-muted">
                        {categoryLabels.find((c) => c.value === blank.category)?.label ??
                          blank.category}{" "}
                        · {formatPrice(blank.priceCents)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--so-cream)]">Add your design</h2>
              <p className="mt-1 text-sm so-muted">
                On{" "}
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => setStep(1)}
                >
                  {selectedBlank?.name ?? "your blank"}
                </button>
                . Create with AI, upload artwork, or browse Sweet&apos;Oh&apos;s library.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.keys(MODE_LABELS) as DesignMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setDesignMode(mode);
                    setError(null);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    designMode === mode
                      ? "border-[color:var(--so-gold)] bg-[color:var(--so-gold)] text-[color:var(--so-black)]"
                      : "border-[color:var(--so-border)] text-[color:var(--so-mist)]"
                  }`}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-[color:var(--so-cream)]">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-[color:var(--so-border)] bg-[color:var(--so-surface)] px-3 py-2 text-sm text-[color:var(--so-cream)] placeholder:text-[color:var(--so-cream-dim)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[color:var(--so-cream)]">
                  Name (optional)
                </label>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="w-full rounded-lg border border-[color:var(--so-border)] bg-[color:var(--so-surface)] px-3 py-2 text-sm text-[color:var(--so-cream)] placeholder:text-[color:var(--so-cream-dim)]"
                />
              </div>
            </div>

            {designMode === "ai" ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-[color:var(--so-cream)]">
                  Describe your design
                </label>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={4}
                  placeholder="A watercolor sea turtle with a sunset…"
                  className="w-full rounded-lg border border-[color:var(--so-border)] bg-[color:var(--so-surface)] px-3 py-2 text-sm text-[color:var(--so-cream)] placeholder:text-[color:var(--so-cream-dim)]"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={recording ? stopRecording : startRecording}
                    className="rounded-full border border-[color:var(--so-border)] px-3 py-1.5 text-xs font-medium text-[color:var(--so-mist)] hover:bg-[color:var(--so-surface)]"
                  >
                    {recording ? "Stop recording" : "Record instead"}
                  </button>
                  {transcribing && (
                    <span className="text-xs so-muted">Transcribing…</span>
                  )}
                </div>
                <div className="mt-3">
                  <label className="mb-1 block text-sm font-medium text-[color:var(--so-cream)]">
                    Reference image (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)}
                    className="text-sm"
                  />
                </div>
              </div>
            ) : null}

            {designMode === "upload" ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--so-cream)]">
                    Upload your artwork
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)}
                    className="text-sm"
                  />
                  {referenceFile ? (
                    <p className="mt-1 text-xs so-muted">{referenceFile.name}</p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--so-cream)]">
                    Notes (optional)
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={2}
                    placeholder="Placement, colors, text…"
                    className="w-full rounded-lg border border-[color:var(--so-border)] bg-[color:var(--so-surface)] px-3 py-2 text-sm text-[color:var(--so-cream)] placeholder:text-[color:var(--so-cream-dim)]"
                  />
                </div>
              </div>
            ) : null}

            {designMode === "library" ? (
              <div className="space-y-3">
                {library.length === 0 ? (
                  <p className="text-sm so-muted">
                    No approved library designs yet. Upload your own or create with AI.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {library.map((item) => {
                      const selected = item.id === libraryAssetId;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setLibraryAssetId(item.id)}
                          className={`overflow-hidden rounded-lg border text-left ${
                            selected
                              ? "border-[color:var(--so-gold)] ring-2 ring-[color:var(--so-gold)]"
                              : "border-[color:var(--so-border)] hover:border-[color:var(--so-gold-dim)]"
                          }`}
                        >
                          <div className="aspect-square bg-[color:var(--so-surface)]">
                            {item.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.previewUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] so-muted">
                                Design
                              </div>
                            )}
                          </div>
                          <p className="truncate px-2 py-1.5 text-xs text-[color:var(--so-cream)]">
                            {item.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--so-cream)]">
                    Notes (optional)
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={2}
                    placeholder="Any placement notes…"
                    className="w-full rounded-lg border border-[color:var(--so-border)] bg-[color:var(--so-surface)] px-3 py-2 text-sm text-[color:var(--so-cream)] placeholder:text-[color:var(--so-cream-dim)]"
                  />
                </div>
              </div>
            ) : null}

            {designMode === "place" ? (
              <div className="space-y-3">
                {library.length === 0 ? (
                  <p className="text-sm so-muted">
                    Need an approved library design to place. Use Upload or AI first, or ask
                    Sweet&apos;Oh to add designs.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {library.map((item) => {
                        const selected = item.id === libraryAssetId;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setLibraryAssetId(item.id)}
                            className={`overflow-hidden rounded-lg border text-left ${
                              selected
                                ? "border-[color:var(--so-gold)] ring-2 ring-[color:var(--so-gold)]"
                                : "border-[color:var(--so-border)] hover:border-[color:var(--so-gold-dim)]"
                            }`}
                          >
                            <div className="aspect-square bg-[color:var(--so-surface)]">
                              {item.previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.previewUrl}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <p className="truncate px-2 py-1.5 text-xs text-[color:var(--so-cream)]">
                              {item.name}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    <DesignCanvas
                      tone="light"
                      blankUrl={selectedBlank?.imageUrl ?? null}
                      designUrl={selectedLibrary?.previewUrl ?? null}
                      blankLabel={selectedBlank?.name ?? "blank"}
                      designLabel={selectedLibrary?.name ?? "design"}
                      exportLabel={generating ? "Building…" : "Preview mockup"}
                      onExport={async (blob, suggested) => {
                        setError(null);
                        if (!customerEmail.trim()) {
                          setError("Enter your email above first.");
                          return;
                        }
                        if (!selectedBlank) {
                          setError("Pick a blank first.");
                          return;
                        }
                        const file = new File([blob], `${suggested}.png`, {
                          type: "image/png",
                        });
                        const formData = new FormData();
                        formData.set(
                          "prompt",
                          prompt.trim() || `Canvas placement of ${selectedLibrary?.name ?? "design"} on ${selectedBlank.name}`,
                        );
                        formData.set("customerEmail", customerEmail);
                        formData.set("customerName", customerName);
                        formData.set("designMode", "place");
                        formData.set("blankProductName", selectedBlank.name);
                        formData.set("blankProductId", selectedBlank.id);
                        formData.set("referenceImage", file);
                        startGenerating(async () => {
                          const result = await generateDesignPreview(formData);
                          if (!result.ok) {
                            setError(result.error);
                            return;
                          }
                          setProjectId(result.projectId);
                          setPreviewUrl(result.mockupPreviewUrl);
                          setStep(3);
                        });
                      }}
                    />
                  </>
                )}
              </div>
            ) : null}

            {error ? <p className="text-sm text-[color:var(--so-rose)]">{error}</p> : null}

            {designMode !== "place" ? (
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="w-full rounded-lg bg-[color:var(--so-gold)] px-4 py-3 text-sm font-medium text-[color:var(--so-black)] disabled:opacity-50"
              >
                {generating ? "Building preview…" : "Preview on mockup"}
              </button>
            ) : null}
          </div>

          <div className="rounded-xl border border-dashed border-[color:var(--so-border)] bg-[color:var(--so-surface)] p-6">
            <p className="text-sm font-medium text-[color:var(--so-cream)]">Selected blank</p>
            {selectedBlank ? (
              <div className="mt-3 space-y-2">
                <div className="aspect-square max-w-xs overflow-hidden rounded-lg bg-[color:var(--so-surface)]">
                  {selectedBlank.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedBlank.imageUrl}
                      alt={selectedBlank.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <p className="text-sm text-[color:var(--so-mist)]">
                  {selectedBlank.name} — {formatPrice(selectedBlank.priceCents)}
                </p>
                {designMode === "library" && selectedLibrary ? (
                  <p className="text-xs so-muted">
                    Library: {selectedLibrary.name}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm so-muted">Pick a blank in step 1.</p>
            )}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col items-center justify-center rounded-xl border border-[color:var(--so-border)] bg-[color:var(--so-surface)] p-6">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Design mockup preview"
                className="mx-auto max-h-96 rounded-lg border border-[color:var(--so-border)] bg-[color:var(--so-dark)] object-contain"
              />
            ) : (
              <p className="text-sm so-muted">No preview yet.</p>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--so-cream)]">Preview & cart</h2>
              <p className="mt-1 text-sm so-muted">
                {selectedBlank
                  ? `On ${selectedBlank.name} — ${formatPrice(selectedBlank.priceCents)}`
                  : null}
              </p>
            </div>
            {error ? <p className="text-sm text-[color:var(--so-rose)]">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg border border-[color:var(--so-border)] px-4 py-2 text-sm font-medium text-[color:var(--so-mist)]"
              >
                Back to design
              </button>
              <button
                type="button"
                onClick={confirmAndAddToCart}
                disabled={confirming || !previewUrl}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
              >
                {added ? "Added to cart!" : confirming ? "Adding…" : "Add to cart"}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
