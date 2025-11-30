import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const AttachmentSchema = new Schema(
  {
    url: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const RadiologySchema = new Schema(
  {
    radiologyCode: { type: String, trim: true },
    patient: { type: Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: Types.ObjectId, ref: "User", required: true, index: true },
    orderedBy: { type: Types.ObjectId, ref: "User" },
    performedBy: { type: Types.ObjectId, ref: "User" }, // radiologist

    modality: {
      type: String,
      enum: ["xray", "ct", "mri", "ultrasound", "mammo", "pet", "other"],
      required: true,
      index: true,
    },
    studyType: { type: String, trim: true },
    bodyPart: { type: String, trim: true },
    priority: {
      type: String,
      enum: ["routine", "urgent"],
      default: "routine",
      index: true,
    },

    status: {
      type: String,
      enum: ["ordered", "scheduled", "in-progress", "completed", "cancelled"],
      default: "ordered",
      index: true,
    },

    scheduledAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },

    reportText: { type: String },
    findings: { type: String },
    impression: { type: String },
    attachments: { type: [AttachmentSchema], default: [] },

    notes: { type: String, trim: true },
    createdBy: { type: Types.ObjectId, ref: "User" },
    updatedBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

RadiologySchema.index({ patient: 1, createdAt: -1 });
RadiologySchema.index({ radiologyCode: 1 }, { unique: true });

function generateRadiologyCode(): string {
  const part = Math.random().toString(36).slice(2, 7).toUpperCase();
  const tail = Date.now().toString(36).slice(-3).toUpperCase();
  return `RAD-${part}${tail}`;
}

RadiologySchema.pre("validate", async function (next) {
  try {
    if ((this as any).radiologyCode) return next();
    let attempts = 0;
    const Model = this.constructor as any;
    while (attempts < 5) {
      const code = generateRadiologyCode();
      const exists = await Model.exists({ radiologyCode: code });
      if (!exists) {
        (this as any).radiologyCode = code;
        return next();
      }
      attempts += 1;
    }
    return next(new Error("Failed to generate unique radiology code"));
  } catch (err) {
    return next(err as any);
  }
});

const RadiologyModel =
  mongoose.models.Radiology || mongoose.model("Radiology", RadiologySchema);
export default RadiologyModel as mongoose.Model<any>;
