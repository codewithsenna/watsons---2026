import fs from "node:fs/promises";
import path from "node:path";
import mongoose, { type Types } from "mongoose";
import { connectMongoose, disconnectMongoose } from "../db/mongoose";
import { cleanString } from "../utils/menuDataHelpers";

type JsonMenuDocument = {
  title?: unknown;
  data?: JsonMenuItem[];
};

type JsonMenuItem = {
  _id?: {
    $oid?: unknown;
  };
  type?: unknown;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  itemDescription?: unknown;
};

type LegacyMenuItem = {
  _id?: Types.ObjectId | string;
  type?: string;
  name?: string;
  description?: string;
  price?: string;
  itemDescription?: string;
};

type LegacyMenuDocument = {
  title: string;
  data?: LegacyMenuItem[];
};

type CliOptions = {
  dryRun: boolean;
  inputFilePath: string;
  menuTitle?: string;
  removalItem?: RemovalItem;
};

type RemovalItem = {
  name: string;
  description: string;
  price: string;
};

type UpdatePlan = {
  jsonItem: JsonMenuItem;
  mongoItem: LegacyMenuItem;
  matchType: "id" | "fallback";
  itemDescription: string;
};

type SkippedItem = {
  name: string;
  reason: string;
};

async function updateMenuItemDescriptions() {
  const options = parseCliOptions(process.argv.slice(2));
  const jsonMenu = await readJsonMenu(options.inputFilePath);
  const jsonItems = Array.isArray(jsonMenu.data) ? jsonMenu.data : [];
  const menuTitle = options.menuTitle ?? cleanString(jsonMenu.title);

  if (!menuTitle) {
    throw new Error(
      "Menu document title is required. Provide --menu-title or include title in the JSON file."
    );
  }

  console.log(
    `Menu item description migration ${options.dryRun ? "dry run" : "write run"}.`
  );
  console.log(`Input file: ${options.inputFilePath}`);
  console.log(`Menu document title: ${menuTitle}`);
  console.log(`Total items found in JSON: ${jsonItems.length}`);

  await connectMongoose();

  const menusCollection =
    mongoose.connection.collection<LegacyMenuDocument>("menus");
  type MenuBulkOperation = Parameters<typeof menusCollection.bulkWrite>[0][number];

  const menuDocument = await menusCollection.findOne({ title: menuTitle });

  if (!menuDocument) {
    throw new Error(`Could not find a menu document with title "${menuTitle}".`);
  }

  const mongoItems = Array.isArray(menuDocument.data) ? menuDocument.data : [];
  const removalItem = options.removalItem;
  const matches = createUpdatePlan(jsonItems, mongoItems, removalItem);
  const removalItemExists = removalItem
    ? mongoItems.some((item) => matchesRemovalItem(item, removalItem))
    : false;
  const bulkOperations: MenuBulkOperation[] = matches.updates.map((update) =>
    createUpdateOperation(update, menuTitle)
  );

  if (removalItem && removalItemExists) {
    bulkOperations.push({
      updateOne: {
        filter: { title: menuTitle },
        update: { $pull: { data: removalItem } }
      }
    });
  }

  logPlan({
    dryRun: options.dryRun,
    updates: matches.updates,
    skippedItems: matches.skippedItems,
    removalItemConfigured: Boolean(removalItem),
    removalItemExists
  });

  if (options.dryRun) {
    return;
  }

  if (bulkOperations.length === 0) {
    console.log("No MongoDB writes needed.");
    return;
  }

  const result = await menusCollection.bulkWrite(bulkOperations, {
    ordered: false
  });

  console.log("MongoDB bulkWrite complete.");
  console.log(`Matched documents: ${result.matchedCount}`);
  console.log(`Modified documents: ${result.modifiedCount}`);
}

