import mongoose from "mongoose";
const { Schema, Types } = mongoose;

// Represents a prescription authored by a doctor for a patient.
// Pharmacist can view & mark as dispensed. Pricing handled elsewhere.
const PrescriptionItemSchema = new Schema(
  {
    medication: { type: Types.ObjectId, ref: "Pharmacy", required: true },
    name: { type: String, trim: true }, // cached name for quick display
    dosage: { type: String, trim: true }, // e.g. 500mg
    frequency: { type: String, trim: true }, // e.g. 3x daily
    durationDays: { type: Number, min: 1 },
    quantity: { type: Number, min: 0 }, // prescribed quantity
    dispensedQuantity: { type: Number, min: 0, default: 0 }, // updated by pharmacist
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema(
  {
    prescriptionCode: {
      type: String,
      unique: true,
      trim: true,
    },
    patient: { type: Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [PrescriptionItemSchema], default: [] },
    status: {
      type: String,
      enum: ["pending", "partial", "dispensed", "cancelled"],
      default: "pending",
      index: true,
    },
    notes: { type: String, trim: true },
    dispensedAt: { type: Date },
    dispensedBy: { type: Types.ObjectId, ref: "User" }, // pharmacist
    createdBy: { type: Types.ObjectId, ref: "User" }, // doctor
    updatedBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

PrescriptionSchema.index({ patient: 1, doctor: 1, createdAt: -1 });
PrescriptionSchema.index({ prescriptionCode: 1 }, { unique: true });

// Generate a short, human-readable unique code like RX-AB12CD
function generatePrescriptionCode(): string {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  const tail = Date.now().toString(36).slice(-2).toUpperCase();
  return `RX-${part}${tail}`;
}

// Ensure prescriptionCode is set and unique before validation
PrescriptionSchema.pre("validate", async function (next) {
  try {
    if (this.prescriptionCode) return next();
    let attempts = 0;
    while (attempts < 5) {
      const code = generatePrescriptionCode();
      const exists = await (this.constructor as any).exists({
        prescriptionCode: code,
      });
      if (!exists) {
        (this as any).prescriptionCode = code;
        return next();
      }
      attempts += 1;
    }
    return next(new Error("Failed to generate unique prescription code"));
  } catch (err) {
    return next(err as any);
  }
});

// Helper to compute status based on items
PrescriptionSchema.methods.computeStatus = function (): string {
  const items: any[] = this.items || [];
  if (!items.length) return "pending";
  const allQtyKnown = items.every((i) => typeof i.quantity === "number");
  const allDispensed =
    allQtyKnown && items.every((i) => i.dispensedQuantity >= i.quantity);
  const anyDispensed = items.some((i) => i.dispensedQuantity > 0);
  if (allDispensed) return "dispensed";
  if (anyDispensed) return "partial";
  return "pending";
};

const PrescriptionModel =
  mongoose.models.Prescription ||
  mongoose.model("Prescription", PrescriptionSchema);
export default PrescriptionModel as mongoose.Model<any>;
