import mongoose from "mongoose";
const { Schema, Types } = mongoose;

// Status lifecycle:
// ordered -> claimed (technician assigned) -> in_progress -> completed
// A test may also be cancelled while ordered/claimed/in_progress.

const LabTestSchema = new Schema(
  {
    testCode: { type: String, required: true, unique: true, index: true },
    patient: { type: Types.ObjectId, ref: "User", required: true },
    orderedBy: { type: Types.ObjectId, ref: "User", required: true }, // doctor or admin
    doctor: { type: Types.ObjectId, ref: "User" }, // optional explicit doctor reference
    assignedTechnician: { type: Types.ObjectId, ref: "User" },
    testType: { type: String, required: true, trim: true }, // e.g. CBC, MRI, Glucose
    specimenType: { type: String, trim: true }, // e.g. blood, urine
    priority: { type: String, enum: ["routine", "urgent"], default: "routine" },
    status: {
      type: String,
      enum: ["ordered", "claimed", "in_progress", "completed", "cancelled"],
      default: "ordered",
    },
    orderedAt: { type: Date, default: Date.now },
    claimedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    results: {
      summary: { type: String },
      values: [
        { label: String, value: String, unit: String, referenceRange: String },
      ],
      attachments: [{ filename: String, url: String }],
    },
    notes: { type: String },
    updatedBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

function generateTestCode(): string {
  // LAB- plus 6 random digits
  const num = Math.floor(100000 + Math.random() * 900000);
  return `LAB-${num}`;
}

LabTestSchema.pre("validate", async function (next) {
  try {
    const doc: any = this;
    if (!doc.testCode) {
      for (let i = 0; i < 5; i++) {
        const candidate = generateTestCode();
        const exists = await (mongoose.models.LabTest as any)
          .findOne({ testCode: candidate })
          .select("_id");
        if (!exists) {
          doc.testCode = candidate;
          break;
        }
      }
      if (!doc.testCode) doc.testCode = generateTestCode();
    }
    next();
  } catch (e) {
    next(e as any);
  }
});

const LabTestModel =
  mongoose.models.LabTest || mongoose.model("LabTest", LabTestSchema);
export default LabTestModel as mongoose.Model<any>;
