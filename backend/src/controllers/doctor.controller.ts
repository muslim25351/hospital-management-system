import type { Request, Response } from "express";
import Appointment from "../models/appointment.model.ts";
import User from "../models/user.model.ts";
import Availability from "../models/availability.model.ts";

type ReqWithUser = Request & { user?: any };

// GET /api/doctor/appointments
export const listMyAppointments = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10)
    );
    const skip = (page - 1) * limit;
    const status = String(req.query.status ?? "").trim();
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const filter: any = { doctor: me._id };
    if (status) filter.status = status;
    if (from || to) {
      filter.scheduledAt = {} as any;
      if (from) (filter.scheduledAt as any).$gte = from;
      if (to) (filter.scheduledAt as any).$lte = to;
    }

    const [total, items] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.find(filter)
        .populate({ path: "patient", select: "firstName lastName email" })
        .populate({ path: "department", select: "name" })
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({ total, page, limit, items });
  } catch (err: any) {
    console.error("listMyAppointments error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/doctor/appointments/:id
export const getMyAppointmentById = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;

    const appt = await Appointment.findOne({ _id: id, doctor: me._id })
      .populate({ path: "patient", select: "firstName lastName email" })
      .populate({ path: "department", select: "name" });
    if (!appt)
      return res.status(404).json({ message: "Appointment not found" });
    return res.status(200).json({ appointment: appt });
  } catch (err: any) {
    console.error("getMyAppointmentById error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/doctor/appointments/:id/status
export const updateMyAppointmentStatus = async (
  req: ReqWithUser,
  res: Response
) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ["pending", "confirmed", "cancelled", "completed"];
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ message: `status must be one of: ${allowed.join(", ")}` });
    }
    const updated = await Appointment.findOneAndUpdate(
      { _id: id, doctor: me._id },
      { $set: { status, updatedBy: me._id } },
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Appointment not found" });
    return res
      .status(200)
      .json({ message: "Status updated", appointment: updated });
  } catch (err: any) {
    console.error("updateMyAppointmentStatus error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/doctor/appointments/:id/reschedule
export const rescheduleMyAppointmentAsDoctor = async (
  req: ReqWithUser,
  res: Response
) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const { scheduledAt } = req.body || {};
    if (!scheduledAt)
      return res.status(400).json({ message: "scheduledAt is required" });

    const updated = await Appointment.findOneAndUpdate(
      { _id: id, doctor: me._id },
      { $set: { scheduledAt: new Date(scheduledAt), updatedBy: me._id } },
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Appointment not found" });
    return res
      .status(200)
      .json({ message: "Appointment rescheduled", appointment: updated });
  } catch (err: any) {
    console.error(
      "rescheduleMyAppointmentAsDoctor error:",
      err?.message || err
    );
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/doctor/appointments/:id/notes
export const addNotesToMyAppointment = async (
  req: ReqWithUser,
  res: Response
) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const { notes } = req.body || {};
    const updated = await Appointment.findOneAndUpdate(
      { _id: id, doctor: me._id },
      { $set: { notes, updatedBy: me._id } },
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Appointment not found" });
    return res
      .status(200)
      .json({ message: "Notes updated", appointment: updated });
  } catch (err: any) {
    console.error("addNotesToMyAppointment error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/doctor/appointments/:id/assign
export const assignMyselfToAppointment = async (
  req: ReqWithUser,
  res: Response
) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const updated = await Appointment.findOneAndUpdate(
      {
        _id: id,
        $or: [
          { doctor: null },
          { doctor: { $exists: false } },
          { doctor: me._id },
        ],
      },
      { $set: { doctor: me._id, updatedBy: me._id } },
      { new: true }
    );
    if (!updated)
      return res
        .status(409)
        .json({ message: "Appointment is assigned to another doctor" });
    return res
      .status(200)
      .json({ message: "Assigned to appointment", appointment: updated });
  } catch (err: any) {
    console.error("assignMyselfToAppointment error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/doctor/patients
export const listMyPatients = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });

    const patientIds = await Appointment.distinct("patient", {
      doctor: me._id,
    });
    const patients = await User.find({ _id: { $in: patientIds } }).select(
      "-password"
    );
    return res.status(200).json({ total: patients.length, items: patients });
  } catch (err: any) {
    console.error("listMyPatients error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/doctor/availability
export const addAvailability = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });

    const { start, end, notes } = req.body || {};
    if (!start || !end)
      return res.status(400).json({ message: "start and end are required" });
    const s = new Date(start);
    const e = new Date(end);
    if (!(s < e))
      return res.status(400).json({ message: "start must be before end" });

    const slot = await Availability.create({
      doctor: me._id,
      start: s,
      end: e,
      notes,
    });
    return res
      .status(201)
      .json({ message: "Availability added", availability: slot });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Duplicate slot for the same time" });
    }
    console.error("addAvailability error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/doctor/availability
export const listMyAvailability = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });

    const status = String(req.query.status ?? "").trim();
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const filter: any = { doctor: me._id };
    if (status) filter.status = status;
    if (from || to) {
      filter.start = {} as any;
      if (from) (filter.start as any).$gte = from;
      if (to) (filter.start as any).$lte = to;
    }

    const items = await Availability.find(filter).sort({ start: 1 });
    return res.status(200).json({ total: items.length, items });
  } catch (err: any) {
    console.error("listMyAvailability error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/doctor/availability/:id
export const removeAvailability = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const slot = await Availability.findOne({ _id: id, doctor: me._id });
    if (!slot)
      return res.status(404).json({ message: "Availability not found" });
    if (slot.status === "booked") {
      return res.status(409).json({ message: "Cannot remove a booked slot" });
    }
    await Availability.deleteOne({ _id: id });
    return res.status(200).json({ message: "Availability removed" });
  } catch (err: any) {
    console.error("removeAvailability error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
