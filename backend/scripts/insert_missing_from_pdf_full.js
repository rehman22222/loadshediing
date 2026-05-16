// scripts/insert_missing_from_pdf_full.js
// Usage: node scripts/insert_missing_from_pdf_full.js
// Dry-run preview — type "commit" to actually insert.

require('dotenv').config();
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { MongoClient, ObjectId } = require('mongodb');
const stringSimilarity = require('string-similarity');
const fetch = require('node-fetch');
const crypto = require('crypto');
const readline = require('readline');
const { getMongoDatabaseName } = require('../utils/dbConnection');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const LOCATIONIQ_KEY = process.env.LOCATIONIQ_KEY;
const NOMINATIM_EMAIL = process.env.NOMINATIM_EMAIL || 'you@example.com';
const PDF_PATH = process.env.PDF_PATH || 'C:/Users/Zubair Computer/Downloads/Documents/Load-Shed-Schedule-26-June-2025.pdf';

if (!MONGO_URI) { console.error('MONGO_URI missing in .env'); process.exit(1); }
if (!LOCATIONIQ_KEY) { console.error('LOCATIONIQ_KEY missing in .env'); process.exit(1); }

const CITY = 'Karachi';
const COUNTRY = 'Pakistan';
// Karachi bbox for validation (approx)
const KARACHI_BBOX = { minLon: 66.65, minLat: 24.75, maxLon: 67.50, maxLat: 25.10 };
const KARACHI_CENTER = { lon: 67.0011, lat: 24.8607 };

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function insideKarachi(lat, lon){
  if (lat == null || lon == null) return false;
  return lat >= KARACHI_BBOX.minLat && lat <= KARACHI_BBOX.maxLat &&
         lon >= KARACHI_BBOX.minLon && lon <= KARACHI_BBOX.maxLon;
}
function importHashForArea(area){ return crypto.createHash('md5').update(area).digest('hex'); }

