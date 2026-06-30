/** @deprecated Use pie-readiness.ts — legacy AI Product Builder naming. */
export {
  assertPieImageIntakeReady as assertAiImageIntakeReady,
  assertPieReady as assertAiProductBuilderReady,
  getPieReadiness as getAiProductBuilderReadiness,
  isPieImageIntakeReady as isAiImageIntakeReady,
  PIE_E2E_STEPS as AI_BUILDER_E2E_STEPS,
  type PieReadinessCheck as AiProductBuilderReadinessCheck,
} from "./pie-readiness";
