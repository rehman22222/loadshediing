#!/usr/bin/env node
/**
 * scripts/import_schedule_from_pdf.js
 * Usage (dry-run summary):
 *   node scripts/import_schedule_from_pdf.js --file "C:/.../Load-Shed-Schedule-26-June-2025.pdf" --date 2025-06-26 --summary
 * Commit:
 *   node scripts/import_schedule_from_pdf.js --file "C:/.../Load-Shed-Schedule-26-June-2025.pdf" --date 2025-06-26 --commit
 * Commit + replace:
 *   node scripts/import_schedule_from_pdf.js --file "C:/.../Load-Shed-Schedule-26-June-2025.pdf" --date 2025-06-26 --commit --replace
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const minimist = require("minimist");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Outage = require("../models/Outage");
const Area = require("../models/Area");
const User = require("../models/User");
const { forwardGeocode } = require("../services/geocode");
const { connectMongoose } = require("../utils/dbConnection");

const argv = minimist(process.argv.slice(2), {
  string: ["file", "date"],
  boolean: ["commit", "replace", "summary"],
  default: { commit: false, replace: false, summary: false }
});

if (!argv.file) { console.error("❌ --file is required"); process.exit(1); }
if (!argv.date) { console.error("❌ --date YYYY-MM-DD is required"); process.exit(1); }

const PDF_PATH = path.resolve(argv.file);
const DATE_ISO = argv.date; // e.g. "2025-06-26"
const DO_COMMIT = !!argv.commit;
const DO_REPLACE = !!argv.replace;
const DO_SUMMARY = !!argv.summary;

console.log(`File: ${PDF_PATH} | Date: ${DATE_ISO} | commit: ${DO_COMMIT} | replace: ${DO_REPLACE} | summary: ${DO_SUMMARY}`);

// --- helpers ---
function hhmmToISO(hhmm, dateISO) {
  const t = hhmm.padStart(4, "0");
  const hh = t.slice(0,2), mm = t.slice(2,4);
  return `${dateISO}T${hh}:${mm}:00.000Z`;
}
function buildImportHash(areaId, startISO, endISO, dateISO) {
  const raw = `${areaId}|${startISO}|${endISO}|${dateISO}`;
  return crypto.createHash("md5").update(raw).digest("hex");
}
function normalizeAreaName(s) {
  if (!s) return s;
  return s.replace(/\s+/g, " ").trim();
}

// ensure system user (used as reportedBy)
async function ensureSystemUser() {
  const email = process.env.SYSTEM_USER_EMAIL || "system@loadshedding.local";
  let u = await User.findOne({ email });
  if (!u) {
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash("change-me-not-used", salt);
    u = await User.create({ username: "system-loader", email, password: hashed, role: "premium" });
    console.log("Created system user:", email);
  }
  return u;
}

// ensure area exists; if geocode fails create area with coords [0,0]
async function ensureArea(areaName) {
  const normalized = (areaName || "").trim().toLowerCase();
  let area = await Area.findOne({ normalizedName: normalized });
  if (area) return area;

  let geo = null;
  try {
    geo = await forwardGeocode(`${areaName}, Karachi`);
  } catch (err) {
    console.warn("LocationIQ geocode failed for area:", areaName, err.message || err.toString());
  }

  const coords = geo ? [parseFloat(geo.lon), parseFloat(geo.lat)] : [0,0];
  area = new Area({
    name: areaName,
    normalizedName: normalized,
    city: "Karachi",
    location: { type: "Point", coordinates: coords },
    locationIqPlaceId: geo?.placeId || null
  });

  await area.save();
  console.log("➕ Created area:", area.name, "| coords:", coords);
  return area;
}

/**
 * Merge continuation lines
 * If a line starts with a timeslot (e.g. "0935~1205...") then it's appended to the previous non-empty line.
 * Returns an array of merged lines (areaName + timeslots)
 */
function mergeContinuationLines(rawText) {
  const rawLines = rawText.split(/\r?\n/).map(l => l.replace(/\u00A0/g, " ").trim()).filter(Boolean);
  const merged = [];
  const slotStartRx = /^\s*\d{3,4}~\d{3,4}/; // line starting with timeslot like 0935~1105

  for (const line of rawLines) {
    // skip known header/footer lines
    if (/feeder name|grid|1st cycle|how to locate|page \d+/i.test(line)) continue;

    if (slotStartRx.test(line)) {
      // continuation line -> append to previous merged entry
      if (merged.length === 0) {
        // no previous line: push raw as-is (will become Unknown Area)
        merged.push(line);
      } else {
        merged[merged.length - 1] = (merged[merged.length - 1] + " " + line).replace(/\s+/g, " ").trim();
      }
    } else {
      // normal line beginning with area or feeder
      merged.push(line);
    }
  }
  return merged;
}

// parse merged lines into { area, start, end } entries
function parseMergedLinesToEntries(mergedLines) {
  const entries = [];
  const slotRx = /(\d{3,4}~\d{3,4})/g;

  for (const rawLine of mergedLines) {
    const matches = [...rawLine.matchAll(slotRx)];
    if (!matches || matches.length === 0) continue;

    const firstIdx = matches[0].index;
    let areaRaw = rawLine.slice(0, firstIdx).trim();

    // tidy common glue issues like "33/EKorangi" -> "33/E Korangi"
    areaRaw = areaRaw.replace(/([0-9\/])([A-Za-z])/g, "$1 $2");
    areaRaw = areaRaw.replace(/([a-z])([A-Z])/g, "$1 $2");
    areaRaw = areaRaw.replace(/([\)\]\:])([A-Za-z])/g, "$1 $2"); // ')Korangi' -> ') Korangi'
    areaRaw = areaRaw.replace(/([A-Z]{2,})([A-Z][a-z]+)/g, "$1 $2"); // 'RMULandhi' -> 'RMU Landhi'
    areaRaw = areaRaw.replace(/\s+/g, " ").trim();

    const areaName = normalizeAreaName(areaRaw) || "Unknown Area";

    for (const m of matches) {
      const slot = m[1]; // e.g. "0935~1105"
      const [s, e] = slot.split("~");
      if (!s || !e) continue;
      entries.push({ area: areaName, start: s.padStart(4,'0'), end: e.padStart(4,'0') });
    }
  }

  return entries;
}

// --- main ---
(async function main(){
  try {
    if (!fs.existsSync(PDF_PATH)) {
      console.error("❌ PDF not found at:", PDF_PATH);
      process.exit(1);
    }

    await connectMongoose();
    console.log(`✅ Connected to MongoDB: ${mongoose.connection.db.databaseName}`);

    const systemUser = await ensureSystemUser();

    const buffer = fs.readFileSync(PDF_PATH);
    const pdfData = await pdfParse(buffer);
    const rawText = pdfData.text || "";

    // first, merge continuation lines so time-only lines attach to previous area
    const mergedLines = mergeContinuationLines(rawText);

    // then parse merged lines to entries
    const entries = parseMergedLinesToEntries(mergedLines);
    console.log(`📑 Parsed ${entries.length} outage entries from PDF`);

    if (DO_SUMMARY) {
      const counts = entries.reduce((acc,e) => { acc[e.area] = (acc[e.area]||0)+1; return acc; }, {});
      console.log("=== Summary per area (top 50) ===");
      Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,50).forEach(([area,c]) => console.log(area, ":", c));
      console.log("==================================");
    }

    if (!DO_COMMIT) {
      console.log("🔍 Dry run complete. Use --commit to save.");
      await mongoose.disconnect();
      process.exit(0);
    }

    if (DO_REPLACE) {
      const start = new Date(`${DATE_ISO}T00:00:00.000Z`);
      const end = new Date(`${DATE_ISO}T23:59:59.999Z`);
      const del = await Outage.deleteMany({ importDate: { $gte: start, $lte: end } });
      console.log(`♻️ Deleted ${del.deletedCount} previously imported outages for ${DATE_ISO}`);
    }

    let inserted = 0, skipped = 0, errors = 0;
    for (const e of entries) {
      try {
        const area = await ensureArea(e.area);

        const startISO = hhmmToISO(e.start, DATE_ISO);
        let endISO = hhmmToISO(e.end, DATE_ISO);

        if (new Date(endISO) <= new Date(startISO)) {
          const tmp = new Date(endISO);
          tmp.setUTCDate(tmp.getUTCDate() + 1);
          endISO = tmp.toISOString();
        }

        const importHash = buildImportHash(String(area._id), startISO, endISO, DATE_ISO);

        const exists = await Outage.findOne({ importHash }).lean();
        if (exists) { skipped++; continue; }

        const doc = {
          area: area.name,
          areaId: area._id,
          city: area.city || "Karachi",
          location: area.location,
          locationIqPlaceId: area.locationIqPlaceId || null,
          startTime: new Date(startISO),
          endTime: new Date(endISO),
          reportedBy: systemUser ? systemUser._id : null,
          importDate: new Date(DATE_ISO),
          importHash
        };

        await Outage.create(doc);
        inserted++;
      } catch (err) {
        errors++;
        console.error("Import error:", e, err.message || err.toString());
      }
    }

    console.log(`✅ Done: inserted=${inserted}, skipped=${skipped}, errors=${errors}`);
    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
})();

// small helper used above
function hhmmToISO(hhmm, dateISO) {
  const t = hhmm.padStart(4,'0');
  const hh = t.slice(0,2), mm = t.slice(2,4);
  return `${dateISO}T${hh}:${mm}:00.000Z`;
}
