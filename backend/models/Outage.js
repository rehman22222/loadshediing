const mongoose = require("mongoose");

// ...existing code...
const outageSchema = new mongoose.Schema({
  area: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  status: { type: String, enum: ["ongoing", "resolved"], default: "ongoing" },
  reportedAt: { type: Date, default: Date.now },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true } // { changed code }
});
// ...existing code...
module.exports = mongoose.model("Outage", outageSchema);