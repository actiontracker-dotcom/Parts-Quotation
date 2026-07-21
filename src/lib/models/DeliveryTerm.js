import mongoose from "mongoose";

const deliveryTermSchema = new mongoose.Schema(
  {
    value: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.DeliveryTerm || mongoose.model("DeliveryTerm", deliveryTermSchema);
