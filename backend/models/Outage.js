// models/Outage.js
const mongoose = require("mongoose");

const outageSchema = new mongoose.Schema({
  // either link to Area or store name
  areaId: { type: mongoose.Schema.Types.ObjectId, ref: "Area" },
  areaName: { type: String }, // keep for simple queries by name
  city: { type: String, default: "Karachi" },

  // geospatial point
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },

  startTime: { type: Date, required: true },
  endTime: { type: Date }, // nullable = still ongoing
  status: { type: String, enum: ["ongoing", "resolved"], default: "ongoing" },
  reportedAt: { type: Date, default: Date.now },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  note: { type: String }
}, { timestamps: true });

outageSchema.index({ location: "2dsphere" });
outageSchema.index({ startTime: 1, endTime: 1 });
outageSchema.index({ areaId: 1 });
outageSchema.index({ areaName: 1 });

module.exports = mongoose.model("Outage", outageSchema);