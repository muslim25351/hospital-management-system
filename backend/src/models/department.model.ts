import mongoose, { Document, Model } from "mongoose";
const { Schema } = mongoose;

export interface IDepartment extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
  },
  { timestamps: true }
);

const Department: Model<IDepartment> = 
  (mongoose.models.Department as Model<IDepartment>) ||
  mongoose.model<IDepartment>("Department", DepartmentSchema);

export default Department;
