import mongoose, { type InferSchemaType } from "mongoose";

const pricingSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "CAD", trim: true }
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true
    },
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
      index: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true, trim: true },
    description: { type: String, default: "", trim: true },
    pricing: { type: [pricingSchema], default: [] },
    tags: { type: [String], default: [] },
    imageUrl: { type: String, default: null },
    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    legacyId: { type: String, index: true, trim: true },
    legacyMenuTitle: { type: String, index: true, trim: true }
  },
  { timestamps: true, collection: "menuItems" }
);

menuItemSchema.index({ menuId: 1, categoryId: 1, isAvailable: 1 });
menuItemSchema.index({ name: "text", description: "text" });
menuItemSchema.index({ menuId: 1, slug: 1 });
menuItemSchema.index(
  { restaurantId: 1, legacyMenuTitle: 1, legacyId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      restaurantId: { $exists: true },
      legacyMenuTitle: { $exists: true },
      legacyId: { $exists: true }
    }
  }
);

export type MenuItemDocument = InferSchemaType<typeof menuItemSchema>;

export const MenuItem =
  mongoose.models.MenuItem ?? mongoose.model("MenuItem", menuItemSchema);
