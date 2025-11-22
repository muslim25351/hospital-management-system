import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.model.ts";
import Role, { ROLE_NAMES } from "../models/role.model.ts";
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
      roleName, // preferred: dropdown value (e.g. "doctor"); defaults to 'patient'
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
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        message:
          "Missing required fields: firstName, lastName, email, phone, password",
      });
    }

    // Default roleName to 'patient' if none provided
    const effectiveRoleName = String(roleName || "patient").toLowerCase();
    if (!ROLE_NAMES.includes(effectiveRoleName)) {
      return res.status(400).json({
        message: `Invalid roleName '${effectiveRoleName}'. Allowed: ${ROLE_NAMES.join(
          ", "
        )}`,
      });
    }

    // Resolve role id by name
    const roleDoc = await Role.findOne({ name: effectiveRoleName }).select(
      "_id name"
    );
    if (!roleDoc) {
      return res.status(400).json({
        message: `Role '${effectiveRoleName}' not found. Ensure roles are seeded.`,
      });
    }
    const roleId = roleDoc._id;

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

    // Non-patient roles must be approved by admin before first login.
    // We do NOT trust any incoming status field; model hooks enforce final value.
    const initialStatus =
      effectiveRoleName === "patient" ? "active" : undefined;

    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashed,
      role: roleId,
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
      // Only pass status for patient; for others let schema force inactive
      ...(initialStatus ? { status: initialStatus } : {}),
    });

    // Only issue token cookie if status active
    const token =
      user.status === "active"
        ? generateToken(user._id.toString(), res)
        : undefined;

    const safeUser = sanitizeUser(user);
    return res.status(201).json({
      message: "Registration successful",
      user: {
        ...safeUser,
        roleId: roleId.toString(),
        roleName: effectiveRoleName,
        status: user.status,
        requiresApproval: user.status !== "active",
      },
      token,
      warning:
        user.status !== "active"
          ? "Account pending admin approval. Login disabled until activated."
          : undefined,
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

    if (user.status !== "active") {
      return res.status(403).json({
        message: "Account is not active. Pending admin approval.",
        status: user.status,
      });
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
