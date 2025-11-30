import mongoose, { Schema, Document, Model } from "mongoose";

export interface INursingRecord extends Document {
  recordCode: string;
  patient: mongoose.Types.ObjectId;
  nurse: mongoose.Types.ObjectId;
  type: "vitals" | "observation" | "medication";
  data: any;
  status: "draft" | "final" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const NursingRecordSchema = new Schema<INursingRecord>(
  {
    recordCode: { type: String, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    nurse: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["vitals", "observation", "medication"],
      required: true,
    },
    data: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["draft", "final", "cancelled"],
      default: "final",
    },
  },
  { timestamps: true }
);

// Auto-generate recordCode NR-000001
NursingRecordSchema.pre("validate", function (next) {
  if (!this.recordCode) {
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
    this.recordCode = `NR-${random}`;
  }
  next();
});

NursingRecordSchema.index({ recordCode: 1 }, { unique: true });
NursingRecordSchema.index({ patient: 1, createdAt: -1 });
NursingRecordSchema.index({ nurse: 1, createdAt: -1 });

const NursingRecord: Model<INursingRecord> =
  mongoose.models.NursingRecord ||
  mongoose.model<INursingRecord>("NursingRecord", NursingRecordSchema);
export default NursingRecord;
