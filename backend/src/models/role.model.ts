import mongoose from "mongoose";
const { Schema } = mongoose;

// Central source of truth for role names; used for seeding & validation
export const ROLE_NAMES: string[] = [
  "admin",
  "doctor",
  "nurse",
  "patient",
  "pharmacist",
  "labTechnician",
  "receptionist",
  "radiologist",
];

const RoleSchema = new Schema(
  {
    name: {
      type: String,
      enum: ROLE_NAMES,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

const RoleModel = mongoose.models.Role || mongoose.model("Role", RoleSchema);
export default RoleModel as mongoose.Model<any>;
