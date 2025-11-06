import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.model.ts";
import { generateToken } from "../utiles/createToken.ts";

// Helper to omit sensitive fields from user objects
const sanitizeUser = (user: any) => {
  if (!user) return user;
  const obj = user.toObject ? user.toObject() : user;
  const { password, __v, ...rest } = obj;
  return rest;
};

// POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role, // Role ObjectId
      gender,
      dateOfBirth,
      address,
      department,
      specialization,
      licenseNumber,
      bloodGroup,
      allergies,
      medicalHistory,
      insurance,
    } = req.body || {};

    // Basic validation
    if (!firstName || !lastName || !email || !phone || !password || !role) {
      return res.status(400).json({
        message:
          "Missing required fields: firstName, lastName, email, phone, password, role",
      });
    }

    // Check for existing user by email or phone
    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res
        .status(409)
        .json({ message: "User with email or phone already exists" });
    }

    // Hash password
    const saltRounds = 10;
    const hashed = await bcrypt.hash(password, saltRounds);

    // Create a simple userId (could be improved: UUID, nanoid, etc.)
    const userId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const user = await User.create({
      userId,
      firstName,
      lastName,
      email,
      phone,
      password: hashed,
      role,
      gender,
      dateOfBirth,
      address,
      department,
      specialization,
      licenseNumber,
      bloodGroup,
      allergies,
      medicalHistory,
      insurance,
    });

    // Issue JWT as HttpOnly cookie
    const token = generateToken(user._id.toString(), res);

    return res.status(201).json({
      message: "Registration successful",
      user: sanitizeUser(user),
      token,
    });
  } catch (err: any) {
    console.error("Register error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  try {
    const { emailOrPhone, password } = req.body || {};
    if (!emailOrPhone || !password) {
      return res
        .status(400)
        .json({ message: "emailOrPhone and password are required" });
    }

    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id.toString(), res);
    return res
      .status(200)
      .json({ message: "Login successful", user: sanitizeUser(user), token });
  } catch (err: any) {
    console.error("Login error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/auth/logout
export const logout = (req: Request, res: Response) => {
  // Invalidate cookie by clearing it
  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  return res.status(200).json({ message: "Logged out" });
};

// GET /api/auth/me
export const getMe = async (req: Request, res: Response) => {
  try {
    const anyReq = req as Request & { user?: any };
    if (!anyReq.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return res.status(200).json({ user: sanitizeUser(anyReq.user) });
  } catch (err: any) {
    console.error("GetMe error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
