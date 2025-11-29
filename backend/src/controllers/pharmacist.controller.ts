import type { Request, Response } from "express";
import Prescription from "../models/prescription.model.ts";
import Pharmacy from "../models/pharmacy.model.ts";

type ReqWithUser = Request & { user?: any };

// GET /api/pharmacist/prescriptions
export const listPrescriptions = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user; // pharmacist user
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10)
    );
    const skip = (page - 1) * limit;
    const status = String(req.query.status || "").trim();
    const patientId = String(req.query.patientId || "").trim();

    const filter: any = {};
    if (status) filter.status = status;
    if (patientId) filter.patient = patientId;

    const [total, items] = await Promise.all([
      Prescription.countDocuments(filter),
      Prescription.find(filter)
        .populate({ path: "patient", select: "firstName lastName email" })
        .populate({ path: "doctor", select: "firstName lastName" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({ total, page, limit, items });
  } catch (err: any) {
    console.error("listPrescriptions error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/pharmacist/prescriptions/:id
export const getPrescription = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const rx = await Prescription.findById(id)
      .populate({ path: "patient", select: "firstName lastName email" })
      .populate({ path: "doctor", select: "firstName lastName" });
    if (!rx) return res.status(404).json({ message: "Prescription not found" });
    return res.status(200).json({ prescription: rx });
  } catch (err: any) {
    console.error("getPrescription error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/pharmacist/prescriptions/:id/dispense
// Body: { items: [{ medicationId, quantity }] }
export const dispensePrescription = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const { items } = req.body || {};
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "items array required" });
    }
    const rx: any = await Prescription.findById(id);
    if (!rx) return res.status(404).json({ message: "Prescription not found" });
    if (rx.status === "cancelled") {
      return res.status(409).json({ message: "Prescription is cancelled" });
    }

    // Map for quick lookup
    const byMedication: Record<string, any> = {};
    for (const i of rx.items) {
      if (i.medication) byMedication[String(i.medication)] = i;
    }

    for (const input of items) {
      const medId = String(input.medicationId || "").trim();
      const qty = Number(input.quantity || 0);
      if (!medId || qty <= 0) continue;
      const target = byMedication[medId];
      if (!target) continue; // ignore unknown medication
      // Update dispensedQuantity (capped at prescribed quantity if defined)
      if (typeof target.quantity === "number") {
        target.dispensedQuantity = Math.min(
          target.quantity,
          (target.dispensedQuantity || 0) + qty
        );
      } else {
        target.dispensedQuantity = (target.dispensedQuantity || 0) + qty;
      }
    }

    rx.status = rx.computeStatus();
    rx.dispensedAt = new Date();
    rx.dispensedBy = me._id;
    rx.updatedBy = me._id;
    await rx.save();

    return res.status(200).json({ message: "Dispensed", prescription: rx });
  } catch (err: any) {
    console.error("dispensePrescription error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/pharmacist/medications
export const listMedications = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const search = String(req.query.search || "").trim();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20)
    );
    const skip = (page - 1) * limit;

    const filter: any = { status: "active" };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { genericName: { $regex: search, $options: "i" } },
        { batchNumber: { $regex: search, $options: "i" } },
      ];
    }

    const [total, items] = await Promise.all([
      Pharmacy.countDocuments(filter),
      Pharmacy.find(filter)
        .sort({ expiryDate: 1 })
        .skip(skip)
        .limit(limit)
        .select(
          "name genericName strength dosageForm quantityInStock unit expiryDate status batchNumber"
        ),
    ]);

    return res.status(200).json({ total, page, limit, items });
  } catch (err: any) {
    console.error("listMedications error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/pharmacist/medications
export const createMedication = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });

    const {
      name,
      genericName,
      dosageForm,
      strength,
      batchNumber,
      expiryDate,
      manufacturer,
      notes,
      status,
    } = req.body || {};

    if (!name || !dosageForm || !strength || !batchNumber || !expiryDate) {
      return res.status(400).json({
        message:
          "name, dosageForm, strength, batchNumber and expiryDate are required",
      });
    }

    const med = await Pharmacy.create({
      name,
      genericName,
      dosageForm,
      strength,
      batchNumber,
      expiryDate: new Date(expiryDate),
      manufacturer,
      notes,
      status: status || "active",
      createdBy: me._id,
    });

    return res
      .status(201)
      .json({ message: "Medication created", medication: med });
  } catch (err: any) {
    console.error("createMedication error:", err?.message || err);
    // Handle duplicate key for (name, batchNumber) or medicineCode
    if (String(err?.message || "").includes("duplicate key")) {
      return res
        .status(409)
        .json({ message: "Medication with same name/batch already exists" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};
