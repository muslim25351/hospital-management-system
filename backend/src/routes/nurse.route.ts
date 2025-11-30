import { Router } from "express";
import { isAuthenticated } from "../utiles/verifyToken.ts";
import { requireRole } from "../middlewares/role.middleware.ts";
import {
  recordVitals,
  addObservation,
  administerMedication,
  listPatientRecords,
  getRecord,
  deleteRecord,
} from "../controllers/nurse.controller.ts";

const router = Router();

router.use(isAuthenticated, requireRole("nurse"));

router.post("/vitals", recordVitals);
router.post("/observations", addObservation);
router.post("/medications/administer", administerMedication);
router.get("/records", listPatientRecords);
router.get("/records/:id", getRecord);
router.delete("/records/:id", deleteRecord);

export default router;
