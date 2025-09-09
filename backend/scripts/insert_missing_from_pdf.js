// insert_missing_from_pdf.js
// Usage: node scripts/insert_missing_from_pdf.js
// Interactive: shows preview, then type 'commit' to insert missing outages.
//
// Requires .env with MONGO_URI and LOCATIONIQ_API_KEY (you already have both).
// Optional: NOMINATIM_EMAIL for polite User-Agent (recommended).

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const { exec, execSync } = require('child_process');
const { MongoClient, ObjectId } = require('mongodb');
const prompt = require('prompt-sync')({ sigint: true });
const stringSim = require('string-similarity');
const crypto = require('crypto');

const MONGO_URI = process.env.MONGO_URI;
const LOCATIONIQ_KEY = process.env.LOCATIONIQ_API_KEY || process.env.LOCATIONIQ_KEY;
const NOMINATIM_EMAIL = process.env.NOMINATIM_EMAIL || process.env.SYSTEM_USER_EMAIL || 'you@example.com';
if (!MONGO_URI) { console.error('MONGO_URI missing in .env'); process.exit(1); }
if (!LOCATIONIQ_KEY) { console.error('LOCATIONIQ_API_KEY missing in .env'); process.exit(1); }

let PDF_PATH = process.env.PDF_PATH || 'file:///C:/Users/Zubair%20Computer/Downloads/Documents/Load-Shed-Schedule-26-June-2025.pdf';
if (PDF_PATH.startsWith('file://')) PDF_PATH = decodeURIComponent(PDF_PATH.replace(/^file:\/+/, ''));
PDF_PATH = PDF_PATH.replace(/\//g, path.sep);

const DB_NAME = process.env.DB_NAME || 'loadsheddingDB';
const COLLECTION = process.env.COLLECTION || 'outages';
const FUZZY_THRESHOLD = parseFloat(process.env.FUZZY_THRESHOLD || '0.78');
const CITY = process.env.CITY || 'Karachi';
const COUNTRY = process.env.COUNTRY || 'Pakistan';

// ---------- utils ----------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function normalizeName(s) {
  if (!s) return '';
  let t = String(s);
  t = t.replace(/(\d{2,4}~\d{2,4}(\s+\d{2,4}~\d{2,4})*)/g, ''); // remove times
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, '');
  t = t.replace(/[\u2010-\u2015]/g, ' ');
  t = t.replace(/[“”"']/g, '');
  t = t.replace(/[.,`®]/g, '');
  t = t.replace(/\//g, ' / ');
  t = t.replace(/\s+/g, ' ').trim().toLowerCase();
  return t;
}

// Fix common PDF-concatenation issues for geocoding queries
function cleanForGeocode(s) {
  if (!s) return s;
  let t = String(s);

  // Insert space between ...<letter><Uppercase>...
  t = t.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Separate "Block XArea" -> "Block X Area"
  t = t.replace(/\b(Block\s+[A-Z])([A-Za-z])/g, '$1 $2');

  // Remove RMU/feeder codes that confuse geocoders
  t = t.replace(/\bR\.?M\.?U\b/gi, ' ');
  t = t.replace(/\bRMU[A-Z]*\b/gi, ' ');
  t = t.replace(/\bRMK[A-Z]*\b/gi, ' ');
  t = t.replace(/\bP\s*R\s*L\b/gi, ' ');
  t = t.replace(/\bREC?P\b/gi, ' ');

  // Collapse multiple spaces
  t = t.replace(/\s{2,}/g, ' ').trim();

  return t;
}

function parseTimeToken(tok) {
  if (!tok) return null;
  tok = tok.trim();
  if (tok.length === 3) tok = '0' + tok;
  if (tok.length !== 4) return null;
  const h = parseInt(tok.slice(0, 2), 10);
  const m = parseInt(tok.slice(2), 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
}

function buildDateForSlot(startH, startM) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0, 0);
  if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

function importHashForArea(area) {
  return crypto.createHash('md5').update(area).digest('hex');
}

// ---------- PDF ----------
async function extractPdfAreasWithFirstSlot(pdfPath) {
  if (!fs.existsSync(pdfPath)) throw new Error('PDF not found: ' + pdfPath);
  const buffer = fs.readFileSync(pdfPath);
  const pdf = await pdfParse(buffer);
  const lines = pdf.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const candidate = lines.filter(l => l.includes('~')); // schedule lines

  const entries = [];
  for (const line of candidate) {
    const match = line.match(/(\d{2,4})~(\d{2,4})/);
    let firstStart = null, firstEnd = null;
    if (match) { firstStart = match[1]; firstEnd = match[2]; }
    let name = line.replace(/(\d{2,4}~\d{2,4}(\s+\d{2,4}~\d{2,4})*)/g, '').trim();
    name = name.replace(/\s{2,}/g, ' ').trim();
    if (name.length === 0) continue;
    entries.push({ raw: name, normalized: normalizeName(name), firstStart, firstEnd });
  }

  // unique by normalized
  const map = new Map();
  for (const e of entries) if (!map.has(e.normalized)) map.set(e.normalized, e);
  return Array.from(map.values());
}

// ---------- DB ----------
async function fetchDbAreas() {
  try {
    const client = new MongoClient(MONGO_URI, {
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
      maxPoolSize: 4
    });
    await client.connect();
    const col = client.db(DB_NAME).collection(COLLECTION);
    const cursor = col.find({ area: { $exists: true, $ne: null } }, { projection: { area: 1 } });
    const arr = [];
    await cursor.forEach(d => { if (d && d.area) arr.push({ raw: d.area, normalized: normalizeName(String(d.area)) }); });
    await client.close();
    return arr;
  } catch (err) {
    console.warn('Driver fetch failed (will fallback to mongosh):', err.message || err);
    return fetchDbAreasWithMongosh();
  }
}

function fetchDbAreasWithMongosh() {
  return new Promise((resolve, reject) => {
    const evalJS = "db.outages.find({area:{$exists:true,$ne:null}},{projection:{area:1}}).forEach(d=>print(JSON.stringify(d.area)))";
    const cmd = `mongosh "${MONGO_URI}" --quiet --eval "${evalJS.replace(/"/g, '\\"')}"`;
    exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (err, stdout, stderr) => {
      if (err) return reject(new Error('mongosh fallback failed: ' + err.message + '\n' + stderr));
      const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const arr = [];
      for (const L of lines) {
        let val = L;
        try { val = JSON.parse(L); } catch (_) {}
        arr.push({ raw: val, normalized: normalizeName(String(val)) });
      }
      resolve(arr);
    });
  });
}

