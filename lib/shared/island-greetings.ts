/**
 * Hello across Micronesia — one greeting per island nation/territory, used by
 * the announcement bar, footer and Skink. FSM uses "Kamorale" (owner's pick).
 */
export const ISLAND_GREETINGS = [
  { greeting: "Håfa adai", place: "Guam & CNMI" },
  { greeting: "Alii", place: "Palau" },
  { greeting: "Kamorale", place: "FSM" },
  { greeting: "Iakwe", place: "Marshall Islands" },
  { greeting: "Ekamawir omo", place: "Nauru" },
  { greeting: "Mauri", place: "Kiribati" },
] as const;

export const GREETING_LINE = ISLAND_GREETINGS.map((g) => g.greeting).join(" · ");
