import { findStudioAssets } from "../lib/studio/asset-library-search";

const briefs = [
  "floral wedding invitation",
  "tropical baby shower",
  "kids birthday party",
  "island summer beach",
  "christmas gift tag",
  "halloween frame",
  "graduation badge",
  "sports border",
  "baseball sports design",
  "faith cross design",
  "elegant luxury invitation",
  "playful cute animal",
  "organic natural shape",
  "geometric modern poster",
  "vintage decorative frame",
  "food restaurant menu",
  "occupation teacher nurse",
  "hobby fishing gardening",
  "travel landmark postcard",
  "ocean fish sea life",
  "botanical flower bouquet",
  "ribbon banner sale label",
  "editable background gradient",
  "seamless texture pattern",
  "printable card decoration",
];

for (const brief of briefs) {
  const matches = findStudioAssets({ query: brief, kind: "any", limit: 8 });
  const labels = matches.slice(0, 5).map((asset) => `${asset.name} [${asset.source.split(" — ")[0]}]`);
  console.log(`${brief}: ${matches.length} | ${labels.join(" | ")}`);
}