// ---------- Geocoding with fallback ----------
async function geocodeLocationIQ(q) {
  const url = `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(q)}&format=json&limit=1`;
  try {
    const r = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': `loadshedding-tracker/1.0 (${NOMINATIM_EMAIL})` } });
    if (Array.isArray(r.data) && r.data.length > 0) {
      const pick = r.data[0];
      return {
        src: 'locationiq',
        lat: parseFloat(pick.lat),
        lon: parseFloat(pick.lon),
        place_id: String(pick.place_id || ''),
        display_name: pick.display_name || null
      };
    }
    return null;
  } catch (_) { return null; }
}

async function geocodeNominatim(q) {
  // respect Nominatim usage policy: identify & rate-limit
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}&addressdetails=0`;
  try {
    const r = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': `loadshedding-tracker/1.0 (${NOMINATIM_EMAIL})`
      }
    });
    if (Array.isArray(r.data) && r.data.length > 0) {
      const pick = r.data[0];
      return {
        src: 'nominatim',
        lat: parseFloat(pick.lat),
        lon: parseFloat(pick.lon),
        place_id: `nominatim:${pick.place_id}`,
        display_name: pick.display_name || null
      };
    }
    return null;
  } catch (_) { return null; }
}

async function geocodeArea(areaRaw) {
  const q = `${areaRaw}, Karachi, Pakistan`;

  // Karachi bounding box (approx): [66.65,24.75,67.50,25.10]
  const bbox = "66.65,24.75,67.50,25.10";

  // Try LocationIQ with bounding box
  const urlLiq = `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(q)}&format=json&limit=1&viewbox=${bbox}&bounded=1&countrycodes=pk`;
  
  try {
    const r = await axios.get(urlLiq, { timeout: 10000 });
    if (Array.isArray(r.data) && r.data.length > 0) {
      const pick = r.data[0];
      const lat = parseFloat(pick.lat);
      const lon = parseFloat(pick.lon);

      // Accept only Karachi-like coords
      if (lat >= 24 && lat <= 25 && lon >= 66 && lon <= 68) {
        return { lat, lon, place_id: pick.place_id || null, display_name: pick.display_name || null, via: 'locationiq' };
      }
    }
  } catch (_) { /* ignore */ }

  // Fallback → Nominatim
  const urlNom = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}&viewbox=${bbox}&bounded=1&countrycodes=pk`;
  try {
    const r2 = await axios.get(urlNom, { timeout: 10000, headers: { 'User-Agent': 'loadshedding-app' } });
    if (Array.isArray(r2.data) && r2.data.length > 0) {
      const pick = r2.data[0];
      const lat = parseFloat(pick.lat);
      const lon = parseFloat(pick.lon);
      if (lat >= 24 && lat <= 25 && lon >= 66 && lon <= 68) {
        return { lat, lon, place_id: pick.place_id || null, display_name: pick.display_name || null, via: 'nominatim' };
      }
    }
  } catch (_) { /* ignore */ }

  return null;
}

