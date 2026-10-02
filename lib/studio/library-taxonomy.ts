import { STUDIO_ASSET_MANIFEST } from "./asset-manifest";
import type { StudioAssetMetadata } from "./asset-library-client";

/**
 * How the Studio library is organized. Every asset has one TYPE (what kind of art it is) and
 * one primary TOPIC (what it is about), derived from its source and metadata. The browser
 * shows curated shelves per topic instead of one long list.
 */
export const LIBRARY_TYPES = ["Illustrations", "Icons", "Emoji", "Patterns", "Frames", "Silhouettes", "Vintage & art"] as const;
export type LibraryType = (typeof LIBRARY_TYPES)[number];

export const LIBRARY_TOPICS = [
  "Ocean & islands", "Plants & flowers", "Animals", "Food & drink", "Travel & places", "People & characters",
  "Celebrations", "Sports & hobbies", "Space & science", "Symbols & shapes", "Nature & weather", "Fantasy & adventure", "Patterns & textures", "Decorative",
] as const;
export type LibraryTopic = (typeof LIBRARY_TOPICS)[number];

export type LibraryAsset = StudioAssetMetadata & { type: LibraryType; topic: LibraryTopic; origin: string; haystack: string; /** Specialist art (museum plates, playing cards, game kits): reachable, but kept out of default shelves and ranked last in search. */ niche: boolean };

const TOPIC_RULES: readonly [LibraryTopic, RegExp][] = [
  ["Fantasy & adventure", /\b(pirate|medieval|dungeon|western|ruins|fantasy|dragon|knight|wizard|magic|sword|treasure|skull|viking|castle|unicorn|fairy)\b/i],
  ["Space & science", /\b(space|star|moon|planet|science|technology|celestial|rocket|astronaut|galaxy|atom|robot|computer|code|lab|dna|telescope|cyberpunk|tech|idea|bulb)\b/i],
  ["Ocean & islands", /\b(ocean|sea|marine|fish|shell|wave|island|nautical|boat|ship|beach|coral|whale|dolphin|turtle|pacific|palm|tropical|surf|anchor|lighthouse|sail|mermaid|octopus|crab|shark|seahorse|jellyfish|starfish|canoe|lagoon)\b/i],
  ["Plants & flowers", /\b(plant|flower|leaf|leaves|botanical|tree|garden|hibiscus|fern|floral|blossom|rose|tulip|cactus|bamboo|herb|succulent|mushroom|fungi|cryptogam|moss|vine|petal|bouquet|orchid|lily|sunflower)\b/i],
  ["Animals", /\b(animal|bird|cat|dog|horse|insect|butterfly|reptile|amphibian|mammal|pet|bear|lion|tiger|elephant|monkey|rabbit|fox|owl|frog|snake|bee|spider|deer|wolf|pig|cow|chicken|duck|penguin|dinosaur|beetle|lizard)\b/i],
  ["Food & drink", /\b(food|drink|fruit|coffee|pizza|burger|cake|cookie|bread|vegetable|tea|wine|beer|cocktail|ice cream|donut|sushi|taco|fries|sandwich|apple|banana|pineapple|coconut|cherry|lemon|avocado)\b/i],
  ["Travel & places", /\b(travel|place|map|city|building|landmark|compass|airplane|plane|train|car|bus|bike|road|house|home|castle|tower|bridge|passport|globe|luggage|hotel|chart|town)\b/i],
  ["People & characters", /\b(people|person|character|peep|kid|kids|family|occupation|worker|doctor|chef|man|woman|girl|boy|baby|face|hand|expression|avatar|couple|crowd)\b/i],
  ["Celebrations", /\b(holiday|celebration|christmas|halloween|birthday|wedding|love|heart|party|gift|season|easter|valentine|thanksgiving|new year|balloon|confetti|ribbon|crown|trophy|congrat|anniversary|graduation|faith|cross|pray)\b/i],
  ["Sports & hobbies", /\b(sport|hobby|hobbies|music|dance|game|craft|education|school|book|ball|guitar|piano|paint|camera|gym|soccer|basketball|baseball|golf|tennis|yoga|fishing|camping|knit|sew|chess|card|cards)\b/i],
  ["Nature & weather", /\b(nature|weather|mountain|sun|cloud|landscape|outdoor|rain|snow|storm|forest|river|lake|desert|volcano|sunset|sunrise|rainbow|wind|fire|earth|rock)\b/i],
  ["Symbols & shapes", /\b(symbol|arrow|shape|icon|accent|line art|badge|sticker|check|mark|sign|logo|bolt|infinity|circle|square)\b/i],
];

