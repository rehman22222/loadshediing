// models/Purchase.js
const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: String, required: true },
    purchaseToken: { type: String, required: true, unique: true },
    purchaseDate: { type: Date, required: true },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true },
    raw: {} // keep raw provider payload
  },
  { timestamps: true }
);

purchaseSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model("Purchase", purchaseSchema);
