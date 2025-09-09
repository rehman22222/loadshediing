#!/usr/bin/env node
require("dotenv").config();
const mongoose = require("mongoose");
const minimist = require("minimist");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const Area = require("../models/Area");
const Outage = require("../models/Outage");

// ----------------- CLI args -----------------
const argv = minimist(process.argv.slice(2), {
  boolean: ["commit", "quiet"],
  default: { limit: 50, commit: false, quiet: false }
});
const LIMIT = argv.limit;
const DO_COMMIT = argv.commit;
const QUIET = argv.quiet;

// ----------------- Constants -----------------
const USER_AGENT = "loadshedding-tracker/1.0 (abrehmanrana96@gmail.com)";
const KARACHI_BBOX = { minLon: 66.65, maxLon: 67.45, minLat: 24.60, maxLat: 25.15 };

// ----------------- Helpers -----------------
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function looksInKarachi(lat, lon) {
  if (lat == null || lon == null) return false;
  const la = Number(lat), lo = Number(lon);
  return lo >= KARACHI_BBOX.minLon && lo <= KARACHI_BBOX.maxLon && la >= KARACHI_BBOX.minLat && la <= KARACHI_BBOX.maxLat;
}
function normalizeForGeocode(name) {
  if (!name) return "";
  return name
    .replace(/\(.*?\)/g, " ")
    .replace(/\bEx-?\b/gi, " ")
    .replace(/\b(RMU|KDA|Goth|Site|Block|Circle|Market)\b/gi, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([0-9])([A-Za-z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9,\s\-]/g, " ")
    .replace(/\s+/g, " ").trim();
}

// ----------- Geocoding Functions -----------
async function nominatimSearch(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, data };
  } catch { return { ok: false }; }
}

async function locationIQSearch(q) {
  const key = process.env.LOCATIONIQ_KEY;
  if (!key) return { ok: false };
  const url = `https://us1.locationiq.com/v1/search.php?key=${key}&q=${encodeURIComponent(q)}&format=json&limit=3`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, data };
  } catch { return { ok: false }; }
}

async function geocodeArea(name) {
  const cleaned = normalizeForGeocode(name);
  if (!cleaned) return null;
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const variants = [
    `${cleaned}, Karachi, Pakistan`,
    `${tokens.slice(0,2).join(" ")}, Karachi, Pakistan`,
    `${tokens.slice(-1).join(" ")}, Karachi, Pakistan`,
    cleaned
  ].filter(Boolean);

  for (const q of variants) {
    const nom = await nominatimSearch(q);
    if (nom.ok && Array.isArray(nom.data) && nom.data.length > 0) {
      for (const r of nom.data) {
        const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
        if (looksInKarachi(lat, lon)) return { lat, lon, provider: "nominatim" };
      }
    }
    await sleep(400);
  }

  if (process.env.LOCATIONIQ_KEY) {
    const li = await locationIQSearch(`${cleaned}, Karachi, Pakistan`);
    if (li.ok && Array.isArray(li.data) && li.data.length > 0) {
      for (const r of li.data) {
        const lat = parseFloat(r.lat || r.latitude), lon = parseFloat(r.lon || r.longitude);
        if (looksInKarachi(lat, lon)) return { lat, lon, provider: "locationiq" };
      }
    }
  }

  return null;
}

// ----------- Main Script -----------
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "loadsheddingDB" });
    if (!QUIET) console.log("✅ Connected to MongoDB");

    // --- 1. Fix Area coords ---
    const areas = await Area.find({
      $or: [
        { location: { $exists: false } },
        { "location.coordinates": [0,0] },
        { needsGeocode: true }
      ]
    }).limit(LIMIT);

    const skippedAreas = [];
    let fixedAreas = 0;

    for (const area of areas) {
      const geo = await geocodeArea(area.name || area.normalizedName || "");
      if (!geo) {
        skippedAreas.push({ _id: area._id, name: area.name });
        continue;
      }

      if (DO_COMMIT) {
        area.location = { type: "Point", coordinates: [geo.lon, geo.lat] };
        area.needsGeocode = false;
        await area.save();
        fixedAreas++;
      }
      if (!QUIET) console.log(`✅ Area fixed: ${area.name} -> ${geo.lat}, ${geo.lon}`);
      await sleep(geo.provider === "nominatim" ? 1200 : 300);
    }

    // --- 2. Propagate coords to outages ---
    const areasWithCoords = await Area.find({ "location.coordinates": { $exists: true } }).select("_id location").lean();
    let propagated = 0;

    for (const a of areasWithCoords) {
      const res = await Outage.updateMany(
        { areaId: a._id, $or: [ { location: { $exists: false } }, { "location.coordinates": [0,0] } ] },
        { $set: { location: a.location } }
      );
      propagated += res.modifiedCount || 0;
    }

    // --- 3. Insert missing outages from PDF ---
    const pdfOutages = JSON.parse(fs.readFileSync(path.join(__dirname,"../data/outages_from_pdf.json"),"utf8"));
    const existingOutages = await Outage.find({}).select("areaId startTime endTime").lean();
    const existingKeys = new Set(existingOutages.map(o => `${o.areaId}_${o.startTime}_${o.endTime}`));

    const missingOutages = pdfOutages.filter(o => !existingKeys.has(`${o.areaId}_${o.startTime}_${o.endTime}`));
    if (DO_COMMIT) {
      await Outage.insertMany(missingOutages);
    }

    if (!QUIET) console.log("\n=== Summary ===");
    console.log("Areas fixed:", fixedAreas);
    console.log("Skipped areas:", skippedAreas.length);
    console.log("Outages coords propagated:", propagated);
    console.log("Missing outages to insert:", missingOutages.length);

    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();