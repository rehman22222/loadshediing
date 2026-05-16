// scripts/seed_outages_from_pdf.js
require("dotenv").config();
const mongoose = require("mongoose");
const minimist = require("minimist");
const path = require("path");
const { parseSchedulePdf } = require("../services/pdfSchedule");
const Outage = require("../models/Outage");
const Area = require("../models/Area");
const User = require("../models/User");
const { forwardGeocode } = require("../services/geocode");
const { connectMongoose } = require("../utils/dbConnection");

async function ensureSystemUser() {
  const email = process.env.SYSTEM_USER_EMAIL || "system@loadshedding.local";
  let user = await User.findOne({ email });
  if (!user) {
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("change-me", salt);
    user = await User.create({
      username: "system-loader",
      email,
      password: hashedPassword,
      role: "premium"
    });
    console.log("Created system user:", user.email);
  }
  return user;
}

async function run() {
  const argv = minimist(process.argv.slice(2));
  const pdfPathRaw = argv._[0];
  const forcedDate = argv.date || argv.d || null;
  const commit = !!argv.commit;
  const replace = !!argv.replace;

  if (!pdfPathRaw) {
    console.error("Usage: node scripts/seed_outages_from_pdf.js <PDF_PATH> [--date YYYY-MM-DD] [--commit] [--replace]");
    process.exit(1);
  }
  const pdfPath = path.resolve(pdfPathRaw);

  await connectMongoose();
  console.log(`Connected to DB: ${mongoose.connection.db.databaseName}`);

  const { dateISO, items } = await parseSchedulePdf(pdfPath, forcedDate || null);
  console.log(`Schedule date: ${dateISO}. Parsed ${items.length} items.`);

  if (items.length === 0) {
    console.log("No items parsed. Exiting.");
    await mongoose.disconnect();
    process.exit(0);
  }

  const systemUser = await ensureSystemUser();

  if (!commit) {
    console.log("Dry-run: will prepare docs but not insert. Use --commit to insert.");
  }

  // Load existing areas for quick mapping
  const areas = await Area.find({}, { name: 1, location: 1, city: 1, locationIqPlaceId: 1 }).lean();
  const areaMap = new Map(areas.map(a => [a.name.trim().toLowerCase(), a]));

  const docs = [];
  for (const it of items) {
    const areaKey = it.area.trim().toLowerCase();
    let match = areaMap.get(areaKey);

    if (!match) {
      // attempt to geocode & create new Area
      let geo = null;
      try { geo = await forwardGeocode(`${it.area}, Karachi`); } catch(e) { geo = null; }

      const areaPayload = {
        name: it.area,
        city: "Karachi",
        location: geo ? { type: "Point", coordinates: [geo.lon, geo.lat] } : undefined,
        locationIqPlaceId: geo?.placeId
      };

      try {
        match = await Area.create(areaPayload);
        areaMap.set(areaKey, match);
        console.log("Created Area:", match.name);
      } catch (err) {
        // maybe concurrent create: try find again
        match = await Area.findOne({ name: it.area }).lean();
      }
    }

    const doc = {
      area: match ? match.name : it.area,
      areaId: match ? match._id : undefined,
      city: match?.city || "Karachi",
      grid: it.grid || undefined,
      startTime: it.startTime,
      endTime: it.endTime,
      status: "ongoing",
      reportedBy: systemUser._id,
      location: match?.location || { type: "Point", coordinates: [0, 0] },
      locationIqPlaceId: match?.locationIqPlaceId
    };
    docs.push(doc);
  }

  console.log(`Prepared ${docs.length} outage docs.`);

  if (!commit) {
    console.log("Sample:", docs.slice(0,3));
    await mongoose.disconnect();
    process.exit(0);
  }

  if (replace) {
    const start = new Date(`${dateISO}T00:00:00+05:00`);
    const end = new Date(`${dateISO}T23:59:59+05:00`);
    const del = await Outage.deleteMany({ reportedBy: systemUser._id, startTime: { $gte: start, $lte: end } });
    console.log(`Removed ${del.deletedCount} previous entries for ${dateISO}`);
  }

  try {
    const res = await Outage.insertMany(docs, { ordered: false });
    console.log(`Inserted ${res.length} outages`);
  } catch (err) {
    console.error("Insert errors:", err && err.writeErrors ? err.writeErrors.map(e => e.errmsg || e.message) : err.message || err);
  } finally {
    await mongoose.disconnect();
    console.log("Done");
  }
}

run().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
