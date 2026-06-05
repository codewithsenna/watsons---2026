import { cleanString } from "./menuDataHelpers";

export const defaultMenuItemDescription =
  "A back-bar pour worth asking the bartender about.";

type DisplayDescriptionInput = {
  name: string;
  categoryName: string;
  region?: string;
  rawDescription?: string;
};

const regionDescriptions: Record<string, string> = {
  islay: "A smoky, coastal pour with enough edge to stand up after dinner.",
  speyside:
    "A smoother, rounder direction when the table wants richness without too much smoke.",
  highland:
    "A dependable Highland pour, balanced enough for a first dram and layered enough for another.",
  lowland: "A lighter Scotch direction, usually softer, grassy, and easy to settle into.",
  campbeltown:
    "A coastal Scotch pour with a little oil, salt, and old-school character.",
  "isle of skye": "A maritime pour with salt, pepper, and a little late-night drama.",
  island: "A coastal island pour with a mix of smoke, salt, and rounded malt.",
  "sherry cask": "A richer cask-led pour with dried fruit, spice, and a rounder finish.",
  "natural cask strength":
    "A higher-proof pour with more weight, texture, and intensity in the glass.",
  "limited edition": "A limited bottle from the back bar, best treated as a slower pour.",
  "chapter 3": "A distinctive back-bar selection with a more specific house-list profile."
};

const categoryDescriptions: Record<string, string> = {
  "american whiskey":
    "A fuller whiskey pour, usually built around oak, vanilla, spice, and a warmer finish.",
  "canadian whiskey":
    "A Canadian whiskey pour with an easygoing profile and a clean, familiar finish.",
  "irish whiskey":
    "A rounded Irish whiskey pour, generally smooth, approachable, and easy to sip.",
  tequila: "An agave pour with clean pepper, citrus, and earthy warmth.",
  mezcal: "An agave pour with smoke, minerality, and a more expressive edge.",
  rum: "A sugarcane-based pour with warmth, sweetness, and a relaxed late-night feel.",
  cognac: "A brandy pour with dried fruit, oak, and a richer after-dinner profile.",
  vodka: defaultMenuItemDescription,
  gin: defaultMenuItemDescription,
  "japanese whiskey":
    "A Japanese whisky pour with a polished, balanced profile and a precise finish."
};

export function getMenuItemDisplayDescription({
  name,
  categoryName,
  region,
  rawDescription
}: DisplayDescriptionInput) {
  const cleanedRawDescription = cleanString(rawDescription);
  const cleanedRegion = cleanString(region);

  if (isMeaningfulRawDescription(cleanedRawDescription, cleanedRegion)) {
    return cleanedRawDescription;
  }

  const regionDescription = regionDescriptions[cleanedRegion.toLowerCase()];

  if (regionDescription) {
    return regionDescription;
  }

  const normalizedCategory = cleanString(categoryName).toLowerCase();
  const categoryDescription = categoryDescriptions[normalizedCategory];

  if (categoryDescription) {
    return categoryDescription;
  }

  return hasDescriptiveName(name) ? defaultMenuItemDescription : defaultMenuItemDescription;
}

export function getMenuItemCardDescription(description: string) {
  return description === defaultMenuItemDescription
    ? "A back-bar pour worth asking the bartender about."
    : description;
}

function isMeaningfulRawDescription(description: string, region: string) {
  if (!description || description === region) {
    return false;
  }

  if (description.split(/\s+/).length <= 3 && !/[,&.]/.test(description)) {
    return false;
  }

  return true;
}

function hasDescriptiveName(name: string) {
  return cleanString(name).length > 0;
}
