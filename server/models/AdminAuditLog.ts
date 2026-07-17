import mongoose, { type InferSchemaType } from "mongoose";

const auditChangeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true, trim: true },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { _id: false }
);

const adminAuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: String, required: true, index: true, trim: true },
    actorEmail: { type: String, required: true, lowercase: true, index: true, trim: true },
    actorName: { type: String, default: "", trim: true },
    actorRole: { type: String, required: true, index: true, trim: true },
    action: { type: String, required: true, index: true, trim: true },
    resourceType: { type: String, required: true, index: true, trim: true },
    resourceId: { type: String, default: "", index: true, trim: true },
    resourceName: { type: String, default: "", trim: true },
    changes: { type: [auditChangeSchema], default: [] },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true, collection: "adminAuditLogs" }
);

adminAuditLogSchema.index({ createdAt: -1 });

export type AdminAuditLogDocument = InferSchemaType<typeof adminAuditLogSchema>;

export const AdminAuditLog =
  mongoose.models.AdminAuditLog ??
  mongoose.model("AdminAuditLog", adminAuditLogSchema);
