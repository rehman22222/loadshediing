// models/Feedback.js
const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  areaId: { type: mongoose.Schema.Types.ObjectId, ref: "Area" },
  outageId: { type: mongoose.Schema.Types.ObjectId, ref: "Outage" },
  message: { type: String, required: true },
  contact: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Feedback", feedbackSchema);
