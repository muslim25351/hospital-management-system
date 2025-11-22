import type { Request, Response } from "express";
import User from "../models/user.model.ts";

type ReqWithUser = Request & { user?: any };

// PATCH /api/admin/users/:id/approve
// Note: :id is the human-friendly userId (e.g., NUR-67942), not the Mongo ObjectId
export const approveRole = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id?.trim();
    if (!userId) return res.status(400).json({ message: "Missing user id" });

    // Look up by human-friendly userId
    const user = await User.findOne({ userId }).select("role status");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.status === "active") {
      return res.status(200).json({
        message: "User already active",
        user: { userId, status: user.status },
      });
    }

    // Activate account and set audit fields
    const updated = await User.findOneAndUpdate(
      { userId },
      {
        status: "active",
        approvedAt: new Date(),
        approvedBy: (req as any).user?._id,
      },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json({ message: "User approved successfully", user: updated });
  } catch (err: any) {
    console.error("ApproveRole error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// GET /api/admin/users/pending - convenience endpoint for inactive users
export const getPending = async (_req: Request, res: Response) => {
  try {
    const pending = await User.find({ status: "inactive" })
      .select("firstName lastName email phone role status createdAt")
      .lean();
    return res.status(200).json({ count: pending.length, users: pending });
  } catch (err: any) {
    console.error("GetPending error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// GET /api/admin/users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { status } = req.query as { status?: string };
    const filter: any = {};
    if (status && ["active", "inactive"].includes(status))
      filter.status = status;
    const users = await User.find(filter).select("-password");
    return res.status(200).json({ count: users.length, users });
  } catch (err: any) {
    console.error("GetUsers error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PUT /api/admin/users/:id
export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const updates = { ...req.body };

    // Prevent status tampering via generic update; use approve endpoint instead
    if (Object.prototype.hasOwnProperty.call(updates, "status")) {
      delete (updates as any).status;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "approvedAt")) {
      delete (updates as any).approvedAt;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "approvedBy")) {
      delete (updates as any).approvedBy;
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      select: "-password",
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "User updated", user });
  } catch (err: any) {
    console.error("UpdateUser error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err: any) {
    console.error("DeleteUser error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/admin/users/:id/deactivate - revoke access
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select("status");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status === "inactive") {
      return res.status(200).json({ message: "User already inactive" });
    }
    const updated = await User.findByIdAndUpdate(
      userId,
      { status: "inactive" },
      { new: true }
    ).select("-password");
    return res.status(200).json({ message: "User deactivated", user: updated });
  } catch (err: any) {
    console.error("DeactivateUser error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
