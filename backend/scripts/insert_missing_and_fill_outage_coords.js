#!/usr/bin/env node
/**
 * Test Nominatim Geocoding for areas with [0,0] coords
 * Usage:
 *   node scripts/test_nominatim_fix.js --limit 5 --commit
 */

require("dotenv").config();
const mongoose = require("mongoose");
const minimist = require("minimist");
const fetch = require("node-fetch");
const Area = require("../models/Area");

const argv = minimist(process.argv.slice(2), {
  number: ["limit"],
  boolean: ["commit"],
  default: { limit: 5, commit: false }
});

/**
 * Clean + normalize area names before geocoding
 */
function cleanAreaName(name) {
  return name
    .replace(/\(.*?\)/g, " ")         // remove brackets and contents
    .replace(/RMU|KDA|Goth|Site|Ex-/gi, " ") // remove common noise
    .replace(/([a-z])([A-Z])/g, "$1 $2") // split CamelCase
    .replace(/([0-9])([A-Za-z])/g, "$1 $2") // split 123ABC
    .replace(/\s+/g, " ")             // normalize spaces
    .trim();
}

/**
 * Query Nominatim API
 */
async function geocodeNominatim(areaName) {
  const clean = cleanAreaName(areaName);
  const query = `${clean}, Karachi, Pakistan`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "loadshedding-tracker/1.0 (zubair@example.com)" // put real email here
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
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

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

      // Nominatim safe limit ~1 req/sec
      await new Promise(res => setTimeout(res, 1200));
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