function typeOf(asset: StudioAssetMetadata): LibraryType {
  const source = asset.source.toLowerCase();
  const category = asset.category.toLowerCase();
  if (asset.kind === "pattern" || /hero pattern|patternfills|opengameart|textile|uigradients|pattern/.test(source) || /pattern|texture|background/.test(category)) return "Patterns";
  if (/frame|border/.test(category)) return "Frames";
  if (/openmoji/.test(source)) return "Emoji";
  if (/tabler|feather|font awesome|open crop/.test(source)) return "Icons";
  if (/phylopic/.test(source)) return "Silhouettes";
  if (/wellcome|smithsonian|metropolitan|cleveland|wikimedia|europeana|national museum/.test(source)) return "Vintage & art";
  return "Illustrations";
}

function topicOf(asset: StudioAssetMetadata, type: LibraryType): LibraryTopic {
  if (type === "Patterns") return "Patterns & textures";
  if (type === "Frames") return "Decorative";
  if (type === "Silhouettes") return TOPIC_RULES.find(([topic]) => topic === "Plants & flowers")![1].test(`${asset.name} ${asset.tags.join(" ")}`) ? "Plants & flowers" : "Animals";
  if (type === "Icons") return "Symbols & shapes";
  const text = `${asset.category} ${asset.name} ${asset.tags.join(" ")} ${/kitbitz/i.test(asset.source) ? asset.source : ""}`;
  for (const [topic, rule] of TOPIC_RULES) if (rule.test(text)) return topic;
  return "Decorative";
}

