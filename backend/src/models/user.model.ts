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
    gender: { type: String, enum: ["Male", "Female"] },
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

    status: { type: String, enum: ["active", "inactive"] },
    approvedAt: { type: Date },
    approvedBy: { type: Types.ObjectId, ref: "User" },
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
 * ✅ This hook runs BEFORE validation.
 * - Sets status default based on role (patient => active, others => inactive) if not provided
 * - Ensures userId is generated with a role-based prefix when missing
 */
UserSchema.pre("validate", async function (next) {
  try {
    const doc = this as any;
    // Resolve role name once for both status and userId logic
    const roleName: string | undefined = await getRoleNameById(doc.role);

    // Set status only if not already set by controller/logic
    if (!doc.status) {
      doc.status =
        roleName?.toLowerCase() === "patient" ? "active" : "inactive";
    }

    // Generate userId if missing
    if (!doc.userId) {
      const prefixMap: Record<string, string> = {
        doctor: "DOC",
        patient: "PAT",
        nurse: "NUR",
        admin: "ADM",
      };
      const prefix = prefixMap[roleName?.toLowerCase() || ""] || "USR";

      // Try a few times to avoid rare collisions
      for (let i = 0; i < 5; i++) {
        const newUserId = generateUserId(prefix);
        const UserModel = mongoose.model("User") as any;
        const exists = await UserModel.findOne({ userId: newUserId }).select(
          "_id"
        );
        if (!exists) {
          doc.userId = newUserId;
          break;
        }
      }
      if (!doc.userId) {
        // Fallback: assign without checking (extremely unlikely to collide)
        doc.userId = generateUserId(prefix);
      }
    }

    next();
  } catch (e) {
    next(e as any);
  }
});

const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
export default UserModel as mongoose.Model<any>;
