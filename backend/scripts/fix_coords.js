// scripts/fix_coords.js
require("dotenv").config();
const { MongoClient } = require("mongodb");
const fetch = require("node-fetch");
const readline = require("readline");
const { getMongoDatabaseName } = require("../utils/dbConnection");

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const client = new MongoClient(uri);

const CITY = "Karachi";
const COUNTRY = "Pakistan";
const LOCATIONIQ_KEY = process.env.LOCATIONIQ_KEY;
const NOMINATIM_EMAIL = process.env.NOMINATIM_EMAIL || "you@example.com";

// Karachi bounding box
const KARACHI_BBOX = { minLon: 66.65, minLat: 24.75, maxLon: 67.50, maxLat: 25.10 };
function insideKarachi(lat, lon) {
  return (
    lat >= KARACHI_BBOX.minLat &&
    lat <= KARACHI_BBOX.maxLat &&
    lon >= KARACHI_BBOX.minLon &&
    lon <= KARACHI_BBOX.maxLon
  );
}

// --- Clean area strings ---
function cleanArea(raw) {
  if (!raw) return "";
  let s = String(raw);

  // remove (Ex-...) or any parentheses
  s = s.replace(/\(.*?\)/g, " ");

  // remove Ex- and RMU-type tokens
  const stopwords = [
    "rmu",
    "rmukda",
    "rmukepz",
    "prl",
    "recp",
    "site",
    "ex",
    "ex-",
  ];
  const rx = new RegExp("\\b(" + stopwords.join("|") + ")\\b", "gi");
  s = s.replace(rx, " ");

  // split hyphens/slashes, collapse spaces
  s = s.replace(/[\/–—\-]+/g, " ").replace(/\s{2,}/g, " ").trim();

  return s;
}

function lastNWords(s, n) {
  const parts = s.split(/\s+/).filter(Boolean);
  return parts.slice(Math.max(0, parts.length - n)).join(" ");
}

// --- Geocode functions ---
async function geocodeLocationIQ(query) {
  const url = `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(
    query
  )}&format=json&limit=1&viewbox=${KARACHI_BBOX.minLon},${KARACHI_BBOX.minLat},${KARACHI_BBOX.maxLon},${KARACHI_BBOX.maxLat}&bounded=1&countrycodes=pk`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat),
        lon = parseFloat(data[0].lon);
      if (insideKarachi(lat, lon)) {
        return {
          lat,
          lon,
          source: "locationiq",
          placeId: String(data[0].place_id || ""),
        };
      }
    }
  } catch (err) {
    console.error("LocationIQ error:", err.message);
  }
  return null;
}

async function geocodeNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(
    query
  )}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": `loadshedding-tracker/1.0 (${NOMINATIM_EMAIL})` },
    });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat),
        lon = parseFloat(data[0].lon);
      if (insideKarachi(lat, lon)) {
        return {
          lat,
          lon,
          source: "nominatim",
          placeId: `nominatim:${data[0].place_id}`,
        };
      }
    }
  } catch (err) {
    console.error("Nominatim error:", err.message);
  }
  return null;
}

async function geocode(area) {
  const cleaned = cleanArea(area);
  if (!cleaned) return null;

  // build candidate queries
  const candidates = [
    `${cleaned}, ${CITY}, ${COUNTRY}`,
    `${cleaned}, ${CITY}`,
  ];

  // last 3 / 2 / 1 words
  [3, 2, 1].forEach((n) => {
    const last = lastNWords(cleaned, n);
    if (last && last !== cleaned) {
      candidates.push(`${last}, ${CITY}, ${COUNTRY}`, `${last}, ${CITY}`);
    }
  });

  // dedupe
  const uniq = Array.from(new Set(candidates));

  // Try LocationIQ
  for (const q of uniq) {
    const res = await geocodeLocationIQ(q);
    if (res) return res;
    await new Promise((r) => setTimeout(r, 200)); // avoid throttle
  }

  // Try Nominatim
  for (const q of uniq) {
    await new Promise((r) => setTimeout(r, 1100)); // polite delay
    const res = await geocodeNominatim(q);
    if (res) return res;
  }

  return null;
}

async function main() {
  await client.connect();
  const db = client.db(getMongoDatabaseName(uri));
  const outages = db.collection("outages");

  // Find outages with null or [0,0]
  const missing = await outages
    .find({
      $or: [
        { "location.coordinates": null },
        { "location.coordinates": [0, 0] },
      ],
    })
    .toArray();

  console.log(`Found ${missing.length} outages with missing coords\n`);

  let prepared = [];
  for (let doc of missing) {
    const geo = await geocode(doc.area);
    if (geo) {
      prepared.push({
        _id: doc._id,
        area: doc.area,
        lat: geo.lat,
        lon: geo.lon,
        source: geo.source,
        placeId: geo.placeId,
      });
      console.log(
        `Prepared: "${doc.area}" -> ${geo.lat},${geo.lon} via ${geo.source}`
      );
    } else {
      console.log(`Prepared: "${doc.area}" -> NOT FOUND`);
    }
  }

  console.log(
    `\n=== PREVIEW: First 10 updates ===\n${prepared
      .slice(0, 10)
      .map(
        (p, i) =>
          `${i + 1}. area: ${p.area}\n   coords: ${p.lon},${p.lat} (via ${p.source})`
      )
      .join("\n")}`
  );
  console.log(`\nTotal to update: ${prepared.length}`);

  // ask for commit
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    'Type "commit" to update these into DB (or anything else to abort): ',
    async (answer) => {
      if (answer.trim().toLowerCase() === "commit") {
        let bulk = prepared.map((p) => ({
          updateOne: {
            filter: { _id: p._id },
            update: {
              $set: {
                "location.type": "Point",
                "location.coordinates": [p.lon, p.lat],
                locationIqPlaceId: p.placeId,
                updatedAt: new Date(),
              },
            },
          },
        }));
        if (bulk.length > 0) {
          let result = await outages.bulkWrite(bulk);
          console.log("Updated via driver. Matched:", result.matchedCount);
        }
      } else {
        console.log("Aborted — no changes written.");
      }
      rl.close();
      await client.close();
    }
  );
}

main().catch((err) => console.error(err));