function originOf(asset: StudioAssetMetadata): string {
  if (asset.source === "SweetOh OS") return "SweetOh original";
  return asset.source.split(/ — |;|\(/, 1)[0].replace(/\s+/g, " ").trim().slice(0, 40);
}

/** How strongly an asset belongs to its topic: a keyword in the name beats one in the tags. */
function relevance(asset: LibraryAsset): number {
  const rule = TOPIC_RULES.find(([topic]) => topic === asset.topic)?.[1];
  if (!rule) return 0;
  return (rule.test(asset.name) ? 3 : 0) + (rule.test(asset.tags.join(" ")) ? 1 : 0);
}
const NICHE_KITS = /\((dungeon|ruins|cyberpunk|medieval|western|interior|city) kit/i;
function isNiche(asset: StudioAssetMetadata, type: LibraryType): boolean {
  return type === "Vintage & art" || /playing cards|card back/i.test(`${asset.source} ${asset.category}`) || NICHE_KITS.test(asset.source);
}

const PRIORITY = (asset: LibraryAsset) => (asset.origin === "SweetOh original" ? 0 : asset.type === "Illustrations" ? 1 : asset.type === "Vintage & art" ? 2 : 3);

let cache: readonly LibraryAsset[] | null = null;
/** All Studio-approved assets with their type and topic, best-first within each group. */
export function libraryAssets(): readonly LibraryAsset[] {
  if (cache) return cache;
  cache = STUDIO_ASSET_MANIFEST.filter((asset) => asset.studioUseApproved)
    .map((asset): LibraryAsset => {
      const type = typeOf(asset);
      return { ...asset, type, topic: topicOf(asset, type), origin: originOf(asset), niche: isNiche(asset, type), haystack: `${asset.name} ${asset.category} ${asset.tags.join(" ")} ${type}`.toLowerCase() };
    })
    .sort((a, b) => PRIORITY(a) - PRIORITY(b) || a.name.localeCompare(b.name));
  // Within a topic the clearest matches come first, so shelf previews actually look like the shelf.
  cache = [...cache].sort((a, b) => relevance(b) - relevance(a) || PRIORITY(a) - PRIORITY(b) || a.name.localeCompare(b.name));
  return cache;
}

export type LibraryShelf = { id: string; title: string; subtitle?: string; filter: { type?: LibraryType; topic?: LibraryTopic; origin?: string; includeNiche?: boolean } };
/** Curated shelves for the browse view, in the order a person would reach for them. */
export const LIBRARY_SHELVES: readonly LibraryShelf[] = [
  { id: "sweetoh", title: "SweetOh originals", subtitle: "Drawn for SweetOh", filter: { origin: "SweetOh original" } },
  { id: "ocean", title: "Ocean & islands", filter: { topic: "Ocean & islands" } },
  { id: "plants", title: "Plants & flowers", filter: { topic: "Plants & flowers" } },
  { id: "animals", title: "Animals", filter: { topic: "Animals" } },
  { id: "patterns", title: "Patterns & textures", filter: { type: "Patterns" } },
  { id: "frames", title: "Frames & borders", filter: { type: "Frames" } },
  { id: "emoji", title: "Emoji & stickers", filter: { type: "Emoji" } },
  { id: "icons", title: "Icons", filter: { type: "Icons" } },
  { id: "food", title: "Food & drink", filter: { topic: "Food & drink" } },
  { id: "celebrate", title: "Celebrations", filter: { topic: "Celebrations" } },
  { id: "travel", title: "Travel & places", filter: { topic: "Travel & places" } },
  { id: "people", title: "People & characters", filter: { topic: "People & characters" } },
  { id: "adventure", title: "Fantasy & adventure", filter: { topic: "Fantasy & adventure" } },
  { id: "space", title: "Space & science", filter: { topic: "Space & science" } },
  { id: "hobbies", title: "Sports & hobbies", filter: { topic: "Sports & hobbies" } },
  { id: "vintage", title: "Vintage & museum art", subtitle: "Museum plates and engravings", filter: { type: "Vintage & art", includeNiche: true } },
  { id: "silhouettes", title: "Silhouettes", filter: { type: "Silhouettes" } },
];

/** Merch-friendly subjects people reach for first; one standout per subject makes the "Trending" shelf. */
const TRENDING_TERMS = ["sun", "sunset", "wave", "palm", "hibiscus", "flower", "heart", "star", "sparkle", "moon", "mountain", "anchor", "shell", "turtle", "dolphin", "whale", "coffee", "camera", "music", "rainbow", "leaf", "butterfly", "cat", "dog", "skull", "rose", "crown", "lightning", "fire", "mushroom", "cactus", "pineapple", "surf", "boat", "airplane", "balloon", "gift", "cake", "peace", "smile"];
export function trendingAssets(assets: readonly LibraryAsset[], limit = 16): LibraryAsset[] {
  const used = new Set<string>();
  const picks: LibraryAsset[] = [];
  for (const term of TRENDING_TERMS) {
    const hit = assets
      .filter((asset) => !asset.niche && asset.type !== "Patterns" && asset.type !== "Frames" && !used.has(asset.id) && new RegExp(`\\b${term}s?\\b`, "i").test(asset.name))
      .sort((a, b) => Number(b.type === "Illustrations" || b.type === "Emoji") - Number(a.type === "Illustrations" || a.type === "Emoji"))[0];
    if (hit) { used.add(hit.id); picks.push(hit); }
    if (picks.length >= limit) break;
  }
  return picks;
}

function queryScore(asset: LibraryAsset, terms: readonly string[]): number {
  const name = asset.name.toLowerCase();
  return terms.reduce((total, term) => total + (new RegExp(`\\b${term}`).test(name) ? 4 : name.includes(term) ? 2 : 1), 0) - (asset.niche ? 3 : 0);
}

export function filterLibrary(assets: readonly LibraryAsset[], filter: LibraryShelf["filter"] & { query?: string }): LibraryAsset[] {
  const terms = (filter.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  // Specialist art stays out of default browsing but is always reachable by type, by search, or by its own tab.
  const showNiche = Boolean(filter.includeNiche || filter.type === "Vintage & art" || terms.length);
  const matches = assets.filter((asset) =>
    (showNiche || !asset.niche) && (!filter.type || asset.type === filter.type) && (!filter.topic || asset.topic === filter.topic) && (!filter.origin || asset.origin === filter.origin)
    && terms.every((term) => asset.haystack.includes(term) || asset.haystack.includes(term.replace(/s$/, ""))));
  return terms.length ? matches.sort((a, b) => queryScore(b, terms) - queryScore(a, terms)) : matches;
}
