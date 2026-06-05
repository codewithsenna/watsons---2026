import mongoose, { type Types } from "mongoose";
import { connectMongoose, disconnectMongoose } from "../db/mongoose";
import { Category } from "../models/Category";
import { Menu } from "../models/Menu";
import { MenuItem } from "../models/MenuItem";
import { Restaurant } from "../models/Restaurant";
import { cleanString, createSlug, parsePricing } from "../utils/menuDataHelpers";
import { getMenuItemDisplayDescription } from "../utils/menuDisplayCopy";

const oldMenuTitles = ["cocktailMenu", "beer_wineMenu", "qrMenu"] as const;

const menuMappings = {
  cocktailMenu: {
    title: "Cocktail Menu",
    slug: "cocktails",
    fallbackCategory: "Cocktails",
    sortOrder: 0
  },
  beer_wineMenu: {
    title: "Beer & Wine Menu",
    slug: "beer-wine",
    fallbackCategory: "Uncategorized",
    sortOrder: 1
  },
  qrMenu: {
    title: "Liquor Menu",
    slug: "liquor",
    fallbackCategory: "Uncategorized",
    sortOrder: 2
  }
} satisfies Record<
  (typeof oldMenuTitles)[number],
  {
    title: string;
    slug: string;
    fallbackCategory: string;
    sortOrder: number;
  }
>;

type OldMenuTitle = keyof typeof menuMappings;

type OldMenuItem = {
  _id?: unknown;
  menuTitle?: unknown;
  type?: unknown;
  name?: unknown;
  description?: unknown;
  itemDescription?: unknown;
  price?: unknown;
};

type OldMenuDocument = {
  title: OldMenuTitle;
  data?: OldMenuItem[];
};

type MigrationStats = {
  oldMenusFound: number;
  categoriesCreatedOrUpdated: number;
  itemsCreatedOrUpdated: number;
  skippedItems: Array<{
    menuTitle: string;
    index: number;
    name: string;
    reason: string;
  }>;
};

