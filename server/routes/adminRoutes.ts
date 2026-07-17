import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../env";
import {
  adminSessionCookieName,
  getAdminSession,
  requestAdminOtp,
  revokeAdminSession,
  verifyAdminOtp,
  type AdminSessionUser
} from "../services/adminAuthService";
import {
  createAdminCategory,
  createAdminItem,
  getAdminMenu,
  updateAdminCategory,
  updateAdminItem
} from "../services/adminMenuService";
import {
  assertCanManageMenu,
  assertCanManageUsers,
  createAdminUser,
  deactivateAdminUser,
  listAdminUsers,
  updateAdminUser
} from "../services/adminUserService";
import { httpError } from "../utils/httpError";

type AdminRequest = express.Request & {
  adminUser?: AdminSessionUser;
};

export const adminRoutes = Router();

const otpRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 6,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

adminRoutes.use(requireSameOrigin);

adminRoutes.get("/session", async (request, response, next) => {
  try {
    const user = await getAdminSession(readCookie(request, adminSessionCookieName));

    if (!user) {
      response.status(401).json({ authenticated: false });
      return;
    }

    response.json({ authenticated: true, user });
  } catch (error) {
    next(error);
  }
});

adminRoutes.post("/auth/request-otp", otpRateLimit, async (request, response, next) => {
  try {
    const result = await requestAdminOtp(request.body?.email, getRequestMeta(request));

    response.json({
      message: "Code sent.",
      email: result.email,
      expiresAt: result.expiresAt,
      expiresInSeconds: result.expiresInSeconds
    });
  } catch (error) {
    next(error);
  }
});

adminRoutes.post("/auth/verify-otp", otpRateLimit, async (request, response, next) => {
  try {
    const result = await verifyAdminOtp(
      request.body?.email,
      request.body?.otp,
      getRequestMeta(request)
    );

    response.cookie(adminSessionCookieName, result.token, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      path: "/",
      maxAge: env.admin.sessionMaxAgeSeconds * 1000
    });
    response.json({ authenticated: true, user: result.user });
  } catch (error) {
    next(error);
  }
});

adminRoutes.post("/auth/sign-out", async (request, response, next) => {
  try {
    await revokeAdminSession(readCookie(request, adminSessionCookieName));
    clearSessionCookie(response);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

adminRoutes.use(requireAdmin);

adminRoutes.get("/menu", async (_request, response, next) => {
  try {
    response.json(await getAdminMenu());
  } catch (error) {
    next(error);
  }
});

adminRoutes.get("/users", async (request: AdminRequest, response, next) => {
  try {
    assertCanManageUsers(requireRequestUser(request));
    response.json({ users: await listAdminUsers() });
  } catch (error) {
    next(error);
  }
});

adminRoutes.post("/users", async (request: AdminRequest, response, next) => {
  try {
    response
      .status(201)
      .json(await createAdminUser(request.body ?? {}, requireRequestUser(request)));
  } catch (error) {
    next(error);
  }
});

adminRoutes.patch("/users/:userId", async (request: AdminRequest, response, next) => {
  try {
    response.json(
      await updateAdminUser(
        request.params.userId,
        request.body ?? {},
        requireRequestUser(request)
      )
    );
  } catch (error) {
    next(error);
  }
});

adminRoutes.delete("/users/:userId", async (request: AdminRequest, response, next) => {
  try {
    response.json(
      await deactivateAdminUser(request.params.userId, requireRequestUser(request))
    );
  } catch (error) {
    next(error);
  }
});

adminRoutes.post("/categories", async (request: AdminRequest, response, next) => {
  try {
    assertCanManageMenu(requireRequestUser(request));
    response.status(201).json(await createAdminCategory(request.body ?? {}));
  } catch (error) {
    next(error);
  }
});

adminRoutes.patch("/categories/:categoryId", async (request: AdminRequest, response, next) => {
  try {
    assertCanManageMenu(requireRequestUser(request));
    response.json(
      await updateAdminCategory(request.params.categoryId, request.body ?? {})
    );
  } catch (error) {
    next(error);
  }
});

adminRoutes.post("/items", async (request: AdminRequest, response, next) => {
  try {
    assertCanManageMenu(requireRequestUser(request));
    response.status(201).json(await createAdminItem(request.body ?? {}));
  } catch (error) {
    next(error);
  }
});

adminRoutes.patch("/items/:itemId", async (request: AdminRequest, response, next) => {
  try {
    assertCanManageMenu(requireRequestUser(request));
    response.json(await updateAdminItem(request.params.itemId, request.body ?? {}));
  } catch (error) {
    next(error);
  }
});

async function requireAdmin(
  request: AdminRequest,
  _response: express.Response,
  next: express.NextFunction
) {
  try {
    const user = await getAdminSession(readCookie(request, adminSessionCookieName));

    if (!user) {
      throw httpError(401, "Sign in to continue.");
    }

    request.adminUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireRequestUser(request: AdminRequest) {
  if (!request.adminUser) {
    throw httpError(401, "Sign in to continue.");
  }

  return request.adminUser;
}

function requireSameOrigin(
  request: express.Request,
  _response: express.Response,
  next: express.NextFunction
) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    next();
    return;
  }

  const origin = request.get("origin");

  if (!origin) {
    next();
    return;
  }

  try {
    const requestOrigin = `${request.protocol}://${request.get("host")}`;
    const configuredOrigin = env.siteUrl ? new URL(env.siteUrl).origin : "";
    const allowedOrigins = new Set([
      new URL(requestOrigin).origin,
      configuredOrigin
    ]);

    if (!allowedOrigins.has(new URL(origin).origin)) {
      throw httpError(403, "Request origin is not allowed.");
    }

    next();
  } catch (error) {
    next(error);
  }
}

function readCookie(request: express.Request, name: string) {
  const header = request.headers.cookie;

  if (!header) {
    return undefined;
  }

  for (const cookie of header.split(";")) {
    const [key, ...valueParts] = cookie.trim().split("=");

    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return undefined;
}

function clearSessionCookie(response: express.Response) {
  response.clearCookie(adminSessionCookieName, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/"
  });
}

function getRequestMeta(request: express.Request) {
  return {
    ip: request.ip,
    userAgent: request.get("user-agent")
  };
}
