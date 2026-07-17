import mongoose, { type InferSchemaType } from "mongoose";

const adminSessionSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
      index: true
    },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, default: null },
    requestIp: { type: String, default: "" },
    userAgent: { type: String, default: "" }
  },
  { timestamps: true, collection: "adminSessions" }
);

adminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AdminSessionDocument = InferSchemaType<typeof adminSessionSchema>;

export const AdminSession =
  mongoose.models.AdminSession ??
  mongoose.model("AdminSession", adminSessionSchema);
