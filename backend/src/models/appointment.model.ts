import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const AppointmentSchema = new Schema(
  {
    patient: { type: Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: Types.ObjectId, ref: "User" },
    department: { type: Types.ObjectId, ref: "Department" },
    reason: { type: String, required: true, trim: true },
    scheduledAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
      index: true,
    },
    notes: { type: String },
    createdBy: { type: Types.ObjectId, ref: "User" },
    updatedBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

AppointmentSchema.index({ patient: 1, scheduledAt: -1 });

const AppointmentModel =
  mongoose.models.Appointment ||
  mongoose.model("Appointment", AppointmentSchema);
export default AppointmentModel as mongoose.Model<any>;
