import dotenv from "dotenv";

dotenv.config();

function getEnv(name: string, fallback = "") {
  return process.env[name] ?? fallback;
}

function getNumberEnv(name: string, fallback: number) {
  const value = process.env[name];
  const parsed = value ? Number(value) : fallback;

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getBooleanEnv(name: string, fallback: boolean) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function getListEnv(name: string, fallback = "") {
  return getEnv(name, fallback)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

const nodeEnv = getEnv("NODE_ENV", "development");
const mongodbUri = getEnv("MONGODB_URI", getEnv("MONGO_URI"));
const adminSessionSecret = getEnv("ADMIN_SESSION_SECRET", getEnv("SESSION_SECRET"));
const adminAllowedEmails = getListEnv("ADMIN_EMAILS", getEnv("ADMIN_EMAIL"));
const smtpUser = getEnv("SMTP_USER");
const defaultOtpFrom = smtpUser
  ? `Watson's <${smtpUser}>`
  : "Watson's <no-reply@watsonstoronto.com>";

if (nodeEnv === "production" && !mongodbUri) {
  throw new Error("MONGODB_URI is required in production.");
}

if (nodeEnv === "production" && !adminSessionSecret) {
  throw new Error("ADMIN_SESSION_SECRET is required in production.");
}

if (nodeEnv === "production" && adminAllowedEmails.length === 0) {
  throw new Error("ADMIN_EMAILS is required in production.");
}

export const env = {
  nodeEnv,
  port: getNumberEnv("PORT", 3000),
  siteUrl: getEnv("SITE_URL"),
  publicApiBaseUrl: getEnv("VITE_PUBLIC_API_BASE_URL", "/api"),
  mongodb: {
    uri: mongodbUri,
    dbName: getEnv("MONGODB_DB_NAME", "watsons")
  },
  admin: {
    allowedEmails: adminAllowedEmails,
    sessionSecret:
      adminSessionSecret || "development-only-watsons-admin-session-secret",
    sessionMaxAgeSeconds: getNumberEnv("ADMIN_SESSION_MAX_AGE_SECONDS", 28_800),
    otpExpiresSeconds: getNumberEnv("ADMIN_OTP_EXPIRES_SECONDS", 30),
    otpFrom: getEnv("ADMIN_OTP_FROM", defaultOtpFrom),
    restaurantSlug: getEnv("ADMIN_RESTAURANT_SLUG", "watsons"),
    menuSlug: getEnv("ADMIN_MENU_SLUG", "liquor"),
    smtp: {
      host: getEnv("SMTP_HOST"),
      port: getNumberEnv("SMTP_PORT", 587),
      secure: getBooleanEnv("SMTP_SECURE", false),
      user: smtpUser,
      pass: getEnv("SMTP_PASS")
    }
  }
} as const;

export type ServerEnv = typeof env;
