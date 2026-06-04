import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ViteDevServer } from "vite";
import { seoByPath } from "../src/seo";
import { env } from "./env";
import { loadMenuFromDatabase } from "./menuRepository";
import { menuRoutes } from "./routes/menuRoutes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const isProduction = env.nodeEnv === "production";
const port = env.port;

const app = express();

app.use("/api/menus", menuRoutes);

app.get("/api/menu", async (_request, response, next) => {
  try {
    const menu = await loadMenuFromDatabase();
    response.json(menu);
  } catch (error) {
    next(error);
  }
});

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
  app.use(express.static(path.resolve(root, "dist/client"), { index: false }));
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
      renderSeoHead(request.path, `${request.protocol}://${request.get("host")}`)
    );

    response.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (error) {
    vite?.ssrFixStacktrace(error as Error);
    next(error);
  }
});

app.listen(port, () => {
  console.log(`Watson's is listening at http://localhost:${port}`);
});

function renderSeoHead(pathname: string, requestOrigin: string) {
  const seo = pathname.startsWith("/menu")
    ? seoByPath["/menu"]
    : seoByPath[pathname] ?? seoByPath["/"];
  const siteUrl = env.siteUrl || requestOrigin;
  const canonical = new URL(pathname, siteUrl).toString();
  const ogImage = new URL(seo.ogImage, siteUrl).toString();
  const jsonLd = JSON.stringify({
    ...seo.jsonLd,
    url: canonical,
    image: ogImage
  }).replace(/</g, "\\u003c");

  return [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    '<meta name="robots" content="index, follow" />',
    '<meta name="theme-color" content="#0B0C0B" />',
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:site_name" content="${escapeHtml(seo.siteName)}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
    '<link rel="preconnect" href="https://fonts.googleapis.com" />',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
    '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />',
    `<script type="application/ld+json">${jsonLd}</script>`
  ].join("\n    ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
