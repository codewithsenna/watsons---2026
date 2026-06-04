import mongoose, { type InferSchemaType } from "mongoose";

const menuSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true, collection: "menus" }
);

menuSchema.index(
  { restaurantId: 1, slug: 1 },
  {
    unique: true,
    partialFilterExpression: {
      restaurantId: { $exists: true },
      slug: { $exists: true }
    }
  }
);

export type MenuDocument = InferSchemaType<typeof menuSchema>;

export const Menu = mongoose.models.Menu ?? mongoose.model("Menu", menuSchema);
