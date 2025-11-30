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
  updateLabTest,
  deleteLabTest,
  addPrescription,
  updatePrescription,
  deletePrescription,
  addRadiologyOrder,
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
router.patch("/lab-tests/:id/update", updateLabTest);
router.delete("/lab-tests/:id/delete", deleteLabTest);

// prescriptions can be added here in future
router.post("/prescriptions", addPrescription);
router.patch("/prescriptions/:id/update", updatePrescription);
router.delete("/prescriptions/:id/delete", deletePrescription);

// Radiology Orders
router.post("/radiology-orders", addRadiologyOrder);

export default router;
