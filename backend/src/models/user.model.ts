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

/**
 * ✅ This function creates a simple user ID
 * Example: DOC-1234 or PAT-5678
 */
function generateUserId(prefix: string): string {
  const randomNumber = Math.floor(10000 + Math.random() * 90000); // Generates 5-digit number
  return `${prefix}-${randomNumber}`;
}

/**
 * ✅ Get the name of the role (doctor, patient, nurse, admin)
 * based on the role ID stored in the user document.
 */
async function getRoleNameById(roleId: any): Promise<string | undefined> {
  if (!roleId) return undefined;

  try {
    const Role = mongoose.model("Role");
    const roleDoc: any = await Role.findById(roleId).select("name").lean();
    return roleDoc?.name; // return the role's name (e.g., "doctor")
  } catch {
    return undefined; // If something goes wrong, return nothing
  }
}

/**
 * ✅ This "pre-validate" hook runs BEFORE the user is saved.
 * If userId is missing, it automatically generates one.
 */
UserSchema.pre("validate", async function (next) {
  // If userId already exists, do nothing
  if (this.userId) return next();

  // ✅ 1. Get role name from the database
  const roleName = await getRoleNameById((this as any).role);

  // ✅ 2. Map each role to a userId prefix
  // doctor → DOC, patient → PAT, nurse → NUR, admin → ADM
  const prefixMap: Record<string, string> = {
    doctor: "DOC",
    patient: "PAT",
    nurse: "NUR",
    admin: "ADM",
  };

  // If the role is unknown, use default prefix "USR"
  const prefix = prefixMap[roleName?.toLowerCase() || ""] || "USR";

  /**
   * ✅ 3. Try generating a unique userId up to 5 times
   * (Very unlikely to get duplicates, but just in case)
   */
  for (let i = 0; i < 5; i++) {
    const newUserId = generateUserId(prefix);

    const UserModel = mongoose.model("User") as any;
    const exists = await UserModel.findOne({ userId: newUserId }).select("_id");

    // If no user already has this ID, use it and stop trying
    if (!exists) {
      (this as any).userId = newUserId;
      return next();
    }
  }

  /**
   * ✅ 4. If all 5 tries fail (VERY unlikely),
   * just generate one final ID without checking.
   */
  (this as any).userId = generateUserId(prefix);
  return next();
});

const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
export default UserModel as mongoose.Model<any>;
