import mongoose, { type Types } from "mongoose";
import { connectMongoose } from "../db/mongoose";
import {
  AdminUser,
  adminRoles,
  type AdminRole,
  type AdminUserDocument
} from "../models/AdminUser";
import { recordAuditLog } from "./adminAuditService";
import { cleanString } from "../utils/menuDataHelpers";
import { httpError } from "../utils/httpError";

export type AdminPermissions = {
  canManageMenu: boolean;
  canManageUsers: boolean;
  canViewAuditTrail: boolean;
  canViewAllAuditTrail: boolean;
  canBulkAdjustPrices: boolean;
};

export type SerializedAdminUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  accessLevel: number;
  isActive: boolean;
  permissions: AdminPermissions;
};

type AdminUserInput = {
  email?: unknown;
  name?: unknown;
  role?: unknown;
  accessLevel?: unknown;
  isActive?: unknown;
};

const roleAccessLevel: Record<AdminRole, number> = {
  owner: 100,
  admin: 90,
  manager: 70,
  editor: 50,
  viewer: 10
};

export async function findOrCreateSignInAdmin(email: string) {
  await connectMongoose();

  const existingUser = await AdminUser.findOne({ email });

  if (existingUser) {
    if (!existingUser.isActive) {
      throw httpError(403, "This admin user is disabled.");
    }

    return existingUser;
  }

  return null;
}

export async function createBootstrapAdmin(email: string) {
  await connectMongoose();

  const user = await AdminUser.findOneAndUpdate(
    { email },
    {
      $setOnInsert: {
        email,
        name: "",
        role: "owner",
        accessLevel: roleAccessLevel.owner,
        isActive: true,
        createdBy: "bootstrap",
        updatedBy: "bootstrap"
      }
    },
    { upsert: true, returnDocument: "after" }
  );

  return user;
}

export async function markAdminSignedIn(userId: Types.ObjectId) {
  await AdminUser.updateOne(
    { _id: userId },
    { $set: { lastSignedInAt: new Date() } }
  );
}

export async function getActiveAdminById(userId: Types.ObjectId) {
  return AdminUser.findOne({ _id: userId, isActive: true });
}

export async function listAdminUsers() {
  await connectMongoose();

  const users = await AdminUser.find()
    .sort({ isActive: -1, accessLevel: -1, email: 1 })
    .lean();

  return users.map(serializeAdminUser);
}

export async function createAdminUser(
  input: AdminUserInput,
  actor: SerializedAdminUser
) {
  await connectMongoose();
  assertCanManageUsers(actor);

  const email = normalizeEmail(input.email);
  const role = normalizeRole(input.role);
  const existingUser = await AdminUser.findOne({ email });

  if (existingUser) {
    throw httpError(409, "An admin user with that email already exists.");
  }

  const user = await AdminUser.create({
    email,
    name: optionalText(input.name, 80),
    role,
    accessLevel: normalizeAccessLevel(input.accessLevel, role),
    isActive: "isActive" in input ? Boolean(input.isActive) : true,
    createdBy: actor.email,
    updatedBy: actor.email
  });

  const serializedUser = serializeAdminUser(user);

  await recordAuditLog({
    actor,
    action: "create",
    resourceType: "adminUser",
    resourceId: serializedUser.id,
    resourceName: serializedUser.email,
    before: null,
    after: serializedUser
  });

  return serializedUser;
}

export async function updateAdminUser(
  userId: string,
  input: AdminUserInput,
  actor: SerializedAdminUser
) {
  await connectMongoose();
  assertCanManageUsers(actor);

  const user = await AdminUser.findById(requireObjectId(userId, "User"));

  if (!user) {
    throw httpError(404, "Admin user not found.");
  }

  assertOwnerChangeAllowed(user, actor);
  const beforeUser = serializeAdminUser(user);

  if ("email" in input) {
    const email = normalizeEmail(input.email);
    const duplicate = await AdminUser.findOne({
      _id: { $ne: user._id },
      email
    });

    if (duplicate) {
      throw httpError(409, "An admin user with that email already exists.");
    }

    user.email = email;
  }

  if ("name" in input) {
    user.name = optionalText(input.name, 80);
  }

  if ("role" in input) {
    const role = normalizeRole(input.role);
    user.role = role;
    user.accessLevel = normalizeAccessLevel(input.accessLevel, role);
  } else if ("accessLevel" in input) {
    user.accessLevel = normalizeAccessLevel(input.accessLevel, user.role);
  }

  if ("isActive" in input) {
    if (user._id.toString() === actor.id && !input.isActive) {
      throw httpError(400, "You cannot disable your own admin user.");
    }

    if (user.role === "owner" && !input.isActive) {
      await assertAnotherActiveOwner(user._id);
    }

    user.isActive = Boolean(input.isActive);
  }

  user.updatedBy = actor.email;
  await user.save();

  const afterUser = serializeAdminUser(user);

  await recordAuditLog({
    actor,
    action: "update",
    resourceType: "adminUser",
    resourceId: afterUser.id,
    resourceName: afterUser.email,
    before: beforeUser,
    after: afterUser
  });

  return afterUser;
}

