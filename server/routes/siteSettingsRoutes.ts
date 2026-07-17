import { Router } from "express";
import { getSiteSettings } from "../services/siteSettingsService";

export const siteSettingsRoutes = Router();

siteSettingsRoutes.get("/", async (_request, response, next) => {
  try {
    response.json(await getSiteSettings());
  } catch (error) {
    next(error);
  }
});
