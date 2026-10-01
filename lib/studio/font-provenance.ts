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
  poppins: ofl("poppins"),
  raleway: ofl("raleway"),
  lato: ofl("lato"),
  opensans: ofl("opensans"),
  nunito: ofl("nunito"),
  rubik: ofl("rubik"),
  workSans: ofl("worksans"),
  dmSans: ofl("dmsans"),
  dmSerif: ofl("dmserifdisplay"),
  abril: ofl("abrilfatface"),
  bangers: ofl("bangers"),
  righteous: ofl("righteous"),
  fredoka: ofl("fredoka"),
  baloo: ofl("baloo2"),
  dancing: ofl("dancingscript"),
  greatVibes: ofl("greatvibes"),
  sacramento: ofl("sacramento"),
  shadows: ofl("shadowsintolight"),
  archivoBlack: ofl("archivoblack"),
  alfaSlab: ofl("alfaslabone"),
  cinzel: ofl("cinzel"),
  staatliches: ofl("staatliches"),
  lilita: ofl("lilitaone"),
} as const;

/** Stable names/rights for catalog search without loading fonts into the canvas. */
export const STUDIO_FONT_LABELS: Record<keyof typeof STUDIO_FONT_PROVENANCE, string> = {
  inter: "Inter", montserrat: "Montserrat", anton: "Anton", bebas: "Bebas Neue", oswald: "Oswald", playfair: "Playfair Display", pacifico: "Pacifico", marker: "Permanent Marker", caveat: "Caveat", lobster: "Lobster", barlow: "Barlow Condensed", space: "Space Grotesk", fraunces: "Fraunces", kalam: "Kalam", tiltWarp: "Tilt Warp", poppins: "Poppins", raleway: "Raleway", lato: "Lato", opensans: "Open Sans", nunito: "Nunito", rubik: "Rubik", workSans: "Work Sans", dmSans: "DM Sans", dmSerif: "DM Serif Display", abril: "Abril Fatface", bangers: "Bangers", righteous: "Righteous", fredoka: "Fredoka", baloo: "Baloo 2", dancing: "Dancing Script", greatVibes: "Great Vibes", sacramento: "Sacramento", shadows: "Shadows Into Light", archivoBlack: "Archivo Black", alfaSlab: "Alfa Slab One", cinzel: "Cinzel", staatliches: "Staatliches", lilita: "Lilita One"
};

export type StudioFontKey = keyof typeof STUDIO_FONT_PROVENANCE;
export function isStudioFontKey(key: string | undefined): key is StudioFontKey {
  return Boolean(key && Object.hasOwn(STUDIO_FONT_PROVENANCE, key));
}
/** Saved fonts removed from this build fall back to the bundled Inter family. */
export function resolveStudioFontKey(key: string | undefined): StudioFontKey {
  return isStudioFontKey(key) ? key : "inter";
}
