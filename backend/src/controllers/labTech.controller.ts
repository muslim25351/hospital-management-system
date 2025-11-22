import type { Request, Response } from "express";
import LabTest from "../models/labTest.model.ts";
import User from "../models/user.model.ts";

type ReqWithUser = Request & { user?: any };

// GET /api/lab/tests
export const listLabTests = async (req: ReqWithUser, res: Response) => {
  try {
    const { status, patientId, q } = req.query as any;
    const filter: any = {};
    if (status) filter.status = status;
    if (patientId) filter.patient = patientId;
    if (q) {
      // Allow searching by testCode fragment
      filter.testCode = { $regex: String(q), $options: "i" };
    }

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20)
    );
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      LabTest.countDocuments(filter),
      LabTest.find(filter)
        .populate({
          path: "patient",
          select: "firstName lastName email userId",
        })
        .populate({
          path: "assignedTechnician",
          select: "firstName lastName email userId",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({ total, page, limit, items });
  } catch (err: any) {
    console.error("listLabTests error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/lab/tests/:id
export const getLabTestById = async (req: ReqWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const test = await LabTest.findOne({ testCode: id })
      .populate({ path: "patient", select: "firstName lastName email userId" })
      .populate({
        path: "assignedTechnician",
        select: "firstName lastName email userId",
      })
      .populate({
        path: "orderedBy",
        select: "firstName lastName email userId",
      });
    if (!test) return res.status(404).json({ message: "Lab test not found" });
    return res.status(200).json({ test });
  } catch (err: any) {
    console.error("getLabTestById error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/lab/tests/:id/claim
export const claimLabTest = async (req: ReqWithUser, res: Response) => {
  try {
    const { id } = req.params; // testCode
    const me = req.user;
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    const test = await LabTest.findOne({ testCode: id });
    if (!test) return res.status(404).json({ message: "Lab test not found" });
    if (test.status !== "ordered" && test.status !== "claimed") {
      return res
        .status(409)
        .json({ message: "Cannot claim test in current status" });
    }
    if (
      test.assignedTechnician &&
      String(test.assignedTechnician) !== String(me._id)
    ) {
      return res
        .status(409)
        .json({ message: "Test already claimed by another technician" });
    }
    const updated = await LabTest.findOneAndUpdate(
      { testCode: id },
      {
        $set: {
          assignedTechnician: me._id,
          status: "claimed",
          claimedAt: test.claimedAt || new Date(),
          updatedBy: me._id,
        },
      },
      { new: true }
    );
    return res.status(200).json({ message: "Test claimed", test: updated });
  } catch (err: any) {
    console.error("claimLabTest error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/lab/tests/:id/start
export const startLabTest = async (req: ReqWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const me = req.user;
    const test = await LabTest.findOne({ testCode: id });
    if (!test) return res.status(404).json({ message: "Lab test not found" });
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    if (String(test.assignedTechnician) !== String(me._id)) {
      return res
        .status(403)
        .json({ message: "Only assigned technician can start the test" });
    }
    if (test.status !== "claimed") {
      return res
        .status(409)
        .json({ message: "Test must be claimed before starting" });
    }
    const updated = await LabTest.findOneAndUpdate(
      { testCode: id, assignedTechnician: me._id },
      {
        $set: {
          status: "in_progress",
          startedAt: new Date(),
          updatedBy: me._id,
        },
      },
      { new: true }
    );
    return res.status(200).json({ message: "Test started", test: updated });
  } catch (err: any) {
    console.error("startLabTest error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/lab/tests/:id/results
export const submitLabResults = async (req: ReqWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const me = req.user;
    const { summary, values, attachments, notes } = req.body || {};
    const test = await LabTest.findOne({ testCode: id });
    if (!test) return res.status(404).json({ message: "Lab test not found" });
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    if (String(test.assignedTechnician) !== String(me._id)) {
      return res
        .status(403)
        .json({ message: "Only assigned technician can submit results" });
    }
    if (test.status !== "in_progress" && test.status !== "claimed") {
      return res
        .status(409)
        .json({
          message: "Test must be in progress or claimed to submit results",
        });
    }
    const updated = await LabTest.findOneAndUpdate(
      { testCode: id, assignedTechnician: me._id },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          results: { summary, values, attachments },
          notes,
          updatedBy: me._id,
        },
      },
      { new: true }
    );
    return res
      .status(200)
      .json({ message: "Results submitted", test: updated });
  } catch (err: any) {
    console.error("submitLabResults error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/lab/tests/:id/cancel
export const cancelLabTest = async (req: ReqWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const me = req.user;
    const test = await LabTest.findOne({ testCode: id });
    if (!test) return res.status(404).json({ message: "Lab test not found" });
    if (!me?._id) return res.status(401).json({ message: "Unauthorized" });
    if (test.status === "completed" || test.status === "cancelled") {
      return res
        .status(409)
        .json({ message: "Cannot cancel completed or already cancelled test" });
    }
    // Allow cancellation if technician is assigned OR no technician yet
    if (
      test.assignedTechnician &&
      String(test.assignedTechnician) !== String(me._id)
    ) {
      return res
        .status(403)
        .json({ message: "Only assigned technician can cancel this test" });
    }
    const updated = await LabTest.findOneAndUpdate(
      { testCode: id },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          updatedBy: me._id,
        },
      },
      { new: true }
    );
    return res.status(200).json({ message: "Test cancelled", test: updated });
  } catch (err: any) {
    console.error("cancelLabTest error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// (Doctor ordered endpoint might create tests; implemented elsewhere.)
