#!/usr/bin/env node
/**
 * Test Nominatim Geocoding for areas with [0,0] coords
 * Usage:
 *   node scripts/test_nominatim_fix.js --limit 5 --commit
 *
 * --limit = number of areas to test (default 5)
 * --commit = actually update DB (otherwise dry-run)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const minimist = require("minimist");
const fetch = require("node-fetch");
const Area = require("../models/Area");
const { connectMongoose } = require("../utils/dbConnection");

const argv = minimist(process.argv.slice(2), {
  number: ["limit"],
  boolean: ["commit"],
  default: { limit: 5, commit: false }
});

/**
 * Utility to clean area names a bit before geocoding
 */
function cleanAreaName(name) {
  return name
    .replace(/\(.*?\)/g, "")     // remove brackets like (Ex-Mushtaq 1)
    .replace(/RMU/gi, "")        // remove RMU text
    .replace(/\s+/g, " ")        // normalize spaces
    .trim();
}

/**
 * Query Nominatim API
 */
async function geocodeNominatim(areaName) {
  const query = cleanAreaName(areaName) + ", Karachi, Pakistan";
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "loadshedding-tracker/1.0 (your_email@example.com)"
    }
  });

  if (!res.ok) {
    console.error("❌ Nominatim error:", res.status, res.statusText);
    return null;
  }

  const data = await res.json();
  if (data && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display: data[0].display_name
    };
  }
  return null;
}

(async function main() {
  try {
    await connectMongoose();
    console.log(`✅ Connected to MongoDB: ${mongoose.connection.db.databaseName}`);

    const zeroAreas = await Area.find({
      $or: [
        { "location.coordinates": [0, 0] },
        { location: { $exists: false } }
      ]
    }).limit(argv.limit);

    console.log(`Found ${zeroAreas.length} areas with missing coords`);

    let fixed = 0, skipped = 0;
    for (const area of zeroAreas) {
      console.log("🔎 Checking:", area.name);

      const geo = await geocodeNominatim(area.name);
      if (geo) {
        console.log(`   🌍 Got: ${geo.lat}, ${geo.lon} | ${geo.display}`);
        if (argv.commit) {
          area.location = { type: "Point", coordinates: [geo.lon, geo.lat] };
          area.needsGeocode = false;
          await area.save();
          console.log("   ✅ Updated in DB");
        }
        fixed++;
      } else {
        console.log("   ⚠️ No result from Nominatim");
        skipped++;
      }
    }

    console.log("\n=== Summary ===");
    console.log("Fixed:", fixed);
    console.log("Skipped:", skipped);
    console.log("Commit mode:", argv.commit);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Fatal:", err);
    process.exit(1);
  }
})();
