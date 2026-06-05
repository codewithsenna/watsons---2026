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

const nodeEnv = getEnv("NODE_ENV", "development");
const mongodbUri = getEnv("MONGODB_URI", getEnv("MONGO_URI"));

if (nodeEnv === "production" && !mongodbUri) {
  throw new Error("MONGODB_URI is required in production.");
}

export const env = {
  nodeEnv,
  port: getNumberEnv("PORT", 3000),
  siteUrl: getEnv("SITE_URL"),
  publicApiBaseUrl: getEnv("VITE_PUBLIC_API_BASE_URL", "/api"),
  mongodb: {
    uri: mongodbUri,
    dbName: getEnv("MONGODB_DB_NAME", "watsons")
  }
} as const;

export type ServerEnv = typeof env;
