import { Router } from "express";
import { getMenuDetails, getMenusForRestaurant } from "../services/menuService";

export const menuRoutes = Router();

menuRoutes.get("/:restaurantSlug", async (request, response, next) => {
  try {
    const result = await getMenusForRestaurant(request.params.restaurantSlug);

    if (!result) {
      response.status(404).json({ message: "Restaurant not found." });
      return;
    }

    response.json(result);
  } catch (error) {
    next(error);
  }
});

menuRoutes.get("/:restaurantSlug/:menuSlug", async (request, response, next) => {
  try {
    const result = await getMenuDetails(
      request.params.restaurantSlug,
      request.params.menuSlug,
      {
        category: asString(request.query.category),
        search: asString(request.query.search),
        minPrice: asString(request.query.minPrice),
        maxPrice: asString(request.query.maxPrice)
      }
    );

    if (!result) {
      response.status(404).json({ message: "Menu not found." });
      return;
    }

    response.json(result);
  } catch (error) {
    next(error);
  }
});

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
