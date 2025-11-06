import { Router } from "express";
import { isAuthenticated } from "../utiles/verifyToken.ts";
import {
  createAppointment,
  listMyAppointments,
} from "../controllers/patient.controller.ts";

const router = Router();

// Authenticated patient creates an appointment
router.post("/", isAuthenticated, createAppointment);

// Authenticated patient views their own appointments
router.get("/mine", isAuthenticated, listMyAppointments);

export default router;