// clean a raw PDF line -> probable area name
function cleanPdfLine(line){
  if (!line) return '';
  let s = String(line);
  s = s.replace(/\r/g,' ').replace(/\t/g,' ').replace(/\u00A0/g,' ');
  // remove long numeric tokens (times like 0935 or concatenated tokens)
  s = s.replace(/\d{2,}/g, ' ');
  // split compacted CamelCase e.g. "EKorangi" -> "E Korangi"
  s = s.replace(/([a-z])([A-Z0-9])/g, '$1 $2');
  // replace slashes/dashes with space, remove weird chars except / (keep / because many areas use it)
  s = s.replace(/[–—]/g,'-');
  s = s.replace(/[\u2018\u2019\u201C\u201D"•·]/g,'');
  s = s.replace(/[^\w\s\/\-\(\)\,\.]/g,' ');
  s = s.replace(/\s{2,}/g,' ').trim();
  // collapse duplicate words (e.g., "Landhi Landhi")
  s = s.replace(/\b([A-Za-z0-9\/\-\(\)]+)\s+\1\b/gi, '$1');
  return s;
}

// Extract candidate area strings from PDF
async function extractAreasFromPDF(pdfPath){
  if (!fs.existsSync(pdfPath)) throw new Error('PDF not found: ' + pdfPath);
  const buf = fs.readFileSync(pdfPath);
  const data = await pdfParse(buf);
  const lines = (data.text || '').split('\n').map(l=>l.trim()).filter(Boolean);
  const cand = lines.map(cleanPdfLine).filter(l => l && l.length>2);
  // filter out obvious non-area lines (headers/footers)
  const blacklist = ['how to locate', 'feeder name', 'download our app', 'disclaimer', 'loadshed', 'load-shed', 'national power', 'time of the schedule'];
  const filtered = cand.filter(l => !blacklist.some(b => l.toLowerCase().includes(b)));
  const uniq = Array.from(new Set(filtered));
  return uniq;
}

// Geocode helpers (LocationIQ bounded, unbounded, Nominatim)
async function geocodeLocationIQ(query, bounded=true){
  const bboxPart = bounded ? `&viewbox=${KARACHI_BBOX.minLon},${KARACHI_BBOX.minLat},${KARACHI_BBOX.maxLon},${KARACHI_BBOX.maxLat}&bounded=1&countrycodes=pk` : '&countrycodes=pk';
  const url = `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(query)}&format=json&limit=1${bboxPart}`;
  try {
    const r = await fetch(url, { timeout: 10000 });
    const j = await r.json();
    if (Array.isArray(j) && j.length>0){
      const p = j[0];
      const lat = parseFloat(p.lat), lon = parseFloat(p.lon);
      return { lat, lon, source: 'locationiq', placeId: String(p.place_id || '') , display_name: p.display_name || null };
    }
  } catch(e){ /* ignore */ }
  return null;
}

async function geocodeNominatim(query){
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': `loadshedding-tracker/1.0 (${NOMINATIM_EMAIL})` }, timeout: 15000 });
    const j = await r.json();
    if (Array.isArray(j) && j.length>0){
      const p = j[0];
      const lat = parseFloat(p.lat), lon = parseFloat(p.lon);
      return { lat, lon, source: 'nominatim', placeId: `nominatim:${p.place_id}`, display_name: p.display_name || null };
    }
  } catch(e){ /* ignore */ }
  return null;
}

async function geocodeBest(area, areasCollectionCache){
  // 0) Try exact/close match in existing areas collection (reuse their coords)
  if (areasCollectionCache && areasCollectionCache.length>0){
    const cleaned = area.toLowerCase().replace(/\s+/g,' ').trim();
    const names = areasCollectionCache.map(a => a.nameClean);
    const best = stringSimilarity.findBestMatch(cleaned, names);
    if (best.bestMatch.rating >= 0.88){
      const idx = best.bestMatchIndex;
      return { lat: areasCollectionCache[idx].lat, lon: areasCollectionCache[idx].lon, source: 'areas_collection', placeId: areasCollectionCache[idx].placeId || null };
    }
  }

  // build candidate queries
  const cleaned = area;
  const candidates = [
    `${cleaned}, ${CITY}, ${COUNTRY}`,
    `${cleaned}, ${CITY}`,
  ];

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  // last 3/2/1 tokens
  for (const n of [3,2,1]){
    if (tokens.length >= n){
      const last = tokens.slice(-n).join(' ');
      candidates.push(`${last}, ${CITY}`, `${last}, ${CITY}, ${COUNTRY}`);
    }
  }

  // 1) LocationIQ bounded
  for (const q of Array.from(new Set(candidates))){
    const r = await geocodeLocationIQ(q, true);
    if (r && insideKarachi(r.lat, r.lon)) return r;
    await sleep(250);
  }

  // 2) LocationIQ unbounded
  for (const q of Array.from(new Set(candidates))){
    const r = await geocodeLocationIQ(q, false);
    if (r && insideKarachi(r.lat, r.lon)) return r;
    await sleep(250);
  }

  // 3) Nominatim polite
  for (const q of Array.from(new Set(candidates))){
    await sleep(1100);
    const r = await geocodeNominatim(q);
    if (r && insideKarachi(r.lat, r.lon)) return r;
  }

  // 4) nothing found
  return null;
}

(async function main(){
  console.log('PDF path:', PDF_PATH);
  const client = new MongoClient(MONGO_URI, { maxPoolSize: 4 });
  await client.connect();
  const db = client.db(getMongoDatabaseName(MONGO_URI));
  const outagesCol = db.collection('outages');
  const areasCol = db.collection('areas');

  console.log('Extracting areas from PDF...');
  const pdfAreas = await extractAreasFromPDF(PDF_PATH);
  console.log('PDF candidate areas:', pdfAreas.length);

  // load DB outages names (normalized)
  const dbDocs = await outagesCol.find({}, { projection: { area: 1 } }).toArray();
  const dbAreas = Array.from(new Set(dbDocs.map(d => (d.area||'').toString().trim()).filter(Boolean)));
  console.log('DB outages areas count:', dbAreas.length);

  // fuzzy match to find which PDF areas are not represented in outages
  const SIMILARITY_THRESHOLD = 0.78;
  const missingPdfAreas = [];
  const matchedPdf = [];

  for (const a of pdfAreas){
    const best = stringSimilarity.findBestMatch(a, dbAreas);
    if (best.bestMatch.rating >= SIMILARITY_THRESHOLD){
      matchedPdf.push({ pdf: a, db: dbAreas[best.bestMatchIndex], score: best.bestMatch.rating });
    } else {
      missingPdfAreas.push(a);
    }
  }

  console.log('Missing areas count (pre-geocode):', missingPdfAreas.length);

  // prepare cache of areas collection for reuse of coords
  const areasDocs = await areasCol.find({}, { projection: { name:1, location:1, locationIqPlaceId:1 } }).toArray();
  const areasCache = areasDocs.map(d => {
    const name = (d.name || d.area || '').toString();
    const nameClean = name.toLowerCase().replace(/\s+/g,' ').trim();
    const lat = d.location && d.location.coordinates ? d.location.coordinates[1] : null;
    const lon = d.location && d.location.coordinates ? d.location.coordinates[0] : null;
    return { _id: d._id, name, nameClean, lat, lon, placeId: d.locationIqPlaceId || null };
  });

  // Build prepared docs
  const prepared = [];
  console.log('Geocoding missing areas (this may take a while)...');
  for (const area of missingPdfAreas){
    // try to geocode or reuse areas collection coords
    const maybe = await geocodeBest(area, areasCache);
    let coords = null, placeId = null, source = null;
    if (maybe){
      coords = { lat: maybe.lat, lon: maybe.lon };
      placeId = maybe.placeId || null;
      source = maybe.source;
    } else {
      // fallback: use Karachi center (warn)
      coords = { lat: KARACHI_CENTER.lat, lon: KARACHI_CENTER.lon };
      placeId = 'manual:center';
      source = 'fallback:center';
    }

    // create areaId: try reuse areas collection _id if fuzzy close
    let areaId = new ObjectId();
    // fuzzy check within areasCache names again for areaId reuse
    if (areasCache.length>0){
      const best = stringSimilarity.findBestMatch(area.toLowerCase(), areasCache.map(x=>x.nameClean));
      if (best.bestMatch.rating >= 0.88){
        const idx = best.bestMatchIndex;
        areaId = areasCache[idx]._id;
      }
    }

    const now = new Date();
    const startTime = new Date(now.getTime() + 0*60*1000); // immediate scheduled
    const endTime = new Date(startTime.getTime() + (90*60*1000)); // +90 min

    const doc = {
      area: area,
      areaId: areaId,
      city: CITY,
      location: { type: 'Point', coordinates: [ Number(coords.lon), Number(coords.lat) ] },
      locationIqPlaceId: placeId,
      startTime,
      endTime,
      status: (startTime.getTime() <= Date.now() && endTime.getTime() >= Date.now()) ? 'ongoing' : 'scheduled',
      reportedBy: null,
      importDate: new Date(),
      importHash: importHashForArea(area),
      reportedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    };
    prepared.push({ doc, source });
    console.log(`Prepared: "${area}" -> ${coords.lat},${coords.lon} via ${source}`);
    // small delay to avoid hitting rate limiter too hard
    await sleep(200);
  }

  console.log('\n=== PREVIEW: First 30 prepared documents ===');
  prepared.slice(0,30).forEach((p,i)=>{
    const d = p.doc;
    console.log(`${i+1}. area: ${d.area}`);
    console.log(`   coords: ${d.location.coordinates.join(',')}, source: ${p.source}`);
  });
  console.log(`\nTotal to insert: ${prepared.length}`);

  // confirm commit
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Type "commit" to insert these into DB (or anything else to abort): ', async (ans) => {
    if (ans.trim().toLowerCase() === 'commit'){
      const docs = prepared.map(p => p.doc);
      try {
        const res = await db.collection('outages').insertMany(docs, { ordered: false });
        console.log('InsertedCount:', res.insertedCount);
        console.log('Inserted sample ids:', Object.values(res.insertedIds).slice(0,5));
      } catch (err) {
        console.error('Insert error:', err);
      }
    } else {
      console.log('Aborted — no changes written.');
    }
    rl.close();
    await client.close();
    process.exit(0);
  });

})().catch(err => { console.error(err); process.exit(1); });
