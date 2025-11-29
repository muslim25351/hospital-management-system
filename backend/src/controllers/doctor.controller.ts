import type { Request, Response } from "express";
import Role from "../models/role.model.ts";
import Appointment from "../models/appointment.model.ts";
import User from "../models/user.model.ts";
import Availability from "../models/availability.model.ts";
import LabTestModel from "../models/labTest.model.ts";
import PrescriptionModel from "../models/prescription.model.ts";

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
    const appt = await Appointment.findById(id);
    if (!appt) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    if (String(appt.doctor) !== String(me._id)) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this appointment" });
    }

    const updated = await Appointment.findByIdAndUpdate(
      id,
      { $set: { status, updatedBy: me._id } },
      { new: true }
    );
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

    // Find the 'patient' role ID
    const patientRole = await Role.findOne({ name: "patient" });

    const filter: any = { _id: { $in: patientIds } };
    if (patientRole) {
      filter.role = patientRole._id;
    }

    const patients = await User.find(filter).select("-password");
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

// POST /api/doctor/lab-tests
export const addLabTest = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });

    const {
      patientUserId, // MRN e.g. PAT-12345
      patientName, // Full name or partial
      testType,
      specimenType,
      priority,
      notes,
    } = req.body || {};

    if (!patientUserId || !testType) {
      return res
        .status(400)
        .json({ message: "patientUserId (MRN) and testType are required" });
    }

    // Find patient by userId (MRN)
    // Optionally verify name matches if provided
    const query: any = { userId: patientUserId };

    const patient = await User.findOne(query);

    if (!patient) {
      return res
        .status(404)
        .json({ message: "Patient not found with that ID" });
    }

    // Optional: Check if name matches (case-insensitive)
    if (patientName) {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      if (!fullName.includes(patientName.toLowerCase())) {
        return res.status(400).json({
          message: `Patient ID found, but name does not match. Found: ${patient.firstName} ${patient.lastName}`,
        });
      }
    }

    const test = await LabTestModel.create({
      patient: patient._id,
      orderedBy: me._id,
      doctor: me._id,
      testType,
      specimenType,
      priority: priority || "routine",
      notes,
    });

    return res.status(201).json({ message: "Lab test ordered", test });
  } catch (err: any) {
    console.error("addLabTest error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//patch  api/doctor/lab-tests/id/update
export const updateLabTest = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;

    const { testType, specimenType, priority, notes } = req.body || {};
    if (!testType && !specimenType && !priority) {
      return res
        .status(400)
        .json({ message: "At least one field to update must be provided" });
    }
    const query: any = { testCode: id };
    const labTest = await LabTestModel.findOne(query);
    if (!labTest) {
      return res.status(404).json({ message: "Lab test not found" });
    }
    const updatedLabTest = await LabTestModel.findOneAndUpdate(
      query,
      { $set: { testType, specimenType, priority, notes } },
      { new: true }
    );
    return res
      .status(200)
      .json({ message: "Lab test updated", updatedLabTest });
  } catch (err: any) {
    console.error("updateLabTest error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// delete api/doctor/lab-tests/id/delete
export const deleteLabTest = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const query: any = { testCode: id };

    const labTest = await LabTestModel.findOne(query);
    if (!labTest) {
      return res.status(404).json({ message: "Lab test not found" });
    }
    await LabTestModel.findOneAndDelete(query);
    return res.status(200).json({ message: "Lab test deleted" });
  } catch (err: any) {
    console.error("deleteLabTest error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//post api/doctor/prescriptions
export const addPrescription = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });

    const { patientUserId, items, notes } = req.body || {};
    if (!patientUserId || !Array.isArray(items) || !items.length) {
      return res.status(400).json({
        message: "patientUserId and items array are required",
      });
    }

    const query: any = { userId: patientUserId };

    const patient = await User.findOne(query);

    if (!patient) {
      return res
        .status(404)
        .json({ message: "Patient not found with that ID" });
    }

    const perscribe = await PrescriptionModel.create({
      patient: patient._id,
      doctor: me._id,
      items,
      notes,
    });
    res.status(201).json({ message: "Prescription created", perscribe });
  } catch (err: any) {
    console.error("addLabTest error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
