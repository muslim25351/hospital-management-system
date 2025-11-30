import type { Request, Response } from "express";
import User from "../models/user.model.ts";
import NursingRecord from "../models/nursingRecord.model.ts";

type ReqWithUser = Request & { user?: any };

export const recordVitals = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { patientUserId, vitals } = req.body || {};
    if (!patientUserId || !vitals)
      return res
        .status(400)
        .json({ message: "patientUserId and vitals are required" });
    const patient = await User.findOne({ userId: patientUserId });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    const record = await NursingRecord.create({
      patient: patient._id,
      nurse: me._id,
      type: "vitals",
      data: vitals,
      status: "final",
    });
    return res.status(201).json({ message: "Vitals recorded", record });
  } catch (err: any) {
    console.error("recordVitals error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const addObservation = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { patientUserId, observation } = req.body || {};
    if (!patientUserId || !observation)
      return res
        .status(400)
        .json({ message: "patientUserId and observation are required" });
    const patient = await User.findOne({ userId: patientUserId });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    const record = await NursingRecord.create({
      patient: patient._id,
      nurse: me._id,
      type: "observation",
      data: observation,
      status: "final",
    });
    return res.status(201).json({ message: "Observation added", record });
  } catch (err: any) {
    console.error("addObservation error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const administerMedication = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { patientUserId, medicationCode, medicationName, dose, route, time } =
      req.body || {};
    if (!patientUserId || !(medicationCode || medicationName)) {
      return res
        .status(400)
        .json({
          message:
            "patientUserId and medicationCode or medicationName are required",
        });
    }
    const patient = await User.findOne({ userId: patientUserId });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    const record = await NursingRecord.create({
      patient: patient._id,
      nurse: me._id,
      type: "medication",
      data: { medicationCode, medicationName, dose, route, time },
      status: "final",
    });
    return res
      .status(201)
      .json({ message: "Medication administration recorded", record });
  } catch (err: any) {
    console.error("administerMedication error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listPatientRecords = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const patientUserId = String(req.query.patientUserId || "").trim();
    const type = String(req.query.type || "").trim();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10)
    );
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (patientUserId) {
      const patient = await User.findOne({ userId: patientUserId });
      if (!patient)
        return res.status(404).json({ message: "Patient not found" });
      filter.patient = patient._id;
    }
    if (type) filter.type = type;
    const [total, items] = await Promise.all([
      NursingRecord.countDocuments(filter),
      NursingRecord.find(filter)
        .populate({ path: "patient", select: "firstName lastName userId" })
        .populate({ path: "nurse", select: "firstName lastName userId" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);
    return res.status(200).json({ total, page, limit, items });
  } catch (err: any) {
    console.error("listPatientRecords error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getRecord = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(id));
    let rec = await NursingRecord.findOne({ recordCode: id })
      .populate({ path: "patient", select: "firstName lastName userId" })
      .populate({ path: "nurse", select: "firstName lastName userId" });
    if (!rec && isObjectId) {
      rec = await NursingRecord.findById(id)
        .populate({ path: "patient", select: "firstName lastName userId" })
        .populate({ path: "nurse", select: "firstName lastName userId" });
    }
    if (!rec) return res.status(404).json({ message: "Record not found" });
    return res.status(200).json({ record: rec });
  } catch (err: any) {
    console.error("getRecord error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteRecord = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(id));
    const filter: any = isObjectId ? { _id: id } : { recordCode: id };
    const rec = await NursingRecord.findOne(filter);
    if (!rec) return res.status(404).json({ message: "Record not found" });
    await NursingRecord.deleteOne(filter);
    return res.status(200).json({ message: "Record deleted" });
  } catch (err: any) {
    console.error("deleteRecord error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
