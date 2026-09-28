/** SweetOh-drawn vector compositions for cards, gifts, apparel and home goods. */
import type { StudioAsset } from "./asset-library";

const ink = "#173e39";
const license = "SweetOh original — free for SweetOh customer designs";
const rights = { commercialUse: true, modificationAllowed: true, redistributionAllowed: true, attributionRequired: false, attributionText: null } as const;
const svg = (viewBox: string, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body.replace(/<\/svg>$/, "")}</svg>`;
const line = `fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"`;
const fill = `fill="${ink}"`;

export const SWEETOH_ORIGINAL_ILLUSTRATION_ASSETS: readonly StudioAsset[] = [
  {
    id: "so-hibiscus-palm-corners-v1", name: "Hibiscus and palm invitation corners", kind: "element", category: "Frames",
    tags: ["tropical", "island", "hibiscus", "palm", "floral", "botanical", "corner", "frame", "border", "invitation", "summer", "beach", "cruise", "wedding", "luau", "sublimation", "printable"],
    license, source: "SweetOh OS", ...rights,
    svg: svg("0 0 800 800", `<g ${line}><path d="M48 298C49 165 128 75 293 47M63 192c78 2 137-43 170-126M101 115c57 48 116 44 176-10M129 76c-4 67 19 116 60 148M53 267c87-3 153-35 199-96M752 502c-4 134-83 223-248 251m233-145c-78-2-137 43-170 126m132-49c-57-48-116-44-176 10m148 29c4-67-19-116-60-148m192-43c-87 3-153 35-199 96"/><path d="M209 145c-34-38-25-74 14-87 16 31 11 59-14 87Zm-84 92c-48-17-66-51-40-84 32 15 45 43 40 84Zm526 326c34 38 25 74-14 87-16-31-11-59 14-87Zm84-92c48 17 66 51 40 84-32-15-45-43-40-84Z"/><path d="M610 107c-31-39-22-78 18-91 19 30 14 58-18 91Zm15 13c27-31 58-38 93-20-16 36-47 43-93 20Z"/><path d="M230 164c-29-24-31-49-4-74 25 23 27 48 4 74Zm0 0c-6-37 8-57 43-60 7 33-8 54-43 60Zm0 0c20-33 43-37 68-11-17 29-39 34-68 11Zm0 0c36-10 56 2 54 37-33 9-51-3-54-37Zm0 0c-31 23-54 18-68-14 27-22 49-17 68 14Z"/></g><circle cx="230" cy="164" r="11" ${fill}/><g ${fill}><circle cx="289" cy="48" r="9"/><circle cx="49" cy="294" r="9"/><circle cx="751" cy="506" r="9"/><circle cx="551" cy="752" r="9"/></g></svg>`), width: 800, height: 800,
  },
  {
    id: "so-seashell-and-kelp-border-v1", name: "Seashell and kelp lower border", kind: "element", category: "Frames",
    tags: ["ocean", "coastal", "island", "sea shell", "seashell", "kelp", "coral", "marine", "beach", "border", "divider", "summer", "travel", "cruise", "tropical", "sticker", "sublimation"],
    license, source: "SweetOh OS", ...rights,
    svg: svg("0 0 1000 300", `<g ${line}><path d="M15 270c100-15 145-7 238-15 136-12 211-8 353 0 145 8 250 1 379 10M55 247c20-54 54-93 105-125m-83 153c20-30 39-57 72-79m723 45c-25-62-62-107-116-145m88 177c-22-34-42-64-77-89M176 256c18-30 18-72 2-116m20 114c28-26 40-62 36-99m558 112c-18-30-18-72-2-116m-20 114c-28-26-40-62-36-99"/><path d="M475 251c-46-30-67-74-62-131 3-34 17-66 42-97 15 35 22 68 18 99 17-37 41-65 72-84 4 45-4 83-26 113 32-20 68-29 109-26-23 40-56 65-99 75m-93 51c22-42 28-90 21-143"/><path d="M105 122c-3 47 22 78 74 93 18-53-5-84-74-93Zm790 0c3 47-22 78-74 93-18-53 5-84 74-93Z"/></g><g ${line}><path d="M337 246c-44-17-61-54-48-111 6-25 21-49 44-72 24 23 39 47 45 72 13 57-3 94-47 111Zm-34-119 34 24 34-24m-34 24v88M663 246c44-17 61-54 48-111-6-25-21-49-44-72-24 23-39 47-45 72-13 57 3 94 47 111Zm34-119-34 24-34-24m34 24v88"/></g><circle cx="500" cy="215" r="11" ${fill}/></svg>`), width: 1000, height: 300,
  },
  {
    id: "so-citrus-and-leaf-corners-v1", name: "Citrus and leaf picnic corners", kind: "element", category: "Frames",
    tags: ["food", "fruit", "citrus", "orange", "lemon", "lime", "kitchen", "picnic", "summer", "harvest", "leaf", "botanical", "corner", "border", "frame", "recipe card", "gift", "sublimation"],
    license, source: "SweetOh OS", ...rights,
    svg: svg("0 0 760 760", `<g ${line}><path d="M43 279C45 151 125 71 279 43M58 176c77 4 132-41 161-120m-117 48c50 43 104 40 158-10m-34 83c-8-52 5-96 41-133m454 377c-2 128-82 208-236 236m221-133c-77-4-132 41-161 120m117-48c-50-43-104-40-158 10m34-83c8 52-5 96-41 133"/><circle cx="228" cy="101" r="53"/><circle cx="228" cy="101" r="43"/><path d="M228 58v86m-43-43h86m-73-30 60 60m0-60-60 60M529 659c-22 0-41-17-41-39 0-23 19-42 42-42 22 0 40 19 40 42 0 22-18 39-41 39Zm0-81c-7 15-11 29-12 42 13-1 27-5 41-13m-3-50c10-29 29-50 58-66m-43 109c37-2 67 9 94 34m-101-26c-34 8-60 27-77 58m125-119c-2-32 9-61 34-87"/></g><path d="M228 48c17-25 39-35 67-30-15 26-36 37-67 30Z" ${fill}/><path d="M542 522c30-21 58-19 83 5-29 22-57 20-83-5Z" ${fill}/></svg>`), width: 760, height: 760,
  },
  {
    id: "so-birthday-balloon-bouquet-v1", name: "Birthday balloon bouquet", kind: "element", category: "Celebrations",
    tags: ["birthday", "party", "celebration", "balloons", "balloon bouquet", "kids", "baby shower", "graduation", "anniversary", "festive", "gift tag", "card", "sticker", "printable", "sublimation"],
    license, source: "SweetOh OS", ...rights,
    svg: svg("0 0 640 760", `<g ${line}><path d="M177 284c-54 0-91-43-91-101 0-56 37-99 91-99s91 43 91 99c0 58-37 101-91 101Zm143-56c-51 0-86-41-86-96 0-53 35-94 86-94s86 41 86 94c0 55-35 96-86 96Zm141 67c-56 0-94-44-94-103 0-57 38-101 94-101s94 44 94 101c0 59-38 103-94 103Zm-220 98c-52 0-87-41-87-96 0-54 35-95 87-95s87 41 87 95c0 55-35 96-87 96Zm152 22c-51 0-86-41-86-96 0-53 35-94 86-94s86 41 86 94c0 55-35 96-86 96Z"/><path d="m177 284 143 104 62 173m-148-146 86 146m141-247-79 119m-139-52 60 210m-68-210 68 26 83-52m-105 236h214M320 75c-11 18-11 35 0 51m141 25c-12 18-12 36 0 54m-284-26c-12 18-12 36 0 54m137 0c-11 17-11 34 0 51m77 44c-11 17-11 34 0 51"/></g><path d="M255 75c-13-16-7-32 9-42 16 11 20 25 9 42m-151-27c-13-16-7-32 9-42 16 11 20 25 9 42m274 42c-13-16-7-32 9-42 16 11 20 25 9 42m-7 169c-13-16-7-32 9-42 16 11 20 25 9 42m-229 61c-13-16-7-32 9-42 16 11 20 25 9 42" ${fill}/></svg>`), width: 640, height: 760,
  },
  {
    id: "so-baby-moon-mobile-v1", name: "Baby moon and star mobile", kind: "element", category: "Baby & Kids",
    tags: ["baby", "nursery", "baby shower", "moon", "stars", "mobile", "sleep", "cloud", "newborn", "kids", "gender neutral", "keepsake", "card", "wall art", "printable", "sublimation"],
    license, source: "SweetOh OS", ...rights,
    svg: svg("0 0 600 720", `<g ${line}><path d="M99 80c107 9 198 9 402 0M300 87v95M151 90v143m150-143v157m148-157v143M100 77l-21-27m419 27 21-27"/><path d="M122 262c-28-38-23-83 8-111 30-28 76-24 102 7 27 31 25 77-4 105-27 25-70 25-97-1Zm13 13c24-32 57-37 90-12 24 19 41 49 47 90m-8-1c-22-30-51-34-81-11-24 18-41 47-50 83"/><path d="M256 266c31-46 92-46 123 0-15 31-39 46-61 46s-47-15-62-46Z"/><path d="M265 248c18 12 37 12 55 0m-55 17c18 12 37 12 55 0m-55 17c18 12 37 12 55 0"/><path d="m446 251 8 20 22 2-17 14 5 22-18-11-19 11 6-22-17-14 22-2 8-20Z"/><path d="m372 434 6 16 18 2-14 12 4 18-14-9-15 9 5-18-14-12 18-2 6-16Zm-208 17 6 16 18 2-14 12 4 18-14-9-15 9 5-18-14-12 18-2 6-16Z"/><path d="M90 578c20-40 48-57 83-50 27 5 47 24 56 53 16-28 40-41 72-39 29 2 49 19 58 49 19-22 41-32 66-28 32 5 48 26 54 66H91c-5-20-5-37-1-51Z"/></g></svg>`), width: 600, height: 720,
  },
  {
    id: "so-wildflower-divider-v1", name: "Wildflower meadow divider", kind: "element", category: "Accents",
    tags: ["wildflower", "meadow", "flower", "botanical", "divider", "flourish", "garden", "spring", "summer", "wedding", "invitation", "birth announcement", "stationery", "border", "printable", "sublimation"],
    license, source: "SweetOh OS", ...rights,
    svg: svg("0 0 1100 300", `<g ${line}><path d="M35 259c106-26 185-13 283-22 110-10 171-18 280-4 113 15 228 13 467 20M91 258v-84m89 81v-137m87 125v-93m121 90v-157m98 155v-109m101 104v-77m100 83v-145m103 146v-92m96 98v-129"/><path d="M91 174c-43-29-47-63-12-100 41 24 45 57 12 100Zm0-12c36-31 70-31 102 1-34 34-67 34-102-1Zm89-39c-45-28-48-62-14-101 42 23 47 56 14 101Zm0-15c36-31 70-31 102 1-34 34-67 34-102-1Zm87 56c-42-30-44-62-10-97 39 23 42 56 10 97Zm0-11c35-29 68-28 98 2-32 32-64 32-98-2Zm123-96c-43-29-47-63-12-100 41 24 45 57 12 100Zm0-12c36-31 70-31 102 1-34 34-67 34-102-1Zm98 57c-45-28-48-62-14-101 42 23 47 56 14 101Zm0-15c36-31 70-31 102 1-34 34-67 34-102-1Zm101 50c-41-28-44-60-11-95 39 22 43 54 11 95Zm0-12c34-28 66-28 96 2-31 31-63 30-96-2Zm100-52c-43-29-47-63-12-100 41 24 45 57 12 100Zm0-12c36-31 70-31 102 1-34 34-67 34-102-1Zm103 57c-42-30-44-62-10-97 39 23 42 56 10 97Zm0-11c35-29 68-28 98 2-32 32-64 32-98-2Zm96-39c-43-29-47-63-12-100 41 24 45 57 12 100Zm0-12c36-31 70-31 102 1-34 34-67 34-102-1Z"/></g><g ${fill}><circle cx="373" cy="35" r="8"/><circle cx="792" cy="83" r="7"/><circle cx="104" cy="90" r="7"/></g></svg>`), width: 1100, height: 300,
  },
  {
    id: "so-autumn-pumpkin-and-vine-v1", name: "Autumn pumpkin and vine", kind: "element", category: "Seasonal & Holidays",
    tags: ["autumn", "fall", "harvest", "pumpkin", "vine", "leaves", "thanksgiving", "halloween", "cider", "farmhouse", "seasonal", "kitchen", "gift", "sticker", "sublimation", "printable"],
    license, source: "SweetOh OS", ...rights,
    svg: svg("0 0 720 620", `<g ${line}><path d="M80 397c-53-90-15-202 77-219 55-10 83 17 104 44 25-40 57-55 96-52 43 3 72 24 90 68 25-39 64-58 115-45 79 20 105 101 61 181-47 85-144 137-274 137S124 488 80 397Z"/><path d="M356 226c-17-41-13-78 10-112 14-21 34-34 61-38-11 33-32 58-63 75m-9 75c0-34-5-65-16-94m-222 125c-22-37-20-69 5-96 28 27 34 59 17 96m443 0c22-37 20-69-5-96-28 27-34 59-17 96M72 500c-10 26-5 48 16 66 22-23 25-46 10-70m519 0c15-24 12-47-10-70-21 18-26 40-16 66M100 564c75 15 148 23 260 23 101 0 189-8 261-23"/><path d="M210 321c-25 45-28 94-8 144m90-158c-18 58-19 110 1 158m167-152c18 58 19 110-1 158m91-150c25 45 28 94 8 144"/></g><path d="M369 169c13-25 32-38 58-42-12 28-31 42-58 42Z" ${fill}/><path d="M123 178c28-6 52 2 72 24-29 8-53 0-72-24Zm477 0c-28-6-52 2-72 24 29 8 53 0 72-24Z" ${fill}/></svg>`), width: 720, height: 620,
  },
  {
    id: "so-graduation-floral-seal-v1", name: "Graduation floral seal", kind: "element", category: "Celebrations",
    tags: ["graduation", "graduate", "class of", "diploma", "school", "college", "university", "achievement", "seal", "badge", "wreath", "flower", "botanical", "congratulations", "gift", "sticker", "printable"],
    license, source: "SweetOh OS", ...rights,
    svg: svg("0 0 680 680", `<g ${line}><circle cx="340" cy="340" r="244"/><circle cx="340" cy="340" r="220"/><path d="M127 464c-36-85-31-161 12-229m414 229c36-85 31-161-12-229M150 504c63 66 129 102 190 116m190-116c-63 66-129 102-190 116M170 284c39 11 61 35 66 72-42 6-68-18-66-72Zm9 140c46-9 77 8 94 50-41 22-73 6-94-50Zm75 132c40-26 75-23 104 9-27 35-62 33-104-9Zm256-272c-39 11-61 35-66 72 42 6 68-18 66-72Zm-9 140c-46-9-77 8-94 50 41 22 73 6 94-50Zm-75 132c-40-26-75-23-104 9 27 35 62 33 104-9Z"/><path d="m250 229 90-35 90 35-90 35-90-35Zm32 22v50q0 27 58 49 58-22 58-49v-50m-116 0q58 28 116 0m58-22v65q0 13 13 13t13-13v-36"/></g><g ${fill}><circle cx="340" cy="96" r="8"/><circle cx="127" cy="464" r="8"/><circle cx="553" cy="464" r="8"/></g></svg>`), width: 680, height: 680,
  },
  {
    id: "so-holly-orange-corners-v1", name: "Holly and orange holiday corners", kind: "element", category: "Seasonal & Holidays",
    tags: ["christmas", "holiday", "winter", "holly", "orange", "citrus", "botanical", "berry", "corner", "border", "gift tag", "card", "seasonal", "vintage", "kitchen", "printable", "sublimation"],
    license, source: "SweetOh OS", ...rights,
    svg: svg("0 0 760 760", `<g ${line}><path d="M43 275c9-121 91-202 232-232M53 181c67-3 121-40 153-112m-106 42c45 47 94 53 146 18m-80 48c-4-44 7-82 35-114m-148 229c71-6 133-33 185-82M717 485c-9 121-91 202-232 232m222-138c-67 3-121 40-153 112m106-42c-45-47-94-53-146-18m80-48c4 44-7 82-35 114m148-229c-71 6-133 33-185 82"/><path d="M168 68c31 22 37 48 18 78-31-15-39-40-18-78Zm-47 59c37 2 57 19 59 51-36 5-56-12-59-51Zm-31 74c35-14 60-6 76 23-31 18-56 10-76-23Zm578 303c-31-22-37-48-18-78 31 15 39 40 18 78Zm47-59c-37-2-57-19-59-51 36-5 56 12 59 51Zm31-74c-35 14-60 6-76-23 31-18 56-10 76 23Z"/><circle cx="243" cy="207" r="39"/><circle cx="243" cy="207" r="32"/><path d="M243 175v64m-32-32h64m-55-23 46 46m0-46-46 46"/><circle cx="517" cy="553" r="39"/><circle cx="517" cy="553" r="32"/><path d="M517 521v64m-32-32h64m-55-23 46 46m0-46-46 46"/></g><g ${fill}><circle cx="148" cy="131" r="9"/><circle cx="92" cy="203" r="9"/><circle cx="612" cy="629" r="9"/><circle cx="668" cy="557" r="9"/><path d="M244 164c16-28 41-38 75-28-17 31-42 41-75 28Zm274 362c-16 28-41 38-75 28 17-31 42-41 75-28Z"/></g></svg>`), width: 760, height: 760,
  },
];
