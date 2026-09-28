/** Stable font keys and the license notice shipped with this application. */
const ofl = (directory: string) => ({
  license: "SIL Open Font License 1.1",
  source: `https://github.com/google/fonts/tree/main/ofl/${directory}`,
  notice: `docs/licenses/fonts/${directory}-OFL.txt`,
});

export const STUDIO_FONT_PROVENANCE = {
  inter: ofl("inter"),
  montserrat: ofl("montserrat"),
  anton: ofl("anton"),
  bebas: ofl("bebasneue"),
  oswald: ofl("oswald"),
  playfair: ofl("playfairdisplay"),
  pacifico: ofl("pacifico"),
  marker: { license: "Apache License 2.0", source: "https://github.com/google/fonts/tree/main/apache/permanentmarker", notice: "docs/licenses/fonts/permanentmarker-APACHE.txt" },
  caveat: ofl("caveat"),
  lobster: ofl("lobster"),
  barlow: ofl("barlowcondensed"),
  space: ofl("spacegrotesk"),
  fraunces: ofl("fraunces"),
  kalam: ofl("kalam"),
  tiltWarp: ofl("tiltwarp"),
} as const;

/** Stable names/rights for catalog search without loading fonts into the canvas. */
export const STUDIO_FONT_LABELS: Record<keyof typeof STUDIO_FONT_PROVENANCE, string> = {
  inter: "Inter", montserrat: "Montserrat", anton: "Anton", bebas: "Bebas Neue", oswald: "Oswald", playfair: "Playfair Display", pacifico: "Pacifico", marker: "Permanent Marker", caveat: "Caveat", lobster: "Lobster", barlow: "Barlow Condensed", space: "Space Grotesk", fraunces: "Fraunces", kalam: "Kalam", tiltWarp: "Tilt Warp",
};

export type StudioFontKey = keyof typeof STUDIO_FONT_PROVENANCE;
export function isStudioFontKey(key: string | undefined): key is StudioFontKey {
  return Boolean(key && Object.hasOwn(STUDIO_FONT_PROVENANCE, key));
}
/** Saved fonts removed from this build fall back to the bundled Inter family. */
export function resolveStudioFontKey(key: string | undefined): StudioFontKey {
  return isStudioFontKey(key) ? key : "inter";
}
