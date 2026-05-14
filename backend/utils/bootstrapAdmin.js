const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function ensureAdminAccount() {
  const email = process.env.ADMIN_EMAIL || "owner@powertrack.local";
  const password = process.env.ADMIN_PASSWORD || "PowerTrack-Owner!2026";
  const username = process.env.ADMIN_USERNAME || "PowerTrack Owner";

  const existing = await User.findOne({ email });

  if (!existing) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      username,
      email,
      phoneNumber: process.env.ADMIN_PHONE || "+10000000000",
      password: hashedPassword,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      role: "admin",
      watchedAreaIds: [],
      areaSelectedAt: new Date(),
      lastAreaChangeAt: new Date(),
      alertPreferences: {
        enabled: true,
        minutesBefore: 15,
        browserPermission: "default",
      },
    });

    return { email, created: true };
  }

  let updated = false;

  if (existing.username !== username) {
    existing.username = username;
    updated = true;
  }

  if (!existing.phoneNumber) {
    existing.phoneNumber = process.env.ADMIN_PHONE || "+10000000000";
    updated = true;
  }

  if (existing.role !== "admin") {
    existing.role = "admin";
    updated = true;
  }

  if (!existing.emailVerified) {
    existing.emailVerified = true;
    existing.emailVerifiedAt = existing.emailVerifiedAt || new Date();
    existing.emailVerificationOtpHash = null;
    existing.emailVerificationOtpExpiresAt = null;
    existing.emailVerificationOtpSentAt = null;
    updated = true;
  }

  const passwordMatches = await bcrypt.compare(password, existing.password);
  if (!passwordMatches) {
    existing.password = await bcrypt.hash(password, 10);
    updated = true;
  }

  if (updated) {
    await existing.save();
  }

  return { email, created: false, updated };
}

module.exports = { ensureAdminAccount };
