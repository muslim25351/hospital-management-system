import { Router } from "express";
import appointmentRoutes from "./appointment.route.ts";
import doctorRoutes from "./doctor.route.ts";
import authRoute from "./auth.route.ts";

const router = Router();

router.get("/", (req, res) => {
  res.json({ status: "ok" });
});
router.use("/user", authRoute);
router.use("/appointments", appointmentRoutes);
router.use("/doctor", doctorRoutes);

export default router;