export async function deactivateAdminUser(
  userId: string,
  actor: SerializedAdminUser
) {
  await connectMongoose();
  assertCanManageUsers(actor);

  const user = await AdminUser.findById(requireObjectId(userId, "User"));

  if (!user) {
    throw httpError(404, "Admin user not found.");
  }

  if (user._id.toString() === actor.id) {
    throw httpError(400, "You cannot delete your own admin user.");
  }

  if (user.role === "owner") {
    await assertAnotherActiveOwner(user._id);
  }

  const beforeUser = serializeAdminUser(user);

  user.isActive = false;
  user.updatedBy = actor.email;
  await user.save();

  const afterUser = serializeAdminUser(user);

  await recordAuditLog({
    actor,
    action: "delete",
    resourceType: "adminUser",
    resourceId: afterUser.id,
    resourceName: afterUser.email,
    before: beforeUser,
    after: afterUser
  });

  return afterUser;
}

export function serializeAdminUser(
  user: AdminUserDocument & { _id: Types.ObjectId }
): SerializedAdminUser {
  const role = normalizeRole(user.role);
  const accessLevel = Number.isFinite(user.accessLevel)
    ? user.accessLevel
    : roleAccessLevel[role];

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name ?? "",
    role,
    accessLevel,
    isActive: user.isActive,
    permissions: getPermissions(role, accessLevel)
  };
}

export function getPermissions(
  role: AdminRole,
  accessLevel: number
): AdminPermissions {
  const canViewAllAuditTrail =
    ["owner", "admin", "manager"].includes(role) && accessLevel >= 70;

  return {
    canManageMenu: accessLevel >= 50 && role !== "viewer",
    canManageUsers: ["owner", "admin"].includes(role) && accessLevel >= 90,
    canViewAuditTrail: true,
    canViewAllAuditTrail,
    canBulkAdjustPrices: ["owner", "admin"].includes(role) && accessLevel >= 90
  };
}

export function assertCanManageMenu(user: SerializedAdminUser) {
  if (!user.permissions.canManageMenu) {
    throw httpError(403, "You do not have access to edit menu data.");
  }
}

export function assertCanManageUsers(user: SerializedAdminUser) {
  if (!user.permissions.canManageUsers) {
    throw httpError(403, "You do not have access to manage users.");
  }
}

export function assertCanBulkAdjustPrices(user: SerializedAdminUser) {
  if (!user.permissions.canBulkAdjustPrices) {
    throw httpError(403, "Only owners and admins can bulk-adjust prices.");
  }
}

function assertOwnerChangeAllowed(
  user: AdminUserDocument & { _id: Types.ObjectId },
  actor: SerializedAdminUser
) {
  if (user.role === "owner" && actor.role !== "owner") {
    throw httpError(403, "Only owners can change owner users.");
  }
}

async function assertAnotherActiveOwner(userId: Types.ObjectId) {
  const ownerCount = await AdminUser.countDocuments({
    _id: { $ne: userId },
    role: "owner",
    isActive: true
  });

  if (ownerCount === 0) {
    throw httpError(400, "At least one active owner is required.");
  }
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    throw httpError(400, "Email is required.");
  }

  const email = value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, "Enter a valid email address.");
  }

  return email;
}

function normalizeRole(value: unknown): AdminRole {
  const role = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (adminRoles.includes(role as AdminRole)) {
    return role as AdminRole;
  }

  return "editor";
}

function normalizeAccessLevel(value: unknown, role: AdminRole) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : roleAccessLevel[role];

  if (!Number.isFinite(parsed)) {
    return roleAccessLevel[role];
  }

  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function optionalText(value: unknown, maxLength: number) {
  const text = cleanString(value);

  if (text.length > maxLength) {
    throw httpError(400, `Text must be ${maxLength} characters or less.`);
  }

  return text;
}

function requireObjectId(value: string, label: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw httpError(400, `${label} id is not valid.`);
  }

  return new mongoose.Types.ObjectId(value);
}
