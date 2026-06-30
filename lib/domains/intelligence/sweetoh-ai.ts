/**
 * Sweet'Oh AI — venture/persona layer over Dekaz PIE for Sweet'Oh Creations ops.
 * Does not own Product Intelligence Engine; delegates to pie.ts.
 */
import {
  createPieProductDraft,
  describePieInputMode,
  resolvePieInputMode,
  type PieDraftInput,
  type PieInputMode,
} from "./pie";

export type SweetOhAiInputMode = PieInputMode;
export type SweetOhAiDraftInput = PieDraftInput;

export const resolveSweetOhAiInputMode = resolvePieInputMode;
export const describeSweetOhAiInputMode = describePieInputMode;
export const createSweetOhAiProductDraft = createPieProductDraft;
