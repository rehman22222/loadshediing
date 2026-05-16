#!/usr/bin/env node
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const minimist = require("minimist");
const mongoose = require("mongoose");
const pdfParse = require("pdf-parse");
const bcrypt = require("bcryptjs");
const { DateTime } = require("luxon");

const Area = require("../models/Area");
const Outage = require("../models/Outage");
const User = require("../models/User");
const { forwardGeocode } = require("../services/geocode");
const { normalizeName } = require("../utils/geo");
const { connectMongoose, getMongoUri } = require("../utils/dbConnection");

const SCHEDULE_TIMEZONE = process.env.SCHEDULE_TIMEZONE || "Asia/Karachi";

const argv = minimist(process.argv.slice(2), {
  string: ["file", "date"],
  boolean: ["commit", "replace", "summary"],
  default: {
    file: path.join(__dirname, "..", "LSmar2.pdf"),
    commit: false,
    replace: false,
    summary: false,
  },
});

const LOCATION_SUFFIXES = [
  "AIRPORT",
  "AIRPORT 2",
  "AZIZABAD",
  "BALDIA",
  "BALOCH COLONY",
  "CIVIC CENTER",
  "CIVIL AVIATION",
  "CLIFTON",
  "DHABEJI",
  "ELENDER RD",
  "FEDERAL A",
  "FEDERAL B",
  "GADAP",
  "GARDEN EAST",
  "GHARO",
  "GIZRI",
  "GULISTAN E JOHAR",
  "GULSHAN",
  "GULSHAN-E-MAYMAR",
  "HAROONABAD",
  "HOSPITAL",
  "HUB CHOWKI",
  "JACOBLINE",
  "JAIL ROAD",
  "KDA",
  "KEPZ",
  "KORANGI EAST",
  "KORANGI SOUTH",
  "KORANGI TOWN",
  "LABOUR SQUARE",
  "LANDHI",
  "LIAQUATABAD",
  "LYARI",
  "MEHMOODABAD",
  "MEMON GOTH",
  "NORTH KARACHI",
  "NORTH NAZIMABAD",
  "OLD GOLIMAR",
  "OLD TOWN",
  "ORANGI TOWN",
  "P R L",
  "PORT QASIM",
  "QAYYUMABAD",
  "QUEENS ROAD",
  "R E C P",
  "SHADMAN",
  "SITE",
  "SURJANI TOWN",
  "VALIKA",
  "WEST WHARF",
];

function normalizeForCompare(value) {
  return normalizeName(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function countMatches(value, pattern) {
  return (value.match(pattern) || []).length;
}

function hasBalancedParentheses(value) {
  return countMatches(value, /\(/g) === countMatches(value, /\)/g);
}

function repairParentheses(value) {
  let updated = value;

  updated = updated.replace(/\s+\((Ex[-\s])/gi, (match, token, offset, source) => {
    const before = source.slice(0, offset);
    const openCount = countMatches(before, /\(/g);
    const closeCount = countMatches(before, /\)/g);
    return openCount > closeCount ? `) (${token}` : match;
  });

  updated = updated.replace(/\)\s*(?=[A-Za-z])/g, ") ");
  updated = updated.replace(/\s+\(/g, " (");
  updated = updated.replace(/\s+/g, " ").trim();
  return updated;
}

function nameQualityScore(value) {
  let score = 0;
  if (hasBalancedParentheses(value)) score += 4;
  score -= countMatches(value, /[A-Za-z]\(/g) * 2;
  score -= countMatches(value, /\)[A-Za-z]/g) * 2;
  score -= countMatches(value, /[a-z][A-Z]/g);
  score += Math.min(value.length / 100, 2);
  return score;
}

function hhmmToDate(dateISO, hhmm) {
  const raw = hhmm.padStart(4, "0");
  const hour = Number.parseInt(raw.slice(0, 2), 10);
  const minute = Number.parseInt(raw.slice(2, 4), 10);
  return DateTime.fromISO(dateISO, { zone: SCHEDULE_TIMEZONE })
    .set({ hour, minute, second: 0, millisecond: 0 })
    .toUTC()
    .toJSDate();
}

function buildImportHash(areaId, startTime, endTime, sourceDate) {
  return crypto
    .createHash("md5")
    .update(`${areaId}|${startTime.toISOString()}|${endTime.toISOString()}|${sourceDate}`)
    .digest("hex");
}

function extractScheduleDate(rawText) {
  const match = rawText.match(/applicable from (\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),\s*(\d{4})/i);
  if (!match) return null;

  const months = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };

  const day = match[1].padStart(2, "0");
  const month = months[match[2].toLowerCase()];
  const year = match[3];
  return month ? `${year}-${month}-${day}` : null;
}

function mergeContinuationLines(rawText) {
  const rawLines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00A0/g, " ").trim())
    .filter(Boolean);

  const merged = [];
  const slotStartRx = /^\s*\d{3,4}~\d{3,4}/;

  for (const line of rawLines) {
    if (/feeder name|grid|1st cycle|2nd cycle|3rd cycle|4th cycle|how to locate|load-shed schedule/i.test(line)) {
      continue;
    }
    if (/download our app|call on 118|periodic review|time of the schedule/i.test(line)) {
      continue;
    }

    if (slotStartRx.test(line)) {
      if (merged.length === 0) {
        merged.push(line);
      } else {
        merged[merged.length - 1] = `${merged[merged.length - 1]} ${line}`.replace(/\s+/g, " ").trim();
      }
    } else {
      merged.push(line);
    }
  }

  return merged;
}

function fixAreaText(areaRaw) {
  let area = areaRaw;
  area = area.replace(/\+/g, " ");
  area = area.replace(/\s+/g, " ").trim();

  for (const suffix of LOCATION_SUFFIXES.sort((a, b) => b.length - a.length)) {
    const compactSuffix = suffix.replace(/\s+/g, "");
    const escapedCompact = compactSuffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    area = area.replace(new RegExp(`([^\\s])(${escapedCompact})(\\b|$)`, "gi"), `$1 ${suffix}`);

    const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    area = area.replace(new RegExp(`([^\\s])(${escapedSuffix})(\\b|$)`, "gi"), `$1 ${suffix}`);
  }

  area = repairParentheses(area);
  area = area.replace(/\s+/g, " ").trim();
  return normalizeName(area);
}

function parsePdfEntries(mergedLines) {
  const entries = [];
  const slotRx = /(\d{3,4}~\d{3,4})/g;

  for (const rawLine of mergedLines) {
    const matches = [...rawLine.matchAll(slotRx)];
    if (matches.length === 0) continue;

    const firstIdx = matches[0].index;
    let areaRaw = rawLine.slice(0, firstIdx).trim();

    areaRaw = areaRaw.replace(/([0-9\/])([A-Za-z])/g, "$1 $2");
    areaRaw = areaRaw.replace(/([a-z])([A-Z])/g, "$1 $2");
    areaRaw = areaRaw.replace(/([\)\]])([A-Za-z])/g, "$1 $2");
    areaRaw = areaRaw.replace(/([A-Z]{2,})([A-Z][a-z]+)/g, "$1 $2");
    areaRaw = areaRaw.replace(/\s+/g, " ").trim();

    const areaName = fixAreaText(areaRaw);
    if (!areaName) continue;

    for (const match of matches) {
      const [start, end] = match[1].split("~");
      entries.push({
        area: areaName,
        start: start.padStart(4, "0"),
        end: end.padStart(4, "0"),
      });
    }
  }

  return entries;
}

async function ensureSystemUser() {
  const email = process.env.SYSTEM_USER_EMAIL || "system@loadshedding.local";
  let user = await User.findOne({ email });
  if (user) return user;

  const password = await bcrypt.hash("change-me-not-used", 10);
  user = await User.create({
    username: "system-loader",
    email,
    password,
    role: "premium",
  });

  return user;
}

async function buildCanonicalAreaMap() {
  const areas = await Area.find().lean();
  const outageCounts = await Outage.aggregate([{ $group: { _id: "$areaId", count: { $sum: 1 } } }]);
  const countMap = new Map(outageCounts.map((item) => [String(item._id), item.count]));
  const canonicalMap = new Map();

  for (const area of areas) {
    const key = `${area.city || "Karachi"}:${normalizeForCompare(area.name)}`;
    const candidate = {
      ...area,
      outageCount: countMap.get(String(area._id)) || 0,
    };
    const current = canonicalMap.get(key);

    if (
      !current ||
      candidate.outageCount > current.outageCount ||
      (candidate.outageCount === current.outageCount && candidate.name.length < current.name.length)
    ) {
      canonicalMap.set(key, candidate);
    }
  }

  return canonicalMap;
}

async function syncCanonicalAreaName(existingArea, incomingName, canonicalMap) {
  const normalizedIncoming = normalizeName(incomingName);
  const compareKey = `Karachi:${normalizeForCompare(normalizedIncoming)}`;

  if (!normalizedIncoming || existingArea.name === normalizedIncoming) {
    return existingArea;
  }

  if (normalizeForCompare(existingArea.name) !== normalizeForCompare(normalizedIncoming)) {
    return existingArea;
  }

  if (nameQualityScore(normalizedIncoming) <= nameQualityScore(existingArea.name)) {
    return existingArea;
  }

  const updatedArea = await Area.findByIdAndUpdate(
    existingArea._id,
    {
      $set: {
        name: normalizedIncoming,
        normalizedName: normalizedIncoming.toLowerCase(),
      },
    },
    { new: true }
  ).lean();

  if (!updatedArea) {
    return existingArea;
  }

  await Outage.updateMany(
    { areaId: existingArea._id },
    {
      $set: {
        area: updatedArea.name,
        city: updatedArea.city || "Karachi",
      },
    }
  );

  const canonical = {
    ...updatedArea,
    outageCount: existingArea.outageCount || 0,
  };
  canonicalMap.set(compareKey, canonical);
  return canonical;
}

async function ensureCanonicalArea(areaName, canonicalMap) {
  const compareKey = `Karachi:${normalizeForCompare(areaName)}`;
  const existing = canonicalMap.get(compareKey);
  if (existing) {
    return syncCanonicalAreaName(existing, areaName, canonicalMap);
  }

  let geo = null;
  try {
    geo = await forwardGeocode(`${areaName}, Karachi`);
  } catch (error) {
    console.warn(`Geocode failed for "${areaName}": ${error.message}`);
  }

  const area = await Area.create({
    name: areaName,
    city: "Karachi",
    location: {
      type: "Point",
      coordinates: geo ? [geo.lon, geo.lat] : [0, 0],
    },
    locationIqPlaceId: geo?.placeId || null,
  });

  const canonical = area.toObject();
  canonical.outageCount = 0;
  canonicalMap.set(compareKey, canonical);
  return canonical;
}

async function main() {
  if (!getMongoUri()) {
    throw new Error("MONGODB_URI or MONGO_URI is required in backend/.env");
  }

  const pdfPath = path.resolve(argv.file);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found: ${pdfPath}`);
  }

  const pdfData = await pdfParse(fs.readFileSync(pdfPath));
  const rawText = pdfData.text || "";
  const sourceDate = argv.date || extractScheduleDate(rawText);
  if (!sourceDate) {
    throw new Error("Could not detect schedule date from PDF. Pass --date YYYY-MM-DD.");
  }

  const mergedLines = mergeContinuationLines(rawText);
  const entries = parsePdfEntries(mergedLines);

  console.log(`PDF: ${pdfPath}`);
  console.log(`Schedule date: ${sourceDate}`);
  console.log(`Merged lines: ${mergedLines.length}`);
  console.log(`Parsed outage entries: ${entries.length}`);

  if (argv.summary) {
    const counts = entries.reduce((acc, entry) => {
      acc[entry.area] = (acc[entry.area] || 0) + 1;
      return acc;
    }, {});

    console.log("Top parsed areas:");
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .forEach(([area, count]) => console.log(`${count}x  ${area}`));
  }

  if (!argv.commit) {
    console.log("Dry run complete. Use --commit to write changes.");
    return;
  }

  await connectMongoose();
  console.log(`Connected to DB: ${mongoose.connection.db.databaseName}`);
  const systemUser = await ensureSystemUser();
  const canonicalMap = await buildCanonicalAreaMap();

  if (argv.replace) {
    const importedDelete = await Outage.deleteMany({ reportedBy: systemUser._id });
    console.log(`Deleted ${importedDelete.deletedCount} existing system-imported outages`);
  }

  const existingHashes = argv.replace
    ? new Set()
    : new Set((await Outage.distinct("importHash", { importDate: new Date(sourceDate) })).filter(Boolean));

  const docsToInsert = [];
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of entries) {
    try {
      const area = await ensureCanonicalArea(entry.area, canonicalMap);
      const startTime = hhmmToDate(sourceDate, entry.start);
      let endTime = hhmmToDate(sourceDate, entry.end);
      if (endTime <= startTime) {
        endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
      }

      const importHash = buildImportHash(area._id, startTime, endTime, sourceDate);
      if (existingHashes.has(importHash)) {
        skipped += 1;
        continue;
      }

      existingHashes.add(importHash);
      docsToInsert.push({
        area: area.name,
        areaId: area._id,
        city: area.city || "Karachi",
        location: area.location,
        locationIqPlaceId: area.locationIqPlaceId || null,
        startTime,
        endTime,
        status: "ongoing",
        reportedBy: systemUser._id,
        importDate: new Date(sourceDate),
        importHash,
      });
    } catch (error) {
      errors += 1;
      console.error(`Failed to import "${entry.area}" ${entry.start}~${entry.end}: ${error.message}`);
    }
  }

  const batchSize = 500;
  for (let index = 0; index < docsToInsert.length; index += batchSize) {
    const batch = docsToInsert.slice(index, index + batchSize);

    try {
      const created = await Outage.insertMany(batch, { ordered: false });
      inserted += created.length;
    } catch (error) {
      const insertedDocs = error.insertedDocs || [];
      const writeErrors = error.writeErrors || [];
      inserted += insertedDocs.length;
      errors += writeErrors.length || Math.max(batch.length - insertedDocs.length, 0);
      console.error(
        `Batch import warning (${index + 1}-${index + batch.length}): ${error.message}`
      );
    }
  }

  console.log(`Import finished: inserted=${inserted}, skipped=${skipped}, errors=${errors}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Import failed:", error.message);
  process.exit(1);
});
