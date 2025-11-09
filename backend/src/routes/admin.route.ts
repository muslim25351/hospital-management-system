import { Router } from "express";
import { isAuthenticated } from "../utiles/verifyToken.ts";
import { requireRole } from "../middlewares/role.middleware.ts";
import {
  approveRole,
  getUsers,
  updateUser,
  deleteUser,
  getPending,
  deactivateUser,
} from "../controllers/admin.controller.ts";

const router = Router();

// All admin routes require authentication and admin role
router.use(isAuthenticated, requireRole("admin"));

// Users management
router.get("/users", getUsers);
router.get("/users/pending", getPending);
router.patch("/users/:id/approve", approveRole);
router.patch("/users/:id/deactivate", deactivateUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

export default router;
