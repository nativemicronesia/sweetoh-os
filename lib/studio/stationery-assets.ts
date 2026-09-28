/** Original SweetOh Studio stationery and gift-finishing vectors. */
import type { StudioAsset } from "./asset-library";

const ink = "#173e39";
const original = "SweetOh OS";
const license = "SweetOh original — free for SweetOh customer designs";
const rights = { commercialUse: true, modificationAllowed: true, redistributionAllowed: true, attributionRequired: false, attributionText: null } as const;

export const SWEETOH_STATIONERY_ASSETS: readonly StudioAsset[] = [
  {
    id: "so-invitation-botanical-corners-v1",
    name: "Botanical invitation corners",
    kind: "element",
    category: "Frames",
    tags: ["wedding", "invitation", "stationery", "floral", "botanical", "corner", "border", "card", "bridal shower", "anniversary", "elegant", "garden", "printable"],
    license, source: original, ...rights,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><g fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M44 276C47 155 112 77 278 52M54 185c67 5 115-29 139-98M88 111c49 45 105 41 159-14M129 75c-5 66 20 112 66 136M77 212c49-3 88-27 119-72M58 135c29-2 55-15 78-39M524 748c147-6 214-78 222-224M655 739c6-65 39-115 99-148M712 675c-49-46-105-42-160 13M670 719c5-66-20-112-66-136M722 582c-49 3-88 27-119 72M742 660c-29 2-55 15-78 39"/><path d="M215 91c-17-34-7-62 22-75 12 25 7 47-22 75Zm-57 73c-34-17-62-7-75 22 25 12 47 7 75-22Zm478 472c34 17 62 7 75-22-25-12-47-7-75 22Zm57-73c17 34 7 62-22 75-12-25-7-47 22-75Z"/></g><g fill="${ink}"><circle cx="259" cy="52" r="8"/><circle cx="76" cy="258" r="8"/><circle cx="744" cy="542" r="8"/><circle cx="541" cy="748" r="8"/></g></svg>`,
    width: 800, height: 800,
  },
  {
    id: "so-wedding-flourish-divider-v1",
    name: "Wedding flourish divider",
    kind: "element",
    category: "Accents",
    tags: ["wedding", "invitation", "divider", "flourish", "ornament", "swash", "line", "stationery", "elegant", "anniversary", "printable", "editorial"],
    license, source: original, ...rights,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 180"><g fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M36 90h278c57 0 59-48 20-48-28 0-32 36-5 37 20 1 35-16 49-36 22-31 41-31 55-3M924 90H646c-57 0-59-48-20-48 28 0 32 36 5 37-20 1-35-16-49-36-22-31-41-31-55-3M318 90c36 0 39 47 81 47 32 0 43-35 15-38-20-2-25 19-9 23M642 90c-36 0-39 47-81 47-32 0-43-35-15-38 20-2 25 19 9 23"/><path d="M480 26c-28 27-28 49 0 66 28-17 28-39 0-66Zm0 102v25M452 77c-20-14-37-11-51 8 17 17 34 15 51-8Zm56 0c20-14 37-11 51 8-17 17-34 15-51-8Z"/></g><circle cx="480" cy="84" r="7" fill="${ink}"/></svg>`,
    width: 960, height: 180,
  },
  {
    id: "so-arched-keepsake-label-v1",
    name: "Arched keepsake label",
    kind: "element",
    category: "Frames",
    tags: ["label", "frame", "arch", "keepsake", "wedding", "baby", "gift", "monogram", "place card", "invitation", "stationery", "elegant", "printable", "engraving"],
    license, source: original, ...rights,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 760"><path d="M76 684V315C76 156 174 64 320 64s244 92 244 251v369H76Z" fill="none" stroke="${ink}" stroke-width="9" stroke-linejoin="round"/><path d="M101 660V316c0-143 84-224 219-224s219 81 219 224v344H101Z" fill="none" stroke="${ink}" stroke-width="3"/><path d="M267 106c14-31 28-44 53-55 25 11 39 24 53 55-22 17-36 17-53-3-17 20-31 20-53 3Z" fill="none" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/><circle cx="320" cy="119" r="5" fill="${ink}"/><g fill="${ink}"><circle cx="101" cy="660" r="6"/><circle cx="539" cy="660" r="6"/></g></svg>`,
    width: 640, height: 760,
  },
  {
    id: "so-keepsake-botanical-wreath-v1",
    name: "Keepsake botanical wreath",
    kind: "element",
    category: "Frames",
    tags: ["wreath", "botanical", "floral", "frame", "wedding", "baby", "bridal shower", "anniversary", "garden", "invitation", "monogram", "elegant", "printable"],
    license, source: original, ...rights,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720"><g fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M360 74c-137 0-248 111-248 248 0 80 37 151 96 196M360 74c137 0 248 111 248 248 0 80-37 151-96 196M208 518c42 51 95 83 152 111 57-28 110-60 152-111"/><path d="M253 117c-26 46-21 78 18 99 35-36 30-68-18-99Zm-86 116c51-12 77 8 79 53-48 14-75-4-79-53Zm7 133c49-24 81-11 94 31-44 25-76 15-94-31Zm52 122c39-37 73-33 97 4-36 36-69 34-97-4Zm241-371c26 46 21 78-18 99-35-36-30-68 18-99Zm86 116c-51-12-77 8-79 53 48 14 75-4 79-53Zm-7 133c-49-24-81-11-94 31 44 25 76 15 94-31Zm-52 122c-39-37-73-33-97 4 36 36 69 34 97-4Z"/></g><g fill="${ink}"><circle cx="360" cy="74" r="8"/><circle cx="208" cy="518" r="8"/><circle cx="512" cy="518" r="8"/><path d="M360 622c-26-14-40-31-40-50 0-17 20-25 40-7 20-18 40-10 40 7 0 19-14 36-40 50Z"/></g></svg>`,
    width: 720, height: 720,
  },
  {
    id: "so-gift-bow-v1",
    name: "Gift wrap bow",
    kind: "element",
    category: "Accents",
    tags: ["gift", "bow", "ribbon", "present", "birthday", "wedding", "holiday", "christmas", "baby shower", "celebration", "label", "printable", "sticker"],
    license, source: original, ...rights,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 500"><g fill="none" stroke="${ink}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M380 234c-66-97-194-158-252-111-42 34-9 117 79 147 64 21 129 4 173-12-57 75-97 158-56 190 41 31 111-9 102-113-2-27-16-61-46-100Zm0 0c66-97 194-158 252-111 42 34 9 117-79 147-64 21-129 4-173-12 57 75 97 158 56 190-41 31-111-9-102-113 2-27 16-61 46-100Z"/><path d="M326 217c-64-26-122-66-151-104m259 104c64-26 122-66 151-104M350 271c-6 66-15 128-27 183m87-183c6 66 15 128 27 183"/></g><ellipse cx="380" cy="236" rx="39" ry="31" fill="${ink}"/><path d="M380 231c-24-14-40-26-54-46m54 46c24-14 40-26 54-46" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
    width: 760, height: 500,
  },
  {
    id: "so-festive-confetti-burst-v1",
    name: "Festive confetti burst",
    kind: "element",
    category: "Accents",
    tags: ["birthday", "graduation", "party", "celebration", "confetti", "burst", "holiday", "new year", "kids", "background", "sticker", "printable"],
    license, source: original, ...rights,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><g fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="m300 40 15 47m153-13-12 49m115 50-43 23m43 168-50 4m7 149-44-23M300 560l-11-55m-148 28 18-51M44 385l51-13M47 218l49 14M141 85l32 42"/><path d="m300 142 24 50 55 8-40 39 9 55-48-26-49 26 9-55-40-39 55-8 25-50Z"/><path d="M132 272c22-25 45-25 67 0-22 25-45 25-67 0Zm270 137c20-23 40-23 60 0-20 23-40 23-60 0ZM208 475l22-28 22 28-22 27-22-27Zm180-358 14 29 32 5-23 22 5 32-28-15-28 15 5-32-23-22 32-5 14-29Z"/></g><g fill="${ink}"><circle cx="89" cy="151" r="8"/><circle cx="514" cy="104" r="8"/><circle cx="517" cy="307" r="8"/><circle cx="343" cy="503" r="8"/><circle cx="102" cy="456" r="8"/></g></svg>`,
    width: 600, height: 600,
  },
];
