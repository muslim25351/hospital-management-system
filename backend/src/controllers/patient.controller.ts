import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.model.ts";
import Role from "../models/role.model.ts";
import Appointment from "../models/appointment.model.ts";
import type { ReqWithUser } from "../utiles/verifyToken.ts";

// Reusable helper to drop sensitive/internal fields
const sanitizeUser = (user: any) => {
  if (!user) return user;
  const obj = user.toObject ? user.toObject() : user;
  const { password, __v, ...rest } = obj;
  return rest;
};

// Resolve the Role _id for name = 'patient'
async function getPatientRoleId() {
  const role = await Role.findOne({ name: "patient" });
  if (!role) throw new Error("'patient' role not found. Seed roles first.");
  return role._id;
}

// POST /api/patients
export const createPatient = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      dateOfBirth,
      address,
      bloodGroup,
      allergies,
      medicalHistory,
      insurance,
    } = req.body || {};

    // Required fields for patient creation
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        message:
          "Missing required fields: firstName, lastName, email, phone, password",
      });
    }

    // Ensure unique email or phone
    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res
        .status(409)
        .json({ message: "User with email or phone already exists" });
    }

    // Get role id for patient
    const roleId = await getPatientRoleId();

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Simple userId generator (could be replaced by nanoid/uuid)
    const userId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const patient = await User.create({
      userId,
      firstName,
      lastName,
      email,
      phone,
      password: hashed,
      role: roleId,
      gender,
      dateOfBirth,
      address,
      bloodGroup,
      allergies,
      medicalHistory,
      insurance,
      status: "active",
    });

    return res
      .status(201)
      .json({ message: "Patient created", patient: sanitizeUser(patient) });
  } catch (err: any) {
    console.error("createPatient error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/patients
export const listPatients = async (req: Request, res: Response) => {
  try {
    const roleId = await getPatientRoleId();

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10)
    );
    const skip = (page - 1) * limit;

    const q = String(req.query.q ?? "").trim();
    const search: any = q
      ? {
          $or: [
            { firstName: { $regex: q, $options: "i" } },
            { lastName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { phone: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const filter = { role: roleId, ...search };
    const [total, items] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      total,
      page,
      limit,
      items,
    });
  } catch (err: any) {
    console.error("listPatients error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/patients/:id
export const getPatientById = async (req: Request, res: Response) => {
  try {
    const roleId = await getPatientRoleId();
    const { id } = req.params;
    const patient = await User.findOne({ _id: id, role: roleId }).select(
      "-password"
    );
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    return res.status(200).json({ patient });
  } catch (err: any) {
    console.error("getPatientById error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/patients/:id
export const updatePatient = async (req: Request, res: Response) => {
  try {
    const roleId = await getPatientRoleId();
    const { id } = req.params;

    const allowed: any = (({
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      dateOfBirth,
      address,
      bloodGroup,
      allergies,
      medicalHistory,
      insurance,
      status,
    }) => ({
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      dateOfBirth,
      address,
      bloodGroup,
      allergies,
      medicalHistory,
      insurance,
      status,
    }))(req.body || {});

    if (allowed.password) {
      allowed.password = await bcrypt.hash(String(allowed.password), 10);
    }

    // Ensure not changing role away from patient
    delete allowed.role;

    const patient = await User.findOneAndUpdate(
      { _id: id, role: roleId },
      { $set: allowed },
      { new: true }
    ).select("-password");

    if (!patient) return res.status(404).json({ message: "Patient not found" });
    return res.status(200).json({ message: "Patient updated", patient });
  } catch (err: any) {
    console.error("updatePatient error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/patients/:id
export const deletePatient = async (req: Request, res: Response) => {
  try {
    const roleId = await getPatientRoleId();
    const { id } = req.params;
    const hard = String(req.query.hard ?? "false").toLowerCase() === "true";

    if (hard) {
      const result = await User.deleteOne({ _id: id, role: roleId });
      if (result.deletedCount === 0)
        return res.status(404).json({ message: "Patient not found" });
      return res.status(200).json({ message: "Patient deleted" });
    } else {
      const updated = await User.findOneAndUpdate(
        { _id: id, role: roleId },
        { $set: { status: "inactive" } },
        { new: true }
      ).select("-password");
      if (!updated)
        return res.status(404).json({ message: "Patient not found" });
      return res
        .status(200)
        .json({ message: "Patient deactivated", patient: updated });
    }
  } catch (err: any) {
    console.error("deletePatient error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/appointments
// Create an appointment for the authenticated patient
export const createAppointment = async (req: ReqWithUser, res: Response) => {
  try {
    const authUser: any = req.user;
    if (!authUser?._id)
      return res.status(401).json({ message: "Unauthorized" });

    const { scheduledAt, reason, doctorId, departmentId, notes } =
      req.body || {};
    if (!scheduledAt || !reason) {
      return res
        .status(400)
        .json({ message: "scheduledAt and reason are required" });
    }

    const appt = await Appointment.create({
      patient: authUser._id,
      doctor: doctorId || undefined,
      department: departmentId || undefined,
      reason,
      scheduledAt: new Date(scheduledAt),
      status: "pending",
      notes,
      createdBy: authUser._id,
    });

    return res
      .status(201)
      .json({ message: "Appointment created", appointment: appt });
  } catch (err: any) {
    console.error("createAppointment error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/appointments/my
// View appointments for the authenticated patient
export const viewMyAppointments = async (req: ReqWithUser, res: Response) => {
  try {
    const authUser: any = req.user;
    if (!authUser?._id)
      return res.status(401).json({ message: "Unauthorized" });

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10)
    );
    const skip = (page - 1) * limit;
    const status = String(req.query.status ?? "").trim();

    const filter: any = { patient: authUser._id };
    if (status) filter.status = status;

    const [total, items] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.find(filter)
        .populate({ path: "doctor", select: "firstName lastName email" })
        .populate({ path: "department", select: "name" })
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({ total, page, limit, items });
  } catch (err: any) {
    console.error("viewMyAppointments error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/appointments/my/:id
// View a single appointment owned by the authenticated patient
export const viewMyAppointmentById = async (
  req: ReqWithUser,
  res: Response
) => {
  try {
    const authUser: any = req.user;
    if (!authUser?._id)
      return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const appt = await Appointment.findOne({ _id: id, patient: authUser._id })
      .populate({ path: "doctor", select: "firstName lastName email" })
      .populate({ path: "department", select: "name" });
    if (!appt)
      return res.status(404).json({ message: "Appointment not found" });
    return res.status(200).json({ appointment: appt });
  } catch (err: any) {
    console.error("viewMyAppointmentById error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/appointments/my/:id/reschedule
// Reschedule an appointment for the authenticated patient
export const rescheduleMyAppointment = async (
  req: ReqWithUser,
  res: Response
) => {
  try {
    const authUser: any = req.user;
    if (!authUser?._id)
      return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { scheduledAt } = req.body || {};
    if (!scheduledAt)
      return res.status(400).json({ message: "scheduledAt is required" });

    const updated = await Appointment.findOneAndUpdate(
      { _id: id, patient: authUser._id },
      { $set: { scheduledAt: new Date(scheduledAt), updatedBy: authUser._id } },
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Appointment not found" });
    return res
      .status(200)
      .json({ message: "Appointment rescheduled", appointment: updated });
  } catch (err: any) {
    console.error("rescheduleMyAppointment error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/appointments/my/:id/cancel
// Cancel an appointment owned by the authenticated patient
export const cancelMyAppointment = async (req: ReqWithUser, res: Response) => {
  try {
    const authUser: any = req.user;
    if (!authUser?._id)
      return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const updated = await Appointment.findOneAndUpdate(
      { _id: id, patient: authUser._id },
      { $set: { status: "cancelled", updatedBy: authUser._id } },
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Appointment not found" });
    return res
      .status(200)
      .json({ message: "Appointment cancelled", appointment: updated });
  } catch (err: any) {
    console.error("cancelMyAppointment error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
