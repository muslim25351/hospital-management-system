import { Router } from "express";
import { isAuthenticated } from "../utiles/verifyToken.ts";
import { requireRole } from "../middlewares/role.middleware.ts";
import {
  listMyAppointments,
  getMyAppointmentById,
  updateMyAppointmentStatus,
  rescheduleMyAppointmentAsDoctor,
  addNotesToMyAppointment,
  assignMyselfToAppointment,
  listMyPatients,
  addAvailability,
  listMyAvailability,
  removeAvailability,
  addLabTest,
} from "../controllers/doctor.controller.ts";

const router = Router();

router.use(isAuthenticated, requireRole("doctor"));

// Appointments
router.get("/appointments", listMyAppointments);
router.get("/appointments/:id", getMyAppointmentById);
router.patch("/appointments/:id/status", updateMyAppointmentStatus);
router.patch("/appointments/:id/reschedule", rescheduleMyAppointmentAsDoctor);
router.patch("/appointments/:id/notes", addNotesToMyAppointment);
router.patch("/appointments/:id/assign", assignMyselfToAppointment);

// Patients
router.get("/patients", listMyPatients);

// Availability
router.post("/availability", addAvailability);
router.get("/availability", listMyAvailability);
router.delete("/availability/:id", removeAvailability);

// Lab Tests
router.post("/lab-tests", addLabTest);

export default router;
