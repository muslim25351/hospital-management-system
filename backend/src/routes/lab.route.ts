import { Router } from "express";
import { isAuthenticated } from "../utiles/verifyToken.ts";
import { requireRole } from "../middlewares/role.middleware.ts";
import {
  listLabTests,
  getLabTestById,
  claimLabTest,
  startLabTest,
  submitLabResults,
  cancelLabTest,
} from "../controllers/labTech.controller.ts";

const router = Router();

// All lab technician routes require authentication & labTechnician role
router.use(isAuthenticated, requireRole("labTechnician"));

router.get("/tests", listLabTests);
router.get("/tests/:id", getLabTestById);
router.patch("/tests/:id/claim", claimLabTest);
router.patch("/tests/:id/start", startLabTest);
router.patch("/tests/:id/results", submitLabResults);
router.patch("/tests/:id/cancel", cancelLabTest);

export default router;
