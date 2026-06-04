import { MongoClient, type Document } from "mongodb";
import type { MenuApiResponse, MenuCategory, MenuItem } from "../src/menuData";
import { env } from "./env";

let clientPromise: Promise<MongoClient> | undefined;

export async function loadMenuFromDatabase(): Promise<MenuApiResponse> {
  const client = await getMongoClient();
  const collection = client
    .db(env.mongodb.dbName)
    .collection(env.mongodb.liquorCollection);
  const filter = env.mongodb.menuDocumentTitle
    ? { title: env.mongodb.menuDocumentTitle }
    : {};

  const documents = await collection
    .find(filter)
    .sort({
      categoryOrder: 1,
      category: 1,
      order: 1,
      sortOrder: 1,
      name: 1,
      title: 1
    })
    .toArray();

  const sourceDocuments = documents.flatMap(expandMenuDocument);
  const items = sourceDocuments
    .map(normalizeMenuItem)
    .filter((item): item is MenuItem => item !== null);
  const categories = buildCategories(sourceDocuments, items);

  return { categories, items };
}

function getMongoClient() {
  if (!env.mongodb.uri) {
    throw new Error("MONGODB_URI is required to load menu data.");
  }

  clientPromise ??= new MongoClient(env.mongodb.uri).connect();

  return clientPromise;
}

function expandMenuDocument(document: Document): Document[] {
  const items = Array.isArray(document.items)
    ? document.items
    : Array.isArray(document.data)
      ? document.data
      : null;

  if (!items) {
    return [document];
  }

  const { items: _items, ...parent } = document;

  return items
    .filter(isRecord)
    .map((item, index) => ({
      ...parent,
      ...item,
      _id: item._id ?? `${String(document._id)}-${index}`,
      category: item.category ?? document.category,
      categoryId: item.categoryId ?? document.categoryId,
      categoryLabel:
        item.categoryLabel ??
        item.categoryName ??
        document.categoryLabel ??
        document.categoryName
    }));
}

function normalizeMenuItem(document: Document): MenuItem | null {
  const name = stringFrom(document, "name", "title", "item", "productName", "bottle");
  const description = stringFrom(document, "description");
  const categoryLabel = getCategoryLabel(document);
  const categoryId =
    stringFrom(document, "categoryId", "category_id", "categorySlug", "sectionId") ??
    getNestedCategoryValue(document, "id", "slug") ??
    slugify(categoryLabel);
  const price = normalizePrice(
    valueFrom(document, "price", "pourPrice", "cost", "amount", "menuPrice")
  );

  if (!name || !price) {
    return null;
  }

  const inferredRegion =
    stringFrom(document, "region", "origin", "area") ?? inferRegion(description);

  return {
    id:
      stringFrom(document, "id", "slug", "sku") ??
      (document._id ? String(document._id) : slugify(`${categoryId}-${name}`)),
    categoryId,
    name,
    price,
    region: inferredRegion,
    note:
      stringFrom(document, "note", "notes", "tastingNote") ??
      (description && description !== inferredRegion ? description : undefined),
    featured: booleanFrom(document, "featured", "isFeatured")
  };
}

function buildCategories(documents: Document[], items: MenuItem[]): MenuCategory[] {
  const firstDocumentByCategory = new Map<string, Document>();
  const itemCountByCategory = new Map<string, number>();

  for (const item of items) {
    itemCountByCategory.set(item.categoryId, (itemCountByCategory.get(item.categoryId) ?? 0) + 1);
  }

  for (const document of documents) {
    const label = getCategoryLabel(document);
    const id =
      stringFrom(document, "categoryId", "category_id", "categorySlug", "sectionId") ??
      getNestedCategoryValue(document, "id", "slug") ??
      slugify(label);

    if (itemCountByCategory.has(id) && !firstDocumentByCategory.has(id)) {
      firstDocumentByCategory.set(id, document);
    }
  }

  return [...itemCountByCategory.keys()].map((id) => {
    const document = firstDocumentByCategory.get(id);
    const label = document ? getCategoryLabel(document) : titleize(id);

    return {
      id,
      label,
      eyebrow: document
        ? stringFrom(document, "eyebrow", "family", "spiritType", "type")
        : undefined,
      description: document
        ? stringFrom(document, "categoryDescription", "sectionDescription")
        : undefined
    };
  });
}

function getCategoryLabel(document: Document) {
  return (
    stringFrom(document, "categoryLabel", "categoryName", "section", "group") ??
    getNestedCategoryValue(document, "label", "name", "title") ??
    stringFrom(document, "category", "type", "menuTitle", "title") ??
    "Menu"
  );
}

function getNestedCategoryValue(document: Document, ...keys: string[]) {
  const category = document.category;

  return isRecord(category) ? stringFrom(category, ...keys) : undefined;
}

function normalizePrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatPriceNumber(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return formatPriceNumber(Number(trimmed));
    }

    return trimmed.startsWith("$") ? trimmed : `$${trimmed}`;
  }

  return undefined;
}

function inferRegion(description: string | undefined) {
  if (!description || /[,.;:]/.test(description)) {
    return undefined;
  }

  return description.split(/\s+/).length <= 3 ? description : undefined;
}

function formatPriceNumber(value: number) {
  return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

function valueFrom(document: Document, ...keys: string[]) {
  for (const key of keys) {
    const value = document[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

function stringFrom(document: Document, ...keys: string[]) {
  const value = valueFrom(document, ...keys);

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanFrom(document: Document, ...keys: string[]) {
  const value = valueFrom(document, ...keys);

  return typeof value === "boolean" ? value : undefined;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleize(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isRecord(value: unknown): value is Document {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
