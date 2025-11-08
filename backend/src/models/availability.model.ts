import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const AvailabilitySchema = new Schema(
  {
    doctor: { type: Types.ObjectId, ref: "User", required: true, index: true },
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true },
    status: {
      type: String,
      enum: ["available", "booked"],
      default: "available",
      index: true,
    },
    notes: { type: String },
  },
  { timestamps: true }
);

AvailabilitySchema.index({ doctor: 1, start: 1, end: 1 }, { unique: true });

export default mongoose.models.Availability ||
  mongoose.model("Availability", AvailabilitySchema);
