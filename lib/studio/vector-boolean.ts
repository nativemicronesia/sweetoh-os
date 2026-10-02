import type { Contour } from "./vector-path";
import type { BooleanOp } from "./vector-boolean-core";

export type { BooleanOp };
export const BOOLEAN_OPS: { op: BooleanOp; label: string; hint: string }[] = [
  { op: "unite", label: "Unite", hint: "Merge the shapes into one" },
  { op: "subtract", label: "Subtract", hint: "Cut the top shapes out of the bottom one" },
  { op: "intersect", label: "Intersect", hint: "Keep only where the shapes overlap" },
  { op: "exclude", label: "Exclude", hint: "Keep everything except where they overlap" },
];

export const TOO_COMPLEX = "These shapes are too complex to combine, or their edges touch exactly. Move one a little and try again.";

/** Runs one attempt and gives up after `ms`. `run` may be a real Worker or a test double. */
export function withTimeout<T>(run: () => { promise: Promise<T>; cancel: () => void }, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const job = run();
    const timer = setTimeout(() => { job.cancel(); reject(new Error(TOO_COMPLEX)); }, ms);
    job.promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

function inWorker(op: BooleanOp, inputs: Contour[][]) {
  const worker = new Worker(new URL("./vector-boolean.worker.ts", import.meta.url));
  const promise = new Promise<Contour[]>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<{ ok: true; contours: Contour[] } | { ok: false; error: string }>) => {
      worker.terminate();
      if (event.data.ok) resolve(event.data.contours); else reject(new Error(event.data.error));
    };
    worker.onerror = () => { worker.terminate(); reject(new Error("Couldn’t combine these shapes.")); };
    worker.postMessage({ op, inputs });
  });
  return { promise, cancel: () => worker.terminate() };
}

/** Nudge every shape after the first by a hair, so exactly touching edges stop being degenerate. */
export function nudged(inputs: Contour[][], amount = 0.02): Contour[][] {
  return inputs.map((contours, index) => index === 0 ? contours : contours.map((c) => ({ ...c, nodes: c.nodes.map((n) => ({ ...n, x: n.x + amount, y: n.y + amount * 0.7, inX: n.inX + amount, inY: n.inY + amount * 0.7, outX: n.outX + amount, outY: n.outY + amount * 0.7 })) })));
}

/**
 * Combine closed outlines; the first input is the base (bottom-most). Runs off
 * the page thread with a time limit, and retries once with a tiny nudge when the
 * first try never finishes.
 */
export async function combineContours(op: BooleanOp, inputs: Contour[][], runner: (op: BooleanOp, inputs: Contour[][]) => { promise: Promise<Contour[]>; cancel: () => void } = inWorker): Promise<Contour[]> {
  if (inputs.length < 2) throw new Error("Select at least two shapes to combine.");
  try {
    return await withTimeout(() => runner(op, inputs), 2500);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== TOO_COMPLEX) throw error;
    return withTimeout(() => runner(op, nudged(inputs)), 5000);
  }
}
