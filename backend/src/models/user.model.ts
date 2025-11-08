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

function generateUserId(prefix: string): string {
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit
  return `${prefix}-${random}`;
}

async function resolveRoleName(roleId: any): Promise<string | undefined> {
  if (!roleId) return undefined;
  try {
    const Role = mongoose.model("Role");
    const doc: any = await Role.findById(roleId).select("name").lean();
    return doc?.name;
  } catch {
    return undefined;
  }
}

UserSchema.pre("validate", async function (next) {
  // Only assign if missing
  if (this.userId) return next();
  const roleName = await resolveRoleName((this as any).role);
  const prefixMap: Record<string, string> = {
    doctor: "DOC",
    patient: "PAT",
    nurse: "NUR",
    admin: "ADM",
  };
  const prefix = prefixMap[roleName?.toLowerCase() || ""] || "USR";

  // Retry a few times in unlikely case of collision
  for (let i = 0; i < 5; i++) {
    const candidate = generateUserId(prefix);
    const existing = await (mongoose.model("User") as any)
      .findOne({ userId: candidate })
      .select("_id");
    if (!existing) {
      (this as any).userId = candidate;
      return next();
    }
  }
  // Fallback
  (this as any).userId = generateUserId(prefix);
  return next();
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
