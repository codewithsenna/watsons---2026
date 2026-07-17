import mongoose, { type InferSchemaType } from "mongoose";

const adminOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    requestIp: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    attempts: { type: Number, default: 0 }
  },
  { timestamps: true, collection: "adminOtps" }
);

adminOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
adminOtpSchema.index({ email: 1, consumedAt: 1, expiresAt: -1 });

export type AdminOtpDocument = InferSchemaType<typeof adminOtpSchema>;

export const AdminOtp =
  mongoose.models.AdminOtp ?? mongoose.model("AdminOtp", adminOtpSchema);
