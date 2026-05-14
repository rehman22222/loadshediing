// models/Purchase.js
const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: String, required: true },
    planId: { type: String },
    paymentMethod: { type: String, default: "placeholder_card" },
    provider: { type: String, default: "placeholder" },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "PKR" },
    status: {
      type: String,
      enum: ["pending", "active", "expired", "cancelled"],
      default: "active",
    },
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
