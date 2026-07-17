import mongoose, { type InferSchemaType } from "mongoose";

const themeSchema = new mongoose.Schema(
  {
    dark: { type: String, default: "#0B0C0B", trim: true },
    card: { type: String, default: "#151715", trim: true },
    cream: { type: String, default: "#F4EFE6", trim: true },
    green: { type: String, default: "#143A2F", trim: true },
    gold: { type: String, default: "#C89B42", trim: true },
    goldHover: { type: String, default: "#DFAD49", trim: true },
    copper: { type: String, default: "#A55F3F", trim: true },
    mist: { type: String, default: "#9FB7AD", trim: true },
    fontSans: { type: String, default: "DM Sans", trim: true },
    fontSerif: { type: String, default: "DM Serif Display", trim: true }
  },
  { _id: false }
);

const hoursSchema = new mongoose.Schema(
  {
    day: { type: String, required: true, trim: true },
    open: { type: String, default: "17:00", trim: true },
    close: { type: String, default: "02:00", trim: true },
    isClosed: { type: Boolean, default: false }
  },
  { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "watsons" },
    theme: { type: themeSchema, default: () => ({}) },
    hours: { type: [hoursSchema], default: [] },
    updatedBy: { type: String, default: "", trim: true }
  },
  { timestamps: true, collection: "siteSettings" }
);

export type SiteSettingsDocument = InferSchemaType<typeof siteSettingsSchema>;

export const SiteSettings =
  mongoose.models.SiteSettings ??
  mongoose.model("SiteSettings", siteSettingsSchema);
