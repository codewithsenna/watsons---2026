import { connectMongoose } from "../db/mongoose";
import { AdminAuditLog } from "../models/AdminAuditLog";
import { cleanString } from "../utils/menuDataHelpers";
import { httpError } from "../utils/httpError";
import mongoose from "mongoose";
import type { SerializedAdminUser } from "./adminUserService";

type AuditInput = {
  actor: SerializedAdminUser;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  before?: unknown;
  after?: unknown;
};

type AuditChange = {
  field: string;
  before: unknown;
  after: unknown;
};

type AuditListOptions = {
  cursor?: unknown;
  limit?: unknown;
};

export async function listAuditLogs(
  actor: SerializedAdminUser,
  options: AuditListOptions = {}
) {
  await connectMongoose();
  assertCanViewAuditTrail(actor);

  const limit = normalizeLimit(options.limit);
  const cursorFilter = parseCursor(options.cursor);
  const logs = await AdminAuditLog.find(cursorFilter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  const hasMore = logs.length > limit;
  const visibleLogs = hasMore ? logs.slice(0, limit) : logs;
  const lastLog = visibleLogs[visibleLogs.length - 1];

  return {
    logs: visibleLogs.map(serializeAuditLog),
    hasMore,
    nextCursor: hasMore && lastLog ? createCursor(lastLog) : ""
  };
}

export async function recordAuditLog(input: AuditInput) {
  await connectMongoose();

  const before = normalizeSnapshot(input.before ?? null);
  const after = normalizeSnapshot(input.after ?? null);
  const changes = buildChanges(before, after);

  await AdminAuditLog.create({
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: cleanString(input.action),
    resourceType: cleanString(input.resourceType),
    resourceId: cleanString(input.resourceId),
    resourceName: cleanString(input.resourceName),
    changes,
    before,
    after
  });
}

export function assertCanViewAuditTrail(user: SerializedAdminUser) {
  if (!canViewAuditTrail(user)) {
    throw httpError(403, "Only owners and admins can view the audit trail.");
  }
}

export function canViewAuditTrail(user: SerializedAdminUser) {
  return ["owner", "admin"].includes(user.role) && user.accessLevel >= 90;
}

function buildChanges(before: unknown, after: unknown, prefix = ""): AuditChange[] {
  if (isPlainObject(before) || isPlainObject(after)) {
    const beforeObject = isPlainObject(before) ? before : {};
    const afterObject = isPlainObject(after) ? after : {};
    const fields = new Set([...Object.keys(beforeObject), ...Object.keys(afterObject)]);

    return [...fields].flatMap((field) =>
      buildChanges(
        beforeObject[field] ?? null,
        afterObject[field] ?? null,
        prefix ? `${prefix}.${field}` : field
      )
    );
  }

  if (areEqual(before, after)) {
    return [];
  }

  return [
    {
      field: prefix || "value",
      before,
      after
    }
  ];
}

function normalizeSnapshot(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function areEqual(left: unknown, right: unknown) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function serializeAuditLog(log: {
  _id: mongoose.Types.ObjectId;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  changes: AuditChange[];
  createdAt: Date;
}) {
  return {
    id: log._id.toString(),
    actorEmail: log.actorEmail,
    actorName: log.actorName,
    actorRole: log.actorRole,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    resourceName: log.resourceName,
    changes: log.changes,
    createdAt: log.createdAt.toISOString()
  };
}

function normalizeLimit(value: unknown) {
  const parsed =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : 20;

  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.min(50, Math.max(5, Math.round(parsed)));
}

function parseCursor(value: unknown) {
  const cursor = cleanString(value);

  if (!cursor) {
    return {};
  }

  const [createdAtValue, idValue] = cursor.split("|");
  const createdAt = new Date(createdAtValue);

  if (
    !Number.isFinite(createdAt.getTime()) ||
    !mongoose.Types.ObjectId.isValid(idValue)
  ) {
    throw httpError(400, "Audit cursor is not valid.");
  }

  return {
    $or: [
      { createdAt: { $lt: createdAt } },
      {
        createdAt,
        _id: { $lt: new mongoose.Types.ObjectId(idValue) }
      }
    ]
  };
}

function createCursor(log: { _id: mongoose.Types.ObjectId; createdAt: Date }) {
  return `${log.createdAt.toISOString()}|${log._id.toString()}`;
}
