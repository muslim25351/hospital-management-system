import { Router } from "express";
import Role from "../models/role.model.ts";

const router = Router();

// GET /api/roles - list all roles
router.get("/", async (_req, res) => {
  try {
    const roles = await Role.find({}).select("name description").lean();
    res.json({ roles });
  } catch (e: any) {
    res.status(500).json({ message: "Failed to fetch roles" });
  }
});

export default router;
