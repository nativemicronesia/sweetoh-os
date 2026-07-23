"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/cart-context";
import { formatPrice } from "@/lib/shared/format";
import { confirmDesignAndAddToCart, generateDesignPreview, transcribeVoiceNote } from "./actions";

type BaseProduct = { id: string; name: string; priceCents: number };

export function CreateView({ products }: { products: BaseProduct[] }) {
  const router = useRouter();
  const { addItem } = useCart();

  const [basedOnProductId, setBasedOnProductId] = useState(products[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);

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

  const selectedProduct = products.find((p) => p.id === basedOnProductId) ?? null;

  function generate() {
    setError(null);
    setProjectId(null);
    setPreviewUrl(null);

    if (!basedOnProductId) {
      setError("Pick what you're putting this on first.");
      return;
    }
    if (!prompt.trim()) {
      setError("Describe what you'd like, or record a voice note.");
      return;
    }
    if (!customerEmail.trim()) {
      setError("We need your email so we can follow up on this design.");
      return;
    }

    const formData = new FormData();
    formData.set("prompt", prompt);
    formData.set("customerEmail", customerEmail);
    formData.set("customerName", customerName);
    if (referenceFile) formData.set("referenceImage", referenceFile);

    startGenerating(async () => {
      const result = await generateDesignPreview(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setProjectId(result.projectId);
      setPreviewUrl(result.mockupPreviewUrl);
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
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-800">
            What are you putting this on?
          </label>
          <select
            value={basedOnProductId}
            onChange={(event) => setBasedOnProductId(event.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            {products.length === 0 && <option value="">No products available yet</option>}
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatPrice(p.priceCents)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-800">
            Describe your design
          </label>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            placeholder="A watercolor sea turtle with a sunset..."
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {recording ? "Stop recording" : "🎙 Record instead"}
            </button>
            {transcribing && <span className="text-xs text-neutral-400">Transcribing…</span>}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-800">
            Reference image (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-800">Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-800">
              Name (optional)
            </label>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate my design"}
        </button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6">
        {previewUrl ? (
          <div className="w-full space-y-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Generated design preview"
              className="mx-auto max-h-80 rounded-lg border border-neutral-200 bg-white object-contain"
            />
            {selectedProduct && (
              <p className="text-sm text-neutral-600">
                On {selectedProduct.name} — {formatPrice(selectedProduct.priceCents)}
              </p>
            )}
            <button
              type="button"
              onClick={confirmAndAddToCart}
              disabled={confirming}
              className="w-full rounded-lg px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
            >
              {added ? "Added to cart!" : confirming ? "Adding…" : "Use this design — add to cart"}
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-neutral-400">
            Your generated design preview will appear here.
          </p>
        )}
      </div>
    </div>
  );
}
