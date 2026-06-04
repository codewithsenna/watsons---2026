export type Pricing = {
  label: string;
  amount: number;
  currency: string;
};

export function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function createSlug(value: string) {
  return cleanString(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parsePricing(value: unknown): Pricing[] {
  const cleanedPrice = cleanString(value).replace(/\$/g, "");

  if (!cleanedPrice) {
    return [];
  }

  if (cleanedPrice.includes("/")) {
    const [glass, bottle] = cleanedPrice
      .split("/")
      .map((part) => parseAmount(part));

    if (!isValidAmount(glass) || !isValidAmount(bottle)) {
      return [];
    }

    return [
      { label: "Glass", amount: glass, currency: "CAD" },
      { label: "Bottle", amount: bottle, currency: "CAD" }
    ];
  }

  const amount = parseAmount(cleanedPrice);

  return isValidAmount(amount)
    ? [{ label: "Regular", amount, currency: "CAD" }]
    : [];
}

function parseAmount(value: string) {
  const normalized = cleanString(value).replace(/,/g, "");

  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

function isValidAmount(value: number) {
  return Number.isFinite(value) && value >= 0;
}
