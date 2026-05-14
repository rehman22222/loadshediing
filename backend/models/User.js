// models/User.js
const mongoose = require("mongoose");

const alertPreferencesSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    minutesBefore: { type: Number, default: 15, min: 5, max: 120 },
    browserPermission: {
      type: String,
      enum: ["default", "granted", "denied"],
      default: "default",
    },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    city: { type: String },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  phoneNumber: { type: String, default: "" },
  password: { type: String, required: true },
  emailVerified: { type: Boolean, default: true },
  emailVerifiedAt: { type: Date, default: null },
  emailVerificationOtpHash: { type: String, default: null },
  emailVerificationOtpExpiresAt: { type: Date, default: null },
  emailVerificationOtpSentAt: { type: Date, default: null },
  role: { type: String, enum: ["free", "premium", "admin"], default: "free" },
  areaId: { type: mongoose.Schema.Types.ObjectId, ref: "Area" },
  watchedAreaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Area" }],
  areaSelectedAt: { type: Date },
  lastAreaChangeAt: { type: Date },
  alertPreferences: { type: alertPreferencesSchema, default: () => ({}) },
  location: { type: locationSchema, default: null },
  expoPushToken: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
