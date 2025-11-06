import type { Response } from "express";
import jwt, { Secret, SignOptions } from "jsonwebtoken";

// 24 hours in milliseconds
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Create a JWT for the given user and set it as an HttpOnly cookie.
 * Keeps a simple API and reuses the central JWT utility for signing.
 */
export function generateToken(userId: string, res: Response): string {
  const SECRET_KEY: Secret = process.env.JWT_SECRET ?? "default_secret_key";
  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  } as SignOptions; // e.g. '1d', '2h'
  const token = jwt.sign({ userId }, SECRET_KEY, options);

  res.cookie("jwt", token, {
    maxAge: ONE_DAY_MS,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return token;
}

/**
 * Optional helper: extract bare token from an Authorization header
 * formatted as: 'Bearer <token>'.
 */
export function getTokenFromAuthHeader(header?: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}
