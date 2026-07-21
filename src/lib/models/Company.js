import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    gst: { type: String, trim: true },
    location: { type: String, trim: true },
  },
  { timestamps: true }
);

companySchema.index({ name: "text" });

export default mongoose.models.Company || mongoose.model("Company", companySchema);
