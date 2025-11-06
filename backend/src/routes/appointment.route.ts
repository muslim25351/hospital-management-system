import { Router } from "express";
import { isAuthenticated } from "../utiles/verifyToken.ts";
import {
  createAppointment,
  viewMyAppointments,
  viewMyAppointmentById,
  rescheduleMyAppointment,
  cancelMyAppointment,
} from "../controllers/patient.controller.ts";

const router = Router();

// Authenticated patient creates an appointment
router.post("/", isAuthenticated, createAppointment);

// Authenticated patient views their own appointments
router.get("/my", isAuthenticated, viewMyAppointments);
router.get("/my/:id", isAuthenticated, viewMyAppointmentById);
router.patch("/my/:id/reschedule", isAuthenticated, rescheduleMyAppointment);
router.post("/my/:id/cancel", isAuthenticated, cancelMyAppointment);

export default router;
