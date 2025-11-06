import type { Request, Response, NextFunction } from "express";
import User from "../models/user.model.ts";
import { generateToken, getTokenFromAuthHeader } from "./createToken.ts";
import jwt from "jsonwebtoken";
// Extend the Request type to include an optional `user` property
export type ReqWithUser = Request & { user?: unknown };

/**
 * Express middleware to ensure the requester is authenticated.
 * - Looks for a JWT in the `jwt` cookie or `Authorization: Bearer <token>` header
 * - Verifies the token and loads the user from the database
 * - Attaches `req.user` and calls `next()` on success
 */
export const isAuthenticated = async (
  req: ReqWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1) Read token from cookie or Authorization header
    const cookieToken = (req as any).cookies?.jwt as string | undefined;
    const headerToken = getTokenFromAuthHeader(req.headers?.authorization);
    const token = cookieToken ?? headerToken ?? null;
    const secret = process.env.JWT_SECRET as string;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: no token provided" });
    }

    // 2) Verify token and extract userId (we store it when creating the token)
    const decoded = jwt.verify(token, secret) as {
      userId?: string;
    };
    const userId = decoded.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: invalid token" });
    }

    // 3) Load user and attach to request
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: user not found" });
    }

    req.user = user;
    return next();
  } catch (error: any) {
    const message =
      error?.name === "TokenExpiredError"
        ? "Unauthorized: token expired"
        : "Unauthorized: invalid token";
    return res.status(401).json({ message });
  }
};
