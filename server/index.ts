import compression from "compression";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ViteDevServer } from "vite";
import { seoByPath } from "../src/seo";
import { env } from "./env";
import { adminRoutes } from "./routes/adminRoutes";
import { menuRoutes } from "./routes/menuRoutes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const isProduction = env.nodeEnv === "production";
const port = env.port;

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((_request, response, next) => {
  response.locals.cspNonce = crypto.randomBytes(16).toString("base64");
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          useDefaults: true,
          directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            objectSrc: ["'none'"],
            scriptSrc: [
              "'self'",
              (_request, response) =>
                `'nonce-${(response as express.Response).locals.cspNonce}'`
            ],
            scriptSrcAttr: ["'none'"],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              "https://fonts.googleapis.com"
            ],
            upgradeInsecureRequests: []
          }
        }
      : false,
    crossOriginEmbedderPolicy: false
  })
);
app.use(compression());
app.use(express.json({ limit: "32kb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false
  })
);
app.use("/api/admin", adminRoutes);
app.use("/api/menus", menuRoutes);

let vite: ViteDevServer | undefined;

if (!isProduction) {
  const { createServer } = await import("vite");
  vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: "custom"
  });
  app.use(vite.middlewares);
} else {
  app.use(
    "/assets",
    express.static(path.resolve(root, "dist/client/assets"), {
      immutable: true,
      maxAge: "1y"
    })
  );
  app.use(
    express.static(path.resolve(root, "dist/client"), {
      index: false,
      maxAge: "1d"
    })
  );
}

app.get("*", async (request, response, next) => {
  try {
    const templatePath = isProduction
      ? path.resolve(root, "dist/client/index.html")
      : path.resolve(root, "index.html");

    let template = await fs.readFile(templatePath, "utf-8");

    if (vite) {
      template = await vite.transformIndexHtml(request.originalUrl, template);
    }

    const html = template.replace(
      "<!--seo-head-->",
      renderSeoHead(
        request.path,
        `${request.protocol}://${request.get("host")}`,
        response.locals.cspNonce
      )
    );

    response.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (error) {
    vite?.ssrFixStacktrace(error as Error);
    next(error);
  }
});

app.use((error: unknown, request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  console.error(error);

  const statusCode = getStatusCode(error);
  const message =
    isProduction && statusCode >= 500
      ? "Internal server error."
      : error instanceof Error
        ? error.message
        : "Unexpected server error.";

  if (request.path.startsWith("/api/")) {
    response.status(statusCode).json({ message });
    return;
  }

  response.status(statusCode).type("text/plain").send(message);
});

const server = app.listen(port, () => {
  console.log(`Watson's is listening on port ${port}.`);
});

server.on("error", (error) => {
  console.error("Server failed to start.", error);
  process.exit(1);
});

function renderSeoHead(pathname: string, requestOrigin: string, cspNonce: string) {
  const seo = pathname.startsWith("/menu")
    ? seoByPath["/menu"]
    : seoByPath[pathname] ?? seoByPath["/"];
  const publicSiteUrl = getPublicSiteUrl(env.siteUrl || requestOrigin, seo.siteUrl);
  const canonical = new URL(pathname, publicSiteUrl).toString();
  const ogImage = new URL(seo.ogImage, publicSiteUrl).toString();
  const logoImage = new URL(seo.logoImage, publicSiteUrl).toString();
  const jsonLd = JSON.stringify({
    ...seo.jsonLd,
    url: canonical,
    image: ogImage,
    logo: logoImage
  }).replace(/</g, "\\u003c");
  const robots = pathname.startsWith("/admin")
    ? "noindex, nofollow"
    : "index, follow";
  const favicon16 = "/icons/favicon-16.png";
  const favicon32 = "/icons/favicon-32.png";
  const appleTouchIcon = "/apple-touch-icon.png";
  const manifest = "/manifest.webmanifest";

  return [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<link rel="icon" href="${favicon16}" type="image/png" sizes="16x16" />`,
    `<link rel="icon" href="${favicon32}" type="image/png" sizes="32x32" />`,
    `<link rel="apple-touch-icon" href="${appleTouchIcon}" sizes="180x180" />`,
    `<link rel="manifest" href="${manifest}" />`,
    `<meta name="application-name" content="${escapeHtml(seo.siteName)}" />`,
    `<meta name="apple-mobile-web-app-title" content="${escapeHtml(seo.siteName)}" />`,
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    `<meta name="robots" content="${robots}" />`,
    '<meta name="theme-color" content="#0B0C0B" />',
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:site_name" content="${escapeHtml(seo.siteName)}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:image:secure_url" content="${ogImage}" />`,
    '<meta property="og:image:type" content="image/png" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${escapeHtml(seo.siteName)} logo and Toronto bar description" />`,
    '<meta property="og:locale" content="en_CA" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(seo.siteName)} logo and Toronto bar description" />`,
    '<link rel="preconnect" href="https://fonts.googleapis.com" />',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
    '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />',
    `<script nonce="${escapeHtml(cspNonce)}" type="application/ld+json">${jsonLd}</script>`
  ].join("\n    ");
}

function getStatusCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status >= 400 && error.status < 600 ? error.status : 500;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500;
  }

  return 500;
}

function getPublicSiteUrl(configuredSiteUrl: string, fallbackSiteUrl: string) {
  try {
    const parsed = new URL(configuredSiteUrl);

    if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      return fallbackSiteUrl;
    }

    return parsed.origin;
  } catch {
    return fallbackSiteUrl;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
