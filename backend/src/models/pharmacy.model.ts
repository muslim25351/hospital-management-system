import mongoose from "mongoose";
const { Schema, Types } = mongoose;

// Pharmacy / Medication inventory item
// Represents a single stocked medication batch
const PharmacySchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // Brand or main name
    genericName: { type: String, trim: true },
    batchNumber: { type: String, required: true, trim: true },
    dosageForm: { type: String, trim: true }, // e.g. tablet, capsule, syrup
    strength: { type: String, trim: true }, // e.g. 500mg, 5mg/5ml
    quantityInStock: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, trim: true, default: "units" }, // e.g. tablets, ml, vials
    unitPrice: { type: Number, min: 0, default: 0 }, // Purchase/dispense price per unit
    expiryDate: { type: Date, required: true },
    manufacturer: { type: String, trim: true },
    reorderLevel: { type: Number, min: 0, default: 0 }, // Threshold to trigger restock
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    notes: { type: String, trim: true },
    createdBy: { type: Types.ObjectId, ref: "User" },
    updatedBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Indexes
PharmacySchema.index({ name: 1, batchNumber: 1 }, { unique: true });
PharmacySchema.index({ expiryDate: 1 });

// Helper instance method
PharmacySchema.methods.isLowStock = function (): boolean {
  return this.quantityInStock <= this.reorderLevel && this.reorderLevel > 0;
};

// Static to decrement stock safely
PharmacySchema.statics.decrementStock = async function (
  id: string,
  amount: number
) {
  if (amount <= 0) throw new Error("amount must be > 0");
  const updated = await this.findOneAndUpdate(
    { _id: id, quantityInStock: { $gte: amount } },
    { $inc: { quantityInStock: -amount } },
    { new: true }
  );
  if (!updated) throw new Error("Insufficient stock or item not found");
  return updated;
};

const PharmacyModel =
  mongoose.models.Pharmacy || mongoose.model("Pharmacy", PharmacySchema);
export default PharmacyModel as mongoose.Model<any>;
