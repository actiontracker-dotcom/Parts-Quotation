import mongoose from "mongoose";

const divisionSchema = new mongoose.Schema(
  {
    value: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Division || mongoose.model("Division", divisionSchema);
