import mongoose, { type InferSchemaType } from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    city: String,
    province: String,
    country: String
  },
  { _id: false }
);

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    description: { type: String, trim: true },
    address: addressSchema,
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, collection: "restaurants" }
);

export type RestaurantDocument = InferSchemaType<typeof restaurantSchema>;

export const Restaurant =
  mongoose.models.Restaurant ?? mongoose.model("Restaurant", restaurantSchema);