// ---------- Insert helpers ----------
async function tryInsertWithDriver(docs) {
  const client = new MongoClient(MONGO_URI, {
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true
  });
  await client.connect();
  try {
    const col = client.db(DB_NAME).collection(COLLECTION);
    const res = await col.insertMany(docs, { ordered: false });
    await client.close();
    return res;
  } catch (err) {
    try { await client.close(); } catch (_) {}
    throw err;
  }
}

function jsDateLiteral(d) {
  return `new Date(${d.getTime()})`;
}

function writeTempInsertFile(docs, tmpPath) {
  const jsLines = [];
  jsLines.push("// temp insert file generated by script");
  jsLines.push("function O(id){ return ObjectId(id); }");
  jsLines.push("const docs = [");
  for (const d of docs) {
    const location = d.location ? JSON.stringify(d.location) : 'null';
    const reportedBy = d.reportedBy ? `O("${d.reportedBy.toHexString()}")` : 'null';
    const docJs = `  {
    area: ${JSON.stringify(d.area)},
    areaId: O("${d.areaId.toHexString()}"),
    city: ${JSON.stringify(d.city)},
    location: ${location},
    locationIqPlaceId: ${d.locationIqPlaceId ? JSON.stringify(d.locationIqPlaceId) : 'null'},
    startTime: ${jsDateLiteral(d.startTime)},
    endTime: ${jsDateLiteral(d.endTime)},
    status: ${JSON.stringify(d.status)},
    reportedBy: ${reportedBy},
    importDate: ${jsDateLiteral(d.importDate)},
    importHash: ${JSON.stringify(d.importHash)},
    reportedAt: ${jsDateLiteral(d.reportedAt)},
    createdAt: ${jsDateLiteral(d.createdAt)},
    updatedAt: ${jsDateLiteral(d.updatedAt)},
    __v: 0
  },`;
    jsLines.push(docJs);
  }
  jsLines.push("];");
  jsLines.push(`db.getSiblingDB("${DB_NAME}").${COLLECTION}.insertMany(docs);`);
  fs.writeFileSync(tmpPath, jsLines.join("\n"), 'utf8');
}

