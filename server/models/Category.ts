import mongoose, { type InferSchemaType } from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
      index: true
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true, trim: true },
    description: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, collection: "categories" }
);

categorySchema.index({ menuId: 1, slug: 1 }, { unique: true });

export type CategoryDocument = InferSchemaType<typeof categorySchema>;

export const Category =
  mongoose.models.Category ?? mongoose.model("Category", categorySchema);
