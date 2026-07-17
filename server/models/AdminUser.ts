import mongoose, { type InferSchemaType } from "mongoose";

export const adminRoles = ["owner", "admin", "manager", "editor", "viewer"] as const;

const adminUserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true
    },
    name: { type: String, default: "", trim: true },
    role: {
      type: String,
      enum: adminRoles,
      default: "editor",
      required: true,
      index: true
    },
    accessLevel: { type: Number, default: 50, min: 0, max: 100 },
    isActive: { type: Boolean, default: true, index: true },
    lastSignedInAt: { type: Date, default: null },
    createdBy: { type: String, default: "", trim: true },
    updatedBy: { type: String, default: "", trim: true }
  },
  { timestamps: true, collection: "adminUsers" }
);

export type AdminRole = (typeof adminRoles)[number];
export type AdminUserDocument = InferSchemaType<typeof adminUserSchema>;

export const AdminUser =
  mongoose.models.AdminUser ?? mongoose.model("AdminUser", adminUserSchema);