function parseCliOptions(args: string[]): CliOptions {
  let dryRun = false;
  let inputFilePath = getConfiguredPath("MENU_DESCRIPTION_FILE");
  let menuTitle = cleanString(process.env.MENU_DESCRIPTION_MENU_TITLE);
  let removalItem = parseRemovalItemFromEnv();
  const removalItemInput: Partial<RemovalItem> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--file") {
      const nextArg = args[index + 1];

      if (!nextArg) {
        throw new Error("--file requires a JSON file path.");
      }

      inputFilePath = path.resolve(nextArg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--file=")) {
      inputFilePath = path.resolve(arg.slice("--file=".length));
      continue;
    }

    if (arg === "--menu-title") {
      const nextArg = args[index + 1];

      if (!nextArg) {
        throw new Error("--menu-title requires a document title.");
      }

      menuTitle = cleanString(nextArg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--menu-title=")) {
      menuTitle = cleanString(arg.slice("--menu-title=".length));
      continue;
    }

    if (arg === "--remove-item-json") {
      const nextArg = args[index + 1];

      if (!nextArg) {
        throw new Error("--remove-item-json requires a JSON object.");
      }

      removalItem = parseRemovalItemJson(nextArg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--remove-item-json=")) {
      removalItem = parseRemovalItemJson(arg.slice("--remove-item-json=".length));
      continue;
    }

    if (arg === "--remove-item-name") {
      removalItemInput.name = readNextArg(args, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--remove-item-name=")) {
      removalItemInput.name = arg.slice("--remove-item-name=".length);
      continue;
    }

    if (arg === "--remove-item-description") {
      removalItemInput.description = readNextArg(args, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--remove-item-description=")) {
      removalItemInput.description = arg.slice("--remove-item-description=".length);
      continue;
    }

    if (arg === "--remove-item-price") {
      removalItemInput.price = readNextArg(args, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--remove-item-price=")) {
      removalItemInput.price = arg.slice("--remove-item-price=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!inputFilePath) {
    throw new Error(
      "Input JSON file is required. Provide --file or MENU_DESCRIPTION_FILE."
    );
  }

  if (!removalItem && hasRemovalItemInput(removalItemInput)) {
    removalItem = createRemovalItem(removalItemInput);
  }

  return {
    dryRun,
    inputFilePath,
    ...(menuTitle ? { menuTitle } : {}),
    ...(removalItem ? { removalItem } : {})
  };
}

async function readJsonMenu(inputFilePath: string) {
  const rawJson = await fs.readFile(inputFilePath, "utf-8");
  const parsed = JSON.parse(rawJson) as JsonMenuDocument;

  if (!Array.isArray(parsed.data)) {
    throw new Error("Expected JSON file to contain a top-level data array.");
  }

  return parsed;
}

function createUpdatePlan(
  jsonItems: JsonMenuItem[],
  mongoItems: LegacyMenuItem[],
  removalItem: RemovalItem | undefined
) {
  const mongoItemsById = new Map<string, LegacyMenuItem>();
  const mongoItemsByFallbackKey = new Map<string, LegacyMenuItem[]>();

  for (const mongoItem of mongoItems) {
    const itemId = getMongoItemId(mongoItem);

    if (itemId) {
      mongoItemsById.set(itemId, mongoItem);
    }

    const fallbackKey = createFallbackKey(mongoItem);
    const fallbackMatches = mongoItemsByFallbackKey.get(fallbackKey) ?? [];

    fallbackMatches.push(mongoItem);
    mongoItemsByFallbackKey.set(fallbackKey, fallbackMatches);
  }

  const updates: UpdatePlan[] = [];
  const skippedItems: SkippedItem[] = [];

  for (const jsonItem of jsonItems) {
    const name = cleanString(jsonItem.name);
    const itemDescription = cleanString(jsonItem.itemDescription);

    if (removalItem && matchesRemovalItem(jsonItem, removalItem)) {
      skippedItems.push({
        name,
        reason: "Configured removal item is handled by the removal step."
      });
      continue;
    }

    if (!itemDescription) {
      skippedItems.push({
        name,
        reason: "Missing itemDescription."
      });
      continue;
    }

    const jsonItemId = cleanString(jsonItem._id?.$oid);
    const mongoItemById = jsonItemId ? mongoItemsById.get(jsonItemId) : undefined;

    if (mongoItemById) {
      updates.push({
        jsonItem,
        mongoItem: mongoItemById,
        matchType: "id",
        itemDescription
      });
      continue;
    }

    const fallbackMatches =
      mongoItemsByFallbackKey.get(createFallbackKey(jsonItem)) ?? [];

    if (fallbackMatches.length === 1) {
      updates.push({
        jsonItem,
        mongoItem: fallbackMatches[0],
        matchType: "fallback",
        itemDescription
      });
      continue;
    }

    skippedItems.push({
      name,
      reason:
        fallbackMatches.length > 1
          ? "Fallback match is ambiguous."
          : "No matching MongoDB item found."
    });
  }

  return { updates, skippedItems };
}

function createUpdateOperation(update: UpdatePlan, menuTitle: string) {
  if (update.matchType === "id") {
    return {
      updateOne: {
        filter: {
          title: menuTitle,
          "data._id": update.mongoItem._id
        },
        update: {
          $set: {
            "data.$[item].itemDescription": update.itemDescription
          }
        },
        arrayFilters: [{ "item._id": update.mongoItem._id }]
      }
    };
  }

  return {
    updateOne: {
      filter: {
        title: menuTitle,
        data: {
          $elemMatch: createFallbackMatch(update.mongoItem)
        }
      },
      update: {
        $set: {
          "data.$[item].itemDescription": update.itemDescription
        }
      },
      arrayFilters: [createFallbackArrayFilter(update.mongoItem)]
    }
  };
}

function createFallbackMatch(item: LegacyMenuItem) {
  return {
    name: cleanString(item.name),
    type: cleanString(item.type),
    price: cleanString(item.price)
  };
}

function createFallbackArrayFilter(item: LegacyMenuItem) {
  return {
    "item.name": cleanString(item.name),
    "item.type": cleanString(item.type),
    "item.price": cleanString(item.price)
  };
}

function createFallbackKey(item: JsonMenuItem | LegacyMenuItem) {
  return [
    cleanString(item.name).toLowerCase(),
    cleanString(item.type).toLowerCase(),
    cleanString(item.price)
  ].join("\u0000");
}

function getMongoItemId(item: LegacyMenuItem) {
  if (!item._id) {
    return "";
  }

  return String(item._id);
}

function matchesRemovalItem(item: JsonMenuItem | LegacyMenuItem, removalItem: RemovalItem) {
  return (
    cleanString(item.name) === removalItem.name &&
    cleanString(item.description) === removalItem.description &&
    cleanString(item.price) === removalItem.price
  );
}

function getConfiguredPath(envName: string) {
  const configuredPath = cleanString(process.env[envName]);

  return configuredPath ? path.resolve(configuredPath) : "";
}

function readNextArg(args: string[], index: number, argName: string) {
  const nextArg = args[index + 1];

  if (!nextArg) {
    throw new Error(`${argName} requires a value.`);
  }

  return nextArg;
}

function parseRemovalItemFromEnv() {
  const removalItemJson = cleanString(process.env.MENU_DESCRIPTION_REMOVE_ITEM_JSON);

  if (removalItemJson) {
    return parseRemovalItemJson(removalItemJson);
  }

  const removalItemInput = {
    name: process.env.MENU_DESCRIPTION_REMOVE_ITEM_NAME,
    description: process.env.MENU_DESCRIPTION_REMOVE_ITEM_DESCRIPTION,
    price: process.env.MENU_DESCRIPTION_REMOVE_ITEM_PRICE
  };

  return hasRemovalItemInput(removalItemInput)
    ? createRemovalItem(removalItemInput)
    : undefined;
}

function parseRemovalItemJson(value: string) {
  return createRemovalItem(JSON.parse(value) as Partial<RemovalItem>);
}

function hasRemovalItemInput(input: Partial<RemovalItem>) {
  return Boolean(input.name || input.description || input.price);
}

function createRemovalItem(input: Partial<RemovalItem>) {
  const removalItem = {
    name: cleanString(input.name),
    description: cleanString(input.description),
    price: cleanString(input.price)
  };

  if (!removalItem.name || !removalItem.description || !removalItem.price) {
    throw new Error(
      "Removal item requires name, description, and price when configured."
    );
  }

  return removalItem;
}

function logPlan({
  dryRun,
  updates,
  skippedItems,
  removalItemConfigured,
  removalItemExists
}: {
  dryRun: boolean;
  updates: UpdatePlan[];
  skippedItems: SkippedItem[];
  removalItemConfigured: boolean;
  removalItemExists: boolean;
}) {
  const idMatches = updates.filter((update) => update.matchType === "id").length;
  const fallbackMatches = updates.length - idMatches;

  console.log(
    `${dryRun ? "Menu items that would be updated" : "Menu items queued for update"}: ${updates.length}`
  );
  console.log(`Matched by _id.$oid: ${idMatches}`);
  console.log(`Matched by name/type/price fallback: ${fallbackMatches}`);
  console.log(`Skipped/unmatched items: ${skippedItems.length}`);
  console.log(`Removal item configured: ${removalItemConfigured ? "yes" : "no"}`);
  console.log(
    `Removal item status: ${
      removalItemConfigured
        ? removalItemExists
          ? "would remove"
          : "not found"
        : "not configured"
    }`
  );

  if (skippedItems.length > 0) {
    console.log("Skipped item reasons:");
    for (const skippedItem of skippedItems.slice(0, 25)) {
      console.log(`- ${skippedItem.name || "(no name)"}: ${skippedItem.reason}`);
    }

    if (skippedItems.length > 25) {
      console.log(`- ...and ${skippedItems.length - 25} more`);
    }
  }
}

updateMenuItemDescriptions()
  .catch((error) => {
    console.error("Menu item description migration failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongoose();
  });
