const mongoose = require("mongoose");

const areaSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // human name
  normalizedName: { type: String, required: true, unique: true, index: true }, // lowercase, unique
  city: { type: String, default: "Karachi" },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number],
      required: true, // must always have coords
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length === 2;
        },
        message: "Location must be [lng, lat]"
      }
    }
  },
  locationIqPlaceId: { type: String, default: null }
}, { timestamps: true });

// 2dsphere index for geospatial queries
areaSchema.index({ location: "2dsphere" });

// Normalize name automatically
areaSchema.pre("validate", function (next) {
  if (this.name) {
    this.normalizedName = this.name.trim().replace(/\s+/g, " ").toLowerCase();
  }
  next();
});

module.exports = mongoose.model("Area", areaSchema);