import mongoose from "mongoose";
const { Schema } = mongoose;

const RoleSchema = new Schema(
  {
    name: {
      type: String,
      enum: [
        "admin",
        "doctor",
        "nurse",
        "patient",
        "pharmacist",
        "labTechnician",
        "receptionist",
        "radiologist",
      ],
      required: true,
      unique: true,
    },
    description: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Role || mongoose.model("Role", RoleSchema);
