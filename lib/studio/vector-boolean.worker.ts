import { computeBoolean, type BooleanOp } from "./vector-boolean-core";
import type { Contour } from "./vector-path";

self.onmessage = (event: MessageEvent<{ op: BooleanOp; inputs: Contour[][] }>) => {
  try {
    (self as unknown as Worker).postMessage({ ok: true, contours: computeBoolean(event.data.op, event.data.inputs) });
  } catch (error) {
    (self as unknown as Worker).postMessage({ ok: false, error: error instanceof Error ? error.message : "Couldn’t combine these shapes." });
  }
};
