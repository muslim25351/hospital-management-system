import { Router } from "express";
import appointmentRoutes from "./appointment.route.ts";
import doctorRoutes from "./doctor.route.ts";
import authRoute from "./auth.route.ts";
import roleRoutes from "./role.route.ts";
import adminRoutes from "./admin.route.ts";
import labRoutes from "./lab.route.ts";

const router = Router();

router.get("/", (req, res) => {
  res.json({ status: "ok" });
});
router.use("/auth", authRoute);
router.use("/roles", roleRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/doctor", doctorRoutes);
router.use("/admin", adminRoutes);
router.use("/lab", labRoutes);

export default router;
