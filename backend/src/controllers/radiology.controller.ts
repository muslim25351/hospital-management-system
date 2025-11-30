import type { Request, Response } from "express";
import User from "../models/user.model.ts";
import Radiology from "../models/radiology.model.ts";

type ReqWithUser = Request & { user?: any };

// Radiologist: GET /api/radiology/orders
export const listRadiologyOrders = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10)
    );
    const skip = (page - 1) * limit;
    const status = String(req.query.status || "").trim();
    const modality = String(req.query.modality || "").trim();
    const patientId = String(req.query.patientId || "").trim();
    const assignedToMe =
      String(req.query.assignedToMe || "").toLowerCase() === "true";
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const filter: any = {};
    if (status) filter.status = status;
    if (modality) filter.modality = modality;
    if (patientId) filter.patient = patientId;
    if (assignedToMe) filter.performedBy = me._id;
    if (from || to) {
      filter.createdAt = {} as any;
      if (from) (filter.createdAt as any).$gte = from;
      if (to) (filter.createdAt as any).$lte = to;
    }

    const [total, items] = await Promise.all([
      Radiology.countDocuments(filter),
      Radiology.find(filter)
        .populate({ path: "patient", select: "firstName lastName email" })
        .populate({ path: "doctor", select: "firstName lastName" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({ total, page, limit, items });
  } catch (err: any) {
    console.error("listRadiologyOrders error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Radiologist: GET /api/radiology/orders/:id (supports radiologyCode or _id)
export const getRadiologyOrder = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(id));
    let order = await Radiology.findOne({ radiologyCode: id })
      .populate({ path: "patient", select: "firstName lastName email" })
      .populate({ path: "doctor", select: "firstName lastName" });
    if (!order && isObjectId) {
      order = await Radiology.findById(id)
        .populate({ path: "patient", select: "firstName lastName email" })
        .populate({ path: "doctor", select: "firstName lastName" });
    }
    if (!order)
      return res.status(404).json({ message: "Radiology order not found" });
    return res.status(200).json({ order });
  } catch (err: any) {
    console.error("getRadiologyOrder error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Radiologist: PATCH /api/radiology/orders/:id/status
export const updateRadiologyStatus = async (
  req: ReqWithUser,
  res: Response
) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = [
      "ordered",
      "scheduled",
      "in-progress",
      "completed",
      "cancelled",
    ];
    if (!allowed.includes(status))
      return res
        .status(400)
        .json({ message: `status must be one of: ${allowed.join(", ")}` });

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(id));
    const filter: any = isObjectId ? { _id: id } : { radiologyCode: id };
    const set: any = { status, updatedBy: me._id };
    if (status === "in-progress") set.startedAt = new Date();
    if (status === "completed") set.completedAt = new Date();

    const updated = await Radiology.findOneAndUpdate(
      filter,
      { $set: set },
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Radiology order not found" });
    return res.status(200).json({ message: "Status updated", order: updated });
  } catch (err: any) {
    console.error("updateRadiologyStatus error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Radiologist: PATCH /api/radiology/orders/:id/schedule
export const scheduleRadiology = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const { scheduledAt } = req.body || {};
    if (!scheduledAt)
      return res.status(400).json({ message: "scheduledAt is required" });

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(id));
    const filter: any = isObjectId ? { _id: id } : { radiologyCode: id };
    const updated = await Radiology.findOneAndUpdate(
      filter,
      {
        $set: {
          scheduledAt: new Date(scheduledAt),
          status: "scheduled",
          updatedBy: me._id,
        },
      },
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Radiology order not found" });
    return res.status(200).json({ message: "Order scheduled", order: updated });
  } catch (err: any) {
    console.error("scheduleRadiology error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Radiologist: PATCH /api/radiology/orders/:id/assign
export const assignRadiologyToMe = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(id));
    const filter: any = isObjectId ? { _id: id } : { radiologyCode: id };
    const updated = await Radiology.findOneAndUpdate(
      {
        ...filter,
        $or: [
          { performedBy: null },
          { performedBy: { $exists: false } },
          { performedBy: me._id },
        ],
      },
      { $set: { performedBy: me._id, updatedBy: me._id } },
      { new: true }
    );
    if (!updated)
      return res
        .status(409)
        .json({ message: "Order is assigned to another radiologist" });
    return res
      .status(200)
      .json({ message: "Assigned to order", order: updated });
  } catch (err: any) {
    console.error("assignRadiologyToMe error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Radiologist: PATCH /api/radiology/orders/:id/report
export const addRadiologyReport = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const { reportText, findings, impression, attachments } = req.body || {};

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(id));
    const filter: any = isObjectId ? { _id: id } : { radiologyCode: id };
    const set: any = { reportText, findings, impression, updatedBy: me._id };
    if (Array.isArray(attachments)) set.attachments = attachments;
    set.performedBy = me._id;
    set.status = "completed";
    set.completedAt = new Date();

    const updated = await Radiology.findOneAndUpdate(
      filter,
      { $set: set },
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Radiology order not found" });
    return res.status(200).json({ message: "Report saved", order: updated });
  } catch (err: any) {
    console.error("addRadiologyReport error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Radiologist: DELETE /api/radiology/orders/:id
export const deleteRadiologyOrder = async (req: ReqWithUser, res: Response) => {
  try {
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(id));
    const filter: any = isObjectId ? { _id: id } : { radiologyCode: id };
    const order = await Radiology.findOne(filter);
    if (!order)
      return res.status(404).json({ message: "Radiology order not found" });
    if (order.status === "completed")
      return res
        .status(409)
        .json({ message: "Cannot delete a completed order" });
    await Radiology.deleteOne(filter);
    return res.status(200).json({ message: "Radiology order deleted" });
  } catch (err: any) {
    console.error("deleteRadiologyOrder error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
