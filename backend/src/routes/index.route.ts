import { Router } from "express";
import appointmentRoutes from "./appointment.route.ts";

const router = Router();

router.get("/", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/appointments", appointmentRoutes);

export default router;
