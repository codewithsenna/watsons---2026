import type { Types } from "mongoose";
import { connectMongoose } from "../db/mongoose";
import { Category } from "../models/Category";
import { Menu } from "../models/Menu";
import { MenuItem, type MenuItemDocument } from "../models/MenuItem";
import { Restaurant } from "../models/Restaurant";

export type MenuDetailsQuery = {
  category?: string;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
};

export async function getMenusForRestaurant(restaurantSlug: string) {
  await connectMongoose();

  const restaurant = await Restaurant.findOne({
    slug: restaurantSlug,
    isActive: true
  }).lean();

  if (!restaurant) {
    return null;
  }

  const menus = await Menu.find({
    restaurantId: restaurant._id,
    isActive: true
  })
    .sort({ sortOrder: 1, title: 1 })
    .lean();

  return {
    restaurant: serializeRestaurant(restaurant),
    menus: menus.map(serializeMenu)
  };
}

export async function getMenuDetails(
  restaurantSlug: string,
  menuSlug: string,
  query: MenuDetailsQuery
) {
  await connectMongoose();

  const restaurant = await Restaurant.findOne({
    slug: restaurantSlug,
    isActive: true
  }).lean();

  if (!restaurant) {
    return null;
  }

  const menu = await Menu.findOne({
    restaurantId: restaurant._id,
    slug: menuSlug,
    isActive: true
  }).lean();

  if (!menu) {
    return null;
  }

  const categories = await Category.find({
    menuId: menu._id,
    isActive: true
  })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  const selectedCategory = query.category
    ? categories.find((category) => category.slug === query.category)
    : undefined;
  const itemFilter: Record<string, unknown> = {
    restaurantId: restaurant._id,
    menuId: menu._id,
    isAvailable: true
  };

  if (query.category) {
    itemFilter.categoryId = selectedCategory?._id ?? null;
  }

  const search = query.search?.trim();

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    itemFilter.$or = [
      { name: regex },
      { description: regex },
      { displayDescription: regex },
      { tags: regex }
    ];
  }

  const priceFilter = createPriceFilter(query);

  if (priceFilter) {
    itemFilter.pricing = { $elemMatch: priceFilter };
  }

  const items = await MenuItem.find(itemFilter)
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  return {
    restaurant: serializeRestaurant(restaurant),
    menu: serializeMenu(menu),
    categories: categories.map(serializeCategory),
    items: items.map(serializeMenuItem)
  };
}

function createPriceFilter(query: MenuDetailsQuery) {
  const minPrice = parseOptionalNumber(query.minPrice);
  const maxPrice = parseOptionalNumber(query.maxPrice);

  if (minPrice === undefined && maxPrice === undefined) {
    return null;
  }

  return {
    ...(minPrice !== undefined ? { $gte: minPrice } : {}),
    ...(maxPrice !== undefined ? { $lte: maxPrice } : {})
  };
}

function parseOptionalNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function serializeRestaurant(restaurant: {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  address?: unknown;
  isActive: boolean;
}) {
  return {
    id: restaurant._id.toString(),
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description,
    address: restaurant.address,
    isActive: restaurant.isActive
  };
}

function serializeMenu(menu: {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}) {
  return {
    id: menu._id.toString(),
    title: menu.title,
    slug: menu.slug,
    description: menu.description,
    isActive: menu.isActive,
    sortOrder: menu.sortOrder
  };
}

function serializeCategory(category: {
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
    description: category.description,
    sortOrder: category.sortOrder,
    isActive: category.isActive
  };
}

function serializeMenuItem(item: MenuItemDocument & { _id: Types.ObjectId }) {
  return {
    id: item._id.toString(),
    restaurantId: item.restaurantId.toString(),
    menuId: item.menuId.toString(),
    categoryId: item.categoryId.toString(),
    name: item.name,
    slug: item.slug,
    description: item.description,
    displayDescription: item.displayDescription,
    pricing: item.pricing,
    tags: item.tags,
    imageUrl: item.imageUrl,
    isAvailable: item.isAvailable,
    isFeatured: item.isFeatured,
    sortOrder: item.sortOrder,
    legacyId: item.legacyId,
    legacyMenuTitle: item.legacyMenuTitle
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
