// models/Outage.js
const mongoose = require("mongoose");

const outageSchema = new mongoose.Schema({
  area: { type: String, required: true }, // human-friendly
  areaId: { type: mongoose.Schema.Types.ObjectId, ref: "Area", required: true, index: true }, // must link to Area
  city: { type: String, default: "Karachi" },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number],
      required: true, // always enforce [lng, lat]
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length === 2;
        },
        message: "Outage must have valid coordinates [lng, lat]"
      }
    }
  },
  locationIqPlaceId: { type: String, default: null },

  startTime: { type: Date, required: true },
  endTime: { type: Date },

  status: { type: String, enum: ["ongoing", "resolved"], default: "ongoing" },

  reportedAt: { type: Date, default: Date.now },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // user OR null for system imports
  note: { type: String },

  // 🔑 For schedule imports
  importDate: { type: Date },
  importHash: { type: String} // md5 hash of area+time+date
}, { timestamps: true });

// Spatial index
outageSchema.index({ location: "2dsphere" });

// Index for finding duplicates per user reports
outageSchema.index({ area: 1, startTime: 1, reportedBy: 1 }, { unique: false });

// Unique index on importHash (only one outage per hash)
outageSchema.index({ importHash: 1 }, { unique: true, sparse: true });

// --- Validation to stop saving broken records ---
outageSchema.pre("validate", function (next) {
  if (!this.areaId) {
    return next(new Error("Outage must be linked to an Area (areaId required)"));
  }
  if (!this.location || !Array.isArray(this.location.coordinates) || this.location.coordinates.length !== 2) {
    return next(new Error("Outage must have valid coordinates [lng, lat]"));
  }
  next();
});

module.exports = mongoose.model("Outage", outageSchema);