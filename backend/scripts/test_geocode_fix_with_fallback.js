#!/usr/bin/env node
/**
 * geocode_fix_full_retry.js
 *
 * - Finds Areas with missing coords ([0,0] or no location or needsGeocode:true).
 * - Tries multiple cleaned query variants against Nominatim (polite 1.2s delay).
 * - Validates results are inside Karachi bbox.
 * - If Nominatim fails, falls back to LocationIQ (if LOCATIONIQ_KEY is set in .env).
 * - If --commit updates Area.location and needsGeocode=false.
 * - Optional: --propagate will update Outage documents (areaId match) that still have missing coords.
 * - Outputs log file `logs/geocode_skipped_<timestamp>.json` for manual fixes.
 *
 * Usage (dry-run):
 *   node scripts/geocode_fix_full_retry.js --limit 50
 *
 * Commit run:
 *   node scripts/geocode_fix_full_retry.js --limit 200 --commit
 *
 * Commit + propagate outages update:
 *   node scripts/geocode_fix_full_retry.js --limit 200 --commit --propagate
 *
 * Required .env:
 *   MONGO_URI="mongodb+srv://..."
 * Optional .env:
 *   LOCATIONIQ_KEY="your_locationiq_key"
 *
 * IMPORTANT: Replace "your_email@example.com" in USER_AGENT below with a real contact per Nominatim policy.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const minimist = require("minimist");
const fetch = require("node-fetch"); // v2, installed above
const fs = require("fs");
const path = require("path");
const USER_AGENT = "loadshedding-tracker/1.0 (abrehmanrana96@gmail.com)";


const Area = require("../models/Area");
const Outage = require("../models/Outage");

const argv = minimist(process.argv.slice(2), {
  number: ["limit"],
  boolean: ["commit", "propagate", "quiet"],
  default: { limit: 50, commit: false, propagate: false, quiet: false }
});

const LIMIT = argv.limit || 50;
const DO_COMMIT = !!argv.commit;
const DO_PROPAGATE = !!argv.propagate; // <-- replace with your email

// Karachi bounding box (slightly padded)
const KARACHI_BBOX = { minLon: 66.65, maxLon: 67.45, minLat: 24.60, maxLat: 25.15 };

function looksInKarachi(lat, lon) {
  if (lat == null || lon == null) return false;
  const la = Number(lat), lo = Number(lon);
  return lo >= KARACHI_BBOX.minLon && lo <= KARACHI_BBOX.maxLon && la >= KARACHI_BBOX.minLat && la <= KARACHI_BBOX.maxLat;
}

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

// aggressive cleaning + normalization
function normalizeForGeocode(name) {
  if (!name) return "";
  return name
    .replace(/\(.*?\)/g, " ")               // remove parentheses content
    .replace(/\bEx-?\b/gi, " ")
    .replace(/\b(RMU|KDA|Goth|Site|Block|Circle|Market)\b/gi, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")    // camelCase -> split
    .replace(/([0-9])([A-Za-z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9,\s\-]/g, " ")     // remove stray punctuation
    .replace(/\s+/g, " ")
    .trim();
}

async function nominatimSearch(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    const data = await res.json();
    return { ok: true, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message || String(err) };
  }
}

async function locationIQSearch(q) {
  const key = process.env.LOCATIONIQ_KEY;
  if (!key) return { ok: false, status: 0, error: "No LOCATIONIQ_KEY" };
  const url = `https://us1.locationiq.com/v1/search.php?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&format=json&limit=3`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    const data = await res.json();
    return { ok: true, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message || String(err) };
  }
}

/**
 * Try multiple query variants using Nominatim, and fallback to LocationIQ if needed.
 * Returns { provider, lat, lon, display } or null.
 */
async function geocodeWithRetries(rawName) {
  const cleaned = normalizeForGeocode(rawName);
  if (!cleaned) return null;

  // variants: best-first preference
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const firstTwo = tokens.slice(0,2).join(" ");
  const lastToken = tokens.slice(-1).join(" ");
  const variants = [
    `${cleaned}, Karachi, Pakistan`,
    `${firstTwo ? firstTwo + ", Karachi, Pakistan" : ""}`,
    `${lastToken ? lastToken + ", Karachi, Pakistan" : ""}`,
    `${cleaned}, Pakistan`,
    `${cleaned}`
  ].filter(Boolean);

  // Try Nominatim variants
  for (const q of variants) {
    const nom = await nominatimSearch(q);
    // polite delay will be handled by caller (we also sleep inside loop below)
    if (nom.ok && Array.isArray(nom.data) && nom.data.length > 0) {
      // prefer first result inside Karachi bbox
      for (const r of nom.data) {
        const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
        if (looksInKarachi(lat, lon)) {
          return { provider: "nominatim", lat, lon, display: r.display_name };
        }
      }
      // no Karachi hits for this variant - try next
    } else {
      // Nominatim returned non-OK (403 etc.) -> propagate status to caller
      if (!nom.ok) {
        return { provider: "nominatim", ok: false, status: nom.status, error: nom.error || null };
      }
    }
    // small pause between variant calls to avoid being aggressive
    await sleep(400);
  }

  // Nominatim didn't find Karachi-located result; try LocationIQ fallback if key set
  if (!process.env.LOCATIONIQ_KEY) {
    return null;
  }

  // Try LocationIQ with a sensible query
  const liQ = `${cleaned}, Karachi, Pakistan`;
  const li = await locationIQSearch(liQ);
  if (li.ok && Array.isArray(li.data) && li.data.length > 0) {
    for (const r of li.data) {
      const lat = parseFloat(r.lat || r.latitude), lon = parseFloat(r.lon || r.longitude);
      if (looksInKarachi(lat, lon)) {
        return { provider: "locationiq", lat, lon, display: r.display_name || r.type || JSON.stringify(r) };
      }
    }
  }
  // nothing found
  return null;
}

// ------- Main -------
(async function main() {
  try {
    if (!process.env.MONGO_URI) {
      console.error("Missing MONGO_URI in .env");
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI, { dbName: "loadsheddingDB" });
    if (!argv.quiet) console.log("✅ Connected to MongoDB");

    const areas = await Area.find({
      $or: [
        { "location.coordinates": [0, 0] },
        { location: { $exists: false } },
        { needsGeocode: true }
      ]
    }).limit(LIMIT);

    if (!argv.quiet) console.log(`Found ${areas.length} areas to attempt (limit ${LIMIT})`);

    const skipped = [];
    let fixed = 0, triedLI = 0;

    for (const area of areas) {
      if (!argv.quiet) console.log("\n🔎 Checking:", area.name || area.normalizedName || "(unnamed)");

      const result = await geocodeWithRetries(area.name || area.normalizedName || "");
      // if result is an object with ok:false and status=403 from nominatim, we will fallback to LI in geocodeWithRetries already
      if (!result) {
        if (!argv.quiet) console.log("   ⚠️ No geocode result (Nominatim & LocationIQ tried/absent)");
        skipped.push({ name: area.name, _id: area._id });
        // polite delay
        await sleep(1200);
        continue;
      }

      // If result contains provider status only (nominatim error), try locationiq explicitly
      if (result.provider === "nominatim" && result.ok === false && result.status === 403) {
        if (!process.env.LOCATIONIQ_KEY) {
          if (!argv.quiet) console.log("   ❌ Nominatim 403 and no LOCATIONIQ_KEY available");
          skipped.push({ name: area.name, _id: area._id, reason: "nominatim_403_no_locationiq" });
          await sleep(1200);
          continue;
        }
        // else result would already have tried LI in geocodeWithRetries
      }

      // if found
      const lat = result.lat, lon = result.lon;
      if (lat == null || lon == null) {
        if (!argv.quiet) console.log("   ⚠️ Geocoder returned nothing useful for:", area.name);
        skipped.push({ name: area.name, _id: area._id });
        await sleep(1200);
        continue;
      }

      if (!argv.quiet) console.log(`   🌍 ${result.provider} -> ${lat}, ${lon} | ${result.display || ""}`);

      if (result.provider === "locationiq") triedLI++;

      if (DO_COMMIT) {
        area.location = { type: "Point", coordinates: [Number(lon), Number(lat)] };
        area.needsGeocode = false;
        // optional: store lastGeocodeProvider or place id etc.
        try {
          await area.save();
          if (!argv.quiet) console.log("   ✅ Saved to DB");
        } catch (saveErr) {
          console.error("   ❌ Failed to save Area:", saveErr.message || saveErr);
          skipped.push({ name: area.name, _id: area._id, reason: "save_error", error: saveErr.message });
          await sleep(1200);
          continue;
        }
      } else {
        if (!argv.quiet) console.log("   (dry-run) would set location:", [Number(lon), Number(lat)]);
      }

      fixed++;

      // polite delay: use Nominatim delay ~1.2s, if result came from LocationIQ shorter delay 300ms
      if (result.provider === "nominatim") {
        await sleep(1200);
      } else {
        await sleep(300);
      }
    }

    // Optional propagation: update outages that still have no location using area coords
    let propagated = 0;
    if (DO_PROPAGATE) {
      if (!argv.quiet) console.log("\n🔁 Propagating area coords to outages (where missing)...");
      const areasWithCoords = await Area.find({ "location.coordinates": { $exists: true } }).select("_id location").lean();
      for (const a of areasWithCoords) {
        const res = await Outage.updateMany(
          { areaId: a._id, $or: [ { location: { $exists: false } }, { "location.coordinates": [0,0] } ] },
          { $set: { location: a.location } }
        );
        if (res.modifiedCount && !argv.quiet) console.log(`   propagated ${res.modifiedCount} outages for area ${a._id}`);
        propagated += res.modifiedCount || 0;
      }
    }

    // write skipped to logs
    const logsDir = path.join(__dirname, "..", "logs");
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g,"-");
    const logPath = path.join(logsDir, `geocode_skipped_${ts}.json`);
    fs.writeFileSync(logPath, JSON.stringify({ date: new Date().toISOString(), skipped }, null, 2), "utf8");

    if (!argv.quiet) {
      console.log("\n=== Summary ===");
      console.log("Processed:", areas.length);
      console.log("Fixed:", fixed);
      console.log("Skipped:", skipped.length, `(log: ${logPath})`);
      console.log("LocationIQ tries:", triedLI);
      console.log("Propagated outages updated:", propagated);
      console.log("Commit mode:", DO_COMMIT);
    } else {
      // if quiet, still print essential
      console.log(JSON.stringify({ processed: areas.length, fixed, skipped: skipped.length, locationiq_tries: triedLI, propagated, commit: DO_COMMIT }));
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error("Fatal:", err);
    process.exit(1);
  }
})();
