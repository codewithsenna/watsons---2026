import dotenv from "dotenv";

dotenv.config();

if (!process.env.MONGODB_URI) {
  dotenv.config({ path: ".env.example" });
}

function getEnv(name: string, fallback = "") {
  return process.env[name] ?? fallback;
}

function getNumberEnv(name: string, fallback: number) {
  const value = process.env[name];
  const parsed = value ? Number(value) : fallback;

  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: getEnv("NODE_ENV", "development"),
  port: getNumberEnv("PORT", 3000),
  siteUrl: getEnv("SITE_URL"),
  publicApiBaseUrl: getEnv("VITE_PUBLIC_API_BASE_URL", "/api"),
  mongodb: {
    uri: getEnv("MONGODB_URI", getEnv("MONGO_URI")),
    dbName: getEnv("MONGODB_DB_NAME", "watsons"),
    liquorCollection: getEnv("MONGODB_LIQUOR_COLLECTION", "menus"),
    menuDocumentTitle: getEnv("MONGODB_MENU_DOCUMENT_TITLE", "qrMenu")
  },
  menuApi: {
    baseUrl: getEnv("MENU_API_BASE_URL"),
    apiKey: getEnv("MENU_API_KEY")
  }
} as const;

export type ServerEnv = typeof env;
