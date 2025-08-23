// models/Area.js
const mongoose = require("mongoose");

const areaSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  city: { type: String, default: "Karachi" },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  locationIqPlaceId: String
}, { timestamps: true });

areaSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Area", areaSchema);
