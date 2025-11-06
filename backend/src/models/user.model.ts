import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const UserSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    dateOfBirth: { type: Date },

    role: {
      type: Types.ObjectId,
      ref: "Role",
      required: true,
    },

    // common info shared among all
    address: {
      street: { type: String },
      city: { type: String },
      country: { type: String },
      postalCode: { type: String },
    },

    // doctor or staff-specific
    department: { type: Types.ObjectId, ref: "Department" },
    specialization: { type: String },
    licenseNumber: { type: String },

    // patient-specific
    bloodGroup: { type: String },
    allergies: [{ type: String }],
    medicalHistory: [{ type: String }],
    insurance: {
      provider: { type: String },
      policyNumber: { type: String },
      validTill: { type: Date },
    },

    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1, phone: 1 }, { unique: true });

export default mongoose.models.User || mongoose.model("User", UserSchema);