// ---------- main ----------
(async function main() {
  try {
    console.log('PDF path:', PDF_PATH);
    const pdfEntries = await extractPdfAreasWithFirstSlot(PDF_PATH);
    console.log('Parsed PDF unique areas:', pdfEntries.length);

    const dbArr = await fetchDbAreas();
    console.log('Fetched DB areas:', dbArr.length);

    const dbNormMap = new Map(); // normalized -> raw
    dbArr.forEach(d => dbNormMap.set(d.normalized, d.raw));

    const exactMatches = [];
    const unmatchedPdf = [];
    for (const p of pdfEntries) {
      if (dbNormMap.has(p.normalized)) exactMatches.push(p);
      else unmatchedPdf.push(p);
    }

    const dbListNormalized = dbArr.map(d => d.normalized);
    const fuzzyMatched = [];
    const stillMissing = [];
    for (const p of unmatchedPdf) {
      if (dbListNormalized.length === 0) { stillMissing.push(p); continue; }
      const best = stringSim.findBestMatch(p.normalized, dbListNormalized);
      if (best.bestMatch.rating >= FUZZY_THRESHOLD) {
        fuzzyMatched.push({ pdf: p, score: best.bestMatch.rating });
      } else {
        stillMissing.push(p);
      }
    }

    console.log('Exact matches:', exactMatches.length);
    console.log('Fuzzy matched (>= ' + FUZZY_THRESHOLD + '):', fuzzyMatched.length);
    console.log('Still missing (to insert):', stillMissing.length);

    if (stillMissing.length === 0) {
      console.log('No missing areas to insert. Exiting.');
      process.exit(0);
    }

    console.log('Geocoding missing areas with fallback (LocationIQ -> Nominatim)...');
    const prepared = [];
    for (const m of stillMissing) {
      const ge = await geocodeArea(m.raw);
      const startObj = parseTimeToken(m.firstStart);
      const endObj = parseTimeToken(m.firstEnd);

      let startTime = new Date();
      let endTime = new Date(Date.now() + 60 * 60 * 1000);
      if (startObj && endObj) {
        startTime = buildDateForSlot(startObj.h, startObj.m);
        endTime = buildDateForSlot(endObj.h, endObj.m);
        if (endTime.getTime() <= startTime.getTime()) endTime.setDate(endTime.getDate() + 1);
      }

      const doc = {
        area: m.raw,
        areaId: new ObjectId(),
        city: CITY,
        location: ge ? { type: 'Point', coordinates: [parseFloat(ge.lon), parseFloat(ge.lat)] } : null,
        locationIqPlaceId: ge ? String(ge.place_id) : null, // "nominatim:<id>" if Nominatim used
        startTime,
        endTime,
        status: (startTime.getTime() <= Date.now() && endTime.getTime() >= Date.now()) ? 'ongoing' : 'scheduled',
        reportedBy: null,
        importDate: new Date(),
        importHash: importHashForArea(m.raw),
        reportedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0
      };

      prepared.push(doc);
      console.log(`Prepared: "${m.raw}" -> geocode: ${ge ? `${ge.lat},${ge.lon} via ${ge.src}` : 'NOT FOUND'}`);
    }

    console.log('\n=== PREVIEW: First 20 prepared documents ===');
    prepared.slice(0, 20).forEach((p, i) => {
      console.log(`${i + 1}. area: ${p.area}`);
      console.log(`   coords: ${p.location ? p.location.coordinates.join(',') : 'null'}, start: ${p.startTime.toISOString()}, end: ${p.endTime.toISOString()}`);
    });
    console.log(`\nTotal to insert: ${prepared.length}`);

    const answer = prompt('Type "commit" to insert these into DB (or anything else to abort): ');
    if (answer !== 'commit') {
      console.log('Aborted. No changes made.');
      process.exit(0);
    }

    try {
      console.log('Attempting insert via mongodb driver...');
      const res = await tryInsertWithDriver(prepared);
      console.log('Inserted via driver. InsertedCount:', res.insertedCount);
      console.log('Inserted IDs sample:', Object.values(res.insertedIds).slice(0, 5));
      process.exit(0);
    } catch (insErr) {
      console.warn('Driver insert failed, will fallback to mongosh. Error:', insErr.message || insErr);
      const tmpJs = path.join(process.cwd(), `__tmp_insert_${Date.now()}.js`);
      writeTempInsertFile(prepared, tmpJs);
      console.log('Wrote temp JS for mongosh at:', tmpJs);
      const loadCmd = `mongosh "${MONGO_URI}" --quiet --eval "load('${tmpJs.replace(/\\\\/g, '\\\\\\\\')}')"`;
      console.log('Running mongosh to insert...');
      exec(loadCmd, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
        if (err) {
          console.error('mongosh insert failed:', err.message, stderr);
          try { fs.unlinkSync(tmpJs); } catch (_) {}
          process.exit(1);
        } else {
          console.log('mongosh output:', stdout.trim());
          console.log('Insert via mongosh finished. Cleaning temp file.');
          try { fs.unlinkSync(tmpJs); } catch (_) {}
          process.exit(0);
        }
      });
    }

  } catch (err) {
    console.error('ERROR:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();