import mongoose, { type Types } from "mongoose";
import { connectMongoose } from "../db/mongoose";
import { env } from "../env";
import { Category } from "../models/Category";
import { Menu } from "../models/Menu";
import { MenuItem, type MenuItemDocument } from "../models/MenuItem";
import { Restaurant } from "../models/Restaurant";
import { cleanString, createSlug } from "../utils/menuDataHelpers";
import { httpError } from "../utils/httpError";

type PricingInput = {
  label?: unknown;
  amount?: unknown;
  currency?: unknown;
};

type CategoryInput = {
  name?: unknown;
  description?: unknown;
  sortOrder?: unknown;
  isActive?: unknown;
};

type ItemInput = {
  categoryId?: unknown;
  name?: unknown;
  description?: unknown;
  displayDescription?: unknown;
  pricing?: unknown;
  isAvailable?: unknown;
  isFeatured?: unknown;
  sortOrder?: unknown;
};

export async function getAdminMenu() {
  const { restaurant, menu } = await getAdminMenuContext();

  const categories = await Category.find({ menuId: menu._id })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  const items = await MenuItem.find({
    restaurantId: restaurant._id,
    menuId: menu._id
  })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  return {
    restaurant: {
      id: restaurant._id.toString(),
      name: restaurant.name,
      slug: restaurant.slug
    },
    menu: {
      id: menu._id.toString(),
      title: menu.title,
      slug: menu.slug
    },
    categories: categories.map(serializeAdminCategory),
    items: items.map(serializeAdminItem)
  };
}

export async function createAdminCategory(input: CategoryInput) {
  const { menu } = await getAdminMenuContext();
  const name = requireText(input.name, "Category name", 80);
  const slug = createSlug(name);

  if (!slug) {
    throw httpError(400, "Category name must include letters or numbers.");
  }

  const existingCategory = await Category.findOne({ menuId: menu._id, slug });

  if (existingCategory) {
    throw httpError(409, "A category with that name already exists.");
  }

  const sortOrder = await getNextCategorySortOrder(menu._id);
  const category = await Category.create({
    menuId: menu._id,
    name,
    slug,
    description: optionalText(input.description, 240),
    sortOrder,
    isActive: true
  });

  return serializeAdminCategory(category);
}

export async function updateAdminCategory(
  categoryId: string,
  input: CategoryInput
) {
  const { menu } = await getAdminMenuContext();
  const category = await Category.findOne({
    _id: requireObjectId(categoryId, "Category"),
    menuId: menu._id
  });

  if (!category) {
    throw httpError(404, "Category not found.");
  }

  if ("name" in input) {
    const name = requireText(input.name, "Category name", 80);
    const slug = createSlug(name);
    const duplicate = await Category.findOne({
      _id: { $ne: category._id },
      menuId: menu._id,
      slug
    });

    if (duplicate) {
      throw httpError(409, "A category with that name already exists.");
    }

    category.name = name;
    category.slug = slug;
  }

  if ("description" in input) {
    category.description = optionalText(input.description, 240);
  }

  if ("sortOrder" in input) {
    category.sortOrder = optionalNumber(input.sortOrder, category.sortOrder);
  }

  if ("isActive" in input) {
    category.isActive = Boolean(input.isActive);
  }

  await category.save();

  return serializeAdminCategory(category);
}

export async function createAdminItem(input: ItemInput) {
  const { restaurant, menu } = await getAdminMenuContext();
  const category = await requireCategoryForMenu(input.categoryId, menu._id);
  const name = requireText(input.name, "Item name", 120);
  const pricing = normalizePricing(input.pricing);
  const sortOrder = await getNextItemSortOrder(menu._id, category._id);

  const item = await MenuItem.create({
    restaurantId: restaurant._id,
    menuId: menu._id,
    categoryId: category._id,
    name,
    slug: createSlug(name),
    description: optionalText(input.description, 120),
    displayDescription: optionalText(input.displayDescription, 400),
    pricing,
    tags: [],
    isAvailable: "isAvailable" in input ? Boolean(input.isAvailable) : true,
    isFeatured: Boolean(input.isFeatured),
    sortOrder
  });

  return serializeAdminItem(item);
}

export async function updateAdminItem(itemId: string, input: ItemInput) {
  const { restaurant, menu } = await getAdminMenuContext();
  const item = await MenuItem.findOne({
    _id: requireObjectId(itemId, "Item"),
    restaurantId: restaurant._id,
    menuId: menu._id
  });

  if (!item) {
    throw httpError(404, "Item not found.");
  }

  if ("categoryId" in input) {
    const category = await requireCategoryForMenu(input.categoryId, menu._id);
    item.categoryId = category._id;
  }

  if ("name" in input) {
    const name = requireText(input.name, "Item name", 120);
    item.name = name;
    item.slug = createSlug(name);
  }

  if ("description" in input) {
    item.description = optionalText(input.description, 120);
  }

  if ("displayDescription" in input) {
    item.displayDescription = optionalText(input.displayDescription, 400);
  }

  if ("pricing" in input) {
    item.pricing = normalizePricing(input.pricing);
  }

  if ("isAvailable" in input) {
    item.isAvailable = Boolean(input.isAvailable);
  }

  if ("isFeatured" in input) {
    item.isFeatured = Boolean(input.isFeatured);
  }

  if ("sortOrder" in input) {
    item.sortOrder = optionalNumber(input.sortOrder, item.sortOrder);
  }

  await item.save();

  return serializeAdminItem(item);
}

async function getAdminMenuContext() {
  await connectMongoose();

  const restaurant = await Restaurant.findOne({
    slug: env.admin.restaurantSlug,
    isActive: true
  });

  if (!restaurant) {
    throw httpError(404, "Restaurant not found.");
  }

  const menu = await Menu.findOne({
    restaurantId: restaurant._id,
    slug: env.admin.menuSlug,
    isActive: true
  });

  if (!menu) {
    throw httpError(404, "Menu not found.");
  }

  return { restaurant, menu };
}

async function requireCategoryForMenu(
  value: unknown,
  menuId: Types.ObjectId
) {
  if (typeof value !== "string") {
    throw httpError(400, "Category is required.");
  }

  const category = await Category.findOne({
    _id: requireObjectId(value, "Category"),
    menuId,
    isActive: true
  });

  if (!category) {
    throw httpError(404, "Category not found.");
  }

  return category;
}

async function getNextCategorySortOrder(menuId: Types.ObjectId) {
  const lastCategory = await Category.findOne({ menuId })
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();

  return (lastCategory?.sortOrder ?? -1) + 1;
}

async function getNextItemSortOrder(
  menuId: Types.ObjectId,
  categoryId: Types.ObjectId
) {
  const lastItem = await MenuItem.findOne({ menuId, categoryId })
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();

  return (lastItem?.sortOrder ?? -1) + 1;
}

function serializeAdminCategory(category: {
  _id: Types.ObjectId;
  menuId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}) {
  return {
    id: category._id.toString(),
    menuId: category.menuId.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    sortOrder: category.sortOrder,
    isActive: category.isActive
  };
}

function serializeAdminItem(item: MenuItemDocument & { _id: Types.ObjectId }) {
  return {
    id: item._id.toString(),
    restaurantId: item.restaurantId.toString(),
    menuId: item.menuId.toString(),
    categoryId: item.categoryId.toString(),
    name: item.name,
    slug: item.slug,
    description: item.description ?? "",
    displayDescription: item.displayDescription ?? "",
    pricing: item.pricing,
    isAvailable: item.isAvailable,
    isFeatured: item.isFeatured,
    sortOrder: item.sortOrder
  };
}

function requireText(value: unknown, label: string, maxLength: number) {
  const text = optionalText(value, maxLength);

  if (!text) {
    throw httpError(400, `${label} is required.`);
  }

  return text;
}

function optionalText(value: unknown, maxLength: number) {
  const text = cleanString(value);

  if (text.length > maxLength) {
    throw httpError(400, `Text must be ${maxLength} characters or less.`);
  }

  return text;
}

function optionalNumber(value: unknown, fallback: number) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePricing(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw httpError(400, "At least one price is required.");
  }

  return value.map((entry) => {
    const pricing = entry as PricingInput;
    const label = optionalText(pricing.label, 40) || "Regular";
    const currency = optionalText(pricing.currency, 8) || "CAD";
    const amount =
      typeof pricing.amount === "number"
        ? pricing.amount
        : typeof pricing.amount === "string"
          ? Number(pricing.amount)
          : Number.NaN;

    if (!Number.isFinite(amount) || amount < 0) {
      throw httpError(400, "Enter a valid price.");
    }

    return {
      label,
      amount,
      currency
    };
  });
}

function requireObjectId(value: string, label: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw httpError(400, `${label} id is not valid.`);
  }

  return new mongoose.Types.ObjectId(value);
}
