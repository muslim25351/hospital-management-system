import { Router } from "express";
import { isAuthenticated } from "../utiles/verifyToken.ts";
import { requireRole } from "../middlewares/role.middleware.ts";
import {
  listRadiologyOrders,
  getRadiologyOrder,
  updateRadiologyStatus,
  scheduleRadiology,
  assignRadiologyToMe,
  addRadiologyReport,
  deleteRadiologyOrder,
} from "../controllers/radiology.controller.ts";

const router = Router();

router.use(isAuthenticated, requireRole("radiologist"));

router.get("/orders", listRadiologyOrders);
router.get("/orders/:id", getRadiologyOrder);
router.patch("/orders/:id/status", updateRadiologyStatus);
router.patch("/orders/:id/schedule", scheduleRadiology);
router.patch("/orders/:id/assign", assignRadiologyToMe);
router.patch("/orders/:id/report", addRadiologyReport);
router.delete("/orders/:id", deleteRadiologyOrder);

export default router;