async function migrateMenus() {
  await connectMongoose();
  await Promise.all([
    Restaurant.init(),
    Menu.init(),
    Category.init(),
    MenuItem.init()
  ]);

  const stats: MigrationStats = {
    oldMenusFound: 0,
    categoriesCreatedOrUpdated: 0,
    itemsCreatedOrUpdated: 0,
    skippedItems: []
  };

  const restaurant = await Restaurant.findOneAndUpdate(
    { slug: "watsons" },
    {
      $set: {
        name: "Watson's",
        slug: "watsons",
        address: {
          city: "Toronto",
          province: "ON",
          country: "Canada"
        },
        isActive: true
      }
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );

  const oldMenus = await mongoose.connection
    .collection<OldMenuDocument>("menus")
    .find({ title: { $in: [...oldMenuTitles] } })
    .toArray();
  const oldMenusByTitle = new Map(oldMenus.map((menu) => [menu.title, menu]));

  stats.oldMenusFound = oldMenus.length;

  for (const oldMenuTitle of oldMenuTitles) {
    const oldMenu = oldMenusByTitle.get(oldMenuTitle);

    if (!oldMenu) {
      continue;
    }

    const mapping = menuMappings[oldMenuTitle];
    const menu = await Menu.findOneAndUpdate(
      { restaurantId: restaurant._id, slug: mapping.slug },
      {
        $set: {
          restaurantId: restaurant._id,
          title: mapping.title,
          slug: mapping.slug,
          isActive: true,
          sortOrder: mapping.sortOrder
        }
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
    const categoryCache = new Map<string, Types.ObjectId>();
    const oldItems = Array.isArray(oldMenu.data) ? oldMenu.data : [];

    for (const [index, oldItem] of oldItems.entries()) {
      const name = cleanString(oldItem.name);
      const description = cleanString(oldItem.description);
      const itemDescription = cleanString(oldItem.itemDescription);
      const price = cleanString(oldItem.price);
      const pricing = parsePricing(price);

      if (!name || name.length < 2) {
        stats.skippedItems.push({
          menuTitle: oldMenuTitle,
          index,
          name,
          reason: "Missing name or name shorter than 2 characters."
        });
        continue;
      }

      if (pricing.length === 0) {
        stats.skippedItems.push({
          menuTitle: oldMenuTitle,
          index,
          name,
          reason: `Invalid price: "${price}".`
        });
        continue;
      }

      const categoryName = cleanString(oldItem.type) || mapping.fallbackCategory;
      const categorySlug = createSlug(categoryName);
      const displayDescription =
        itemDescription ||
        getMenuItemDisplayDescription({
          name,
          categoryName,
          region: inferRegion(description),
          rawDescription: description
        });
      let categoryId = categoryCache.get(categorySlug);

      if (!categoryId) {
        const category = await Category.findOneAndUpdate(
          { menuId: menu._id, slug: categorySlug },
          {
            $set: {
              menuId: menu._id,
              name: categoryName,
              slug: categorySlug,
              isActive: true,
              sortOrder: categoryCache.size
            }
          },
          { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
        );

        categoryId = category._id as Types.ObjectId;
        categoryCache.set(categorySlug, categoryId);
        stats.categoriesCreatedOrUpdated += 1;
      }

      const legacyId = getLegacyId(oldMenuTitle, oldItem, {
        name,
        description,
        price
      });
      const existingItem = await MenuItem.findOne({
        restaurantId: restaurant._id,
        legacyMenuTitle: oldMenuTitle,
        legacyId
      })
        .select({ displayDescription: 1 })
        .lean();
      const existingDisplayDescription = cleanString(
        existingItem?.displayDescription
      );
      const nextDisplayDescription =
        itemDescription || existingDisplayDescription || displayDescription;

      await MenuItem.updateOne(
        {
          restaurantId: restaurant._id,
          legacyMenuTitle: oldMenuTitle,
          legacyId
        },
        {
          $set: {
            restaurantId: restaurant._id,
            menuId: menu._id,
            categoryId,
            name,
            slug: createSlug(name),
            description,
            displayDescription: nextDisplayDescription,
            pricing,
            tags: [],
            imageUrl: null,
            isAvailable: true,
            isFeatured: false,
            sortOrder: index,
            legacyId,
            legacyMenuTitle: oldMenuTitle
          }
        },
        { upsert: true, setDefaultsOnInsert: true }
      );

      stats.itemsCreatedOrUpdated += 1;
    }
  }

  logMigrationStats(stats);
}

function inferRegion(description: string) {
  if (!description || /[,.;:]/.test(description)) {
    return undefined;
  }

  return description.split(/\s+/).length <= 3 ? description : undefined;
}

function getLegacyId(
  oldMenuTitle: OldMenuTitle,
  oldItem: OldMenuItem,
  cleaned: {
    name: string;
    description: string;
    price: string;
  }
) {
  if (oldItem._id) {
    return String(oldItem._id);
  }

  return createSlug(
    [oldMenuTitle, cleaned.name, cleaned.description, cleaned.price].join("-")
  );
}

function logMigrationStats(stats: MigrationStats) {
  console.log("Menu migration complete.");
  console.log(`Old menus found: ${stats.oldMenusFound}`);
  console.log(`Categories created/updated: ${stats.categoriesCreatedOrUpdated}`);
  console.log(`Items created/updated: ${stats.itemsCreatedOrUpdated}`);
  console.log(`Skipped items: ${stats.skippedItems.length}`);

  if (stats.skippedItems.length > 0) {
    console.log("Skipped item reasons:");
    for (const skippedItem of stats.skippedItems) {
      console.log(
        `- ${skippedItem.menuTitle}[${skippedItem.index}] "${skippedItem.name || "(no name)"}": ${skippedItem.reason}`
      );
    }
  }
}

migrateMenus()
  .catch((error) => {
    console.error("Menu migration failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongoose();
  });
