import crypto from "node:crypto";
import { connectMongoose } from "../db/mongoose";
import { env } from "../env";
import { AdminOtp } from "../models/AdminOtp";
import { AdminSession } from "../models/AdminSession";
import { sendAdminOtpEmail } from "./adminEmailService";
import { recordAuditLog } from "./adminAuditService";
import { httpError } from "../utils/httpError";
import {
  createBootstrapAdmin,
  findOrCreateSignInAdmin,
  getActiveAdminById,
  markAdminSignedIn,
  serializeAdminUser,
  type SerializedAdminUser
} from "./adminUserService";

export const adminSessionCookieName = "watsons_admin_session";

type RequestMeta = {
  ip?: string;
  userAgent?: string;
};

export type AdminSessionUser = SerializedAdminUser & {
  expiresAt: string;
};

export async function requestAdminOtp(emailValue: unknown, meta: RequestMeta) {
  const email = normalizeEmail(emailValue);

  await connectMongoose();
  await requireSignInAdmin(email);

  const otp = crypto.randomInt(100_000, 1_000_000).toString();
  const expiresAt = new Date(Date.now() + env.admin.otpExpiresSeconds * 1000);

  await AdminOtp.updateMany(
    { email, consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );

  await AdminOtp.create({
    email,
    otpHash: hashSecret(`${email}:${otp}`),
    expiresAt,
    requestIp: meta.ip ?? "",
    userAgent: meta.userAgent ?? ""
  });

  await sendAdminOtpEmail(email, otp);

  return {
    email,
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: env.admin.otpExpiresSeconds
  };
}

export async function verifyAdminOtp(
  emailValue: unknown,
  otpValue: unknown,
  meta: RequestMeta
) {
  const email = normalizeEmail(emailValue);
  const otp = normalizeOtp(otpValue);

  await connectMongoose();
  const adminUser = await requireSignInAdmin(email);

  const otpRecord = await AdminOtp.findOne({
    email,
    consumedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw httpError(401, "The code has expired. Request a new one.");
  }

  const expectedHash = hashSecret(`${email}:${otp}`);

  if (!safeEqual(otpRecord.otpHash, expectedHash)) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    throw httpError(401, "That code is not correct.");
  }

  otpRecord.consumedAt = new Date();
  await otpRecord.save();
  await markAdminSignedIn(adminUser._id);

  const sessionToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + env.admin.sessionMaxAgeSeconds * 1000
  );

  const serializedUser = serializeAdminUser(adminUser);
  const session = await AdminSession.create({
    email,
    userId: adminUser._id,
    tokenHash: hashSecret(sessionToken),
    expiresAt,
    requestIp: meta.ip ?? "",
    userAgent: meta.userAgent ?? "",
    lastSeenAt: new Date()
  });

  await recordAuditLog({
    actor: serializedUser,
    action: "signIn",
    resourceType: "adminSession",
    resourceId: session._id.toString(),
    resourceName: serializedUser.email,
    before: null,
    after: {
      email: serializedUser.email,
      role: serializedUser.role,
      signedInAt: new Date().toISOString()
    }
  });

  return {
    token: sessionToken,
    user: {
      ...serializedUser,
      expiresAt: expiresAt.toISOString()
    }
  };
}

export async function getAdminSession(token: string | undefined) {
  if (!token) {
    return null;
  }

  await connectMongoose();

  const session = await AdminSession.findOneAndUpdate(
    {
      tokenHash: hashSecret(token),
      expiresAt: { $gt: new Date() }
    },
    { $set: { lastSeenAt: new Date() } },
    { returnDocument: "after" }
  ).lean();

  if (!session) {
    return null;
  }

  if (!session.userId) {
    await AdminSession.deleteOne({ _id: session._id });
    return null;
  }

  const adminUser = await getActiveAdminById(session.userId);

  if (!adminUser) {
    await AdminSession.deleteOne({ _id: session._id });
    return null;
  }

  return {
    ...serializeAdminUser(adminUser),
    expiresAt: session.expiresAt.toISOString()
  } satisfies AdminSessionUser;
}

export async function revokeAdminSession(token: string | undefined) {
  if (!token) {
    return;
  }

  await connectMongoose();
  await AdminSession.deleteOne({ tokenHash: hashSecret(token) });
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

function normalizeOtp(value: unknown) {
  if (typeof value !== "string") {
    throw httpError(400, "Code is required.");
  }

  const otp = value.trim();

  if (!/^\d{6}$/.test(otp)) {
    throw httpError(400, "Enter the 6-digit code.");
  }

  return otp;
}

async function requireSignInAdmin(email: string) {
  const existingUser = await findOrCreateSignInAdmin(email);

  if (existingUser) {
    return existingUser;
  }

  if (!env.admin.allowedEmails.includes(email)) {
    throw httpError(403, "This email is not authorized for Watson's admin.");
  }

  const bootstrapUser = await createBootstrapAdmin(email);

  return bootstrapUser;
}

function hashSecret(value: string) {
  return crypto
    .createHmac("sha256", env.admin.sessionSecret)
    .update(value)
    .digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}
