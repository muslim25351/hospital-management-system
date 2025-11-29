import { Router } from "express";
import { isAuthenticated } from "../utiles/verifyToken.ts";
import { requireRole } from "../middlewares/role.middleware.ts";
import {
  listPrescriptions,
  getPrescription,
  dispensePrescription,
  listMedications,
  createMedication,
} from "../controllers/pharmacist.controller.ts";

const router = Router();

router.use(isAuthenticated, requireRole("pharmacist"));

router.get("/prescriptions", listPrescriptions);
router.get("/prescriptions/:id", getPrescription);
router.patch("/prescriptions/:id/dispense", dispensePrescription);
router.get("/medications", listMedications);
router.post("/medications", createMedication);

export default router;
