import mongoose from "mongoose";

const engineerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    employeeId: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Engineer || mongoose.model("Engineer", engineerSchema);
