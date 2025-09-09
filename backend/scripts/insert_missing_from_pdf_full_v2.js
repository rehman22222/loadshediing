// scripts/insert_missing_from_pdf_match_schema.js
// Usage:
//   node scripts/insert_missing_from_pdf_match_schema.js "/path/Load-Shed-Schedule-26-June-2025.pdf" --date=2025-06-26
//   node ... --commit        (to auto commit without interactive prompt)
//
// Required .env keys (you already have these):
//   MONGO_URI, LOCATIONIQ_API_KEY, NOMINATIM_EMAIL
// Optional .env keys:
//   CITY (default: Karachi), FUZZY_THRESHOLD (default: 0.78), TZ_OFFSET_HOURS (default: 5), DB_NAME, COLLECTION_NAME

require('dotenv').config();
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { MongoClient, ObjectId } = require('mongodb');
const stringSim = require('string-similarity');
const readline = require('readline');
const crypto = require('crypto');

const argv = process.argv.slice(2);
const PDF_PATH = argv.find(a => !a.startsWith('--')) || null;
const FORCE_COMMIT = argv.some(a => a === '--commit');
const dateArg = (argv.find(a => a.startsWith('--date=')) || '').replace('--date=', '') || null;

if (!PDF_PATH) {
  console.error('Usage: node scripts/insert_missing_from_pdf_match_schema.js <pdf-path> [--date=YYYY-MM-DD] [--commit]');
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Please set MONGO_URI in .env');
  process.exit(1);
}

const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY || process.env.LOCATIONIQ_KEY;
const NOMINATIM_EMAIL = process.env.NOMINATIM_EMAIL;
const CITY = (process.env.CITY || 'Karachi').trim();
const FUZZY_THRESHOLD = parseFloat(process.env.FUZZY_THRESHOLD || '0.78');
const TZ_OFFSET_HOURS = parseFloat(process.env.TZ_OFFSET_HOURS || '5'); // Asia/Karachi = +5
const DB_NAME = process.env.DB_NAME || 'loadsheddingDB';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'outages';
const FETCH_LIMIT = parseInt(process.env.FETCH_LIMIT || '5000', 10);

// --- helpers ---
function safeReplaceHyphens(s){
  return s.replace(/[~\u2022\u00B7\-\u2013\u2014]/g, '~').replace(/\s+/g, ' ').trim();
}

function cleanAreaRaw(s) {
  if (!s) return '';
  let t = String(s);
  t = t.replace(/\(.*?\)/g, ' ');
  t = t.replace(/\b(RMU|RMUKDA|RMU KDA)\b/ig, '');
  t = t.replace(/\b(Ex-?|Ex )/ig, '');
  t = t.replace(/[.,:;·•]/g, ' ');
  t = t.replace(new RegExp('\\b' + CITY + '\\b', 'ig'), ' ');
  t = t.replace(/\b(sector|block|phase|colony|street|st)\b/ig, ' ');
  t = t.replace(/\s+/g, ' ').trim().toLowerCase();
  // strip trailing digits if times glued (e.g. "Queens Road0705")
  t = t.replace(/\d+$/g, '').trim();
  return t;
}

function parseFourOrColonTime(str) {
  if (!str) return null;
  const justDigits = str.replace(/[^0-9]/g, '');
  if (justDigits.length === 4) {
    return justDigits.slice(0,2) + ':' + justDigits.slice(2);
  }
  if (/^\d{1,2}[:.]\d{2}$/.test(str)) {
    return str.replace('.', ':').padStart(5,'0');
  }
  return null;
}

function normalizeTilde(s){
  if(!s) return '';
  return safeReplaceHyphens(s);
}

function extractTimePairsFromString(s) {
  // returns [{start:"HH:MM", end:"HH:MM", raw:"1105~1335"}]
  if (!s) return [];
  const normalized = normalizeTilde(s);
  const pairs = [];
  const pairRegexes = [
    /(\d{2}[:.]?\d{2})\s*~\s*(\d{2}[:.]?\d{2})/g,
    /(\d{4})\s*~\s*(\d{4})/g,
    /(\d{2}[:.]?\d{2})\s*[-–]\s*(\d{2}[:.]?\d{2})/g,
    /(\d{4})\s*[-–]\s*(\d{4})/g
  ];
  let m;
  for (const rx of pairRegexes) {
    while ((m = rx.exec(normalized)) !== null) {
      const st = parseFourOrColonTime(m[1]);
      const en = parseFourOrColonTime(m[2]);
      if (st && en) pairs.push({ start: st, end: en, raw: m[0] });
    }
  }
  // fallback: chunk any sequence of 4-digit numbers
  if (pairs.length === 0) {
    const digits = normalized.match(/\d{4}/g) || [];
    for (let i = 0; i+1 < digits.length; i += 2) {
      const st = parseFourOrColonTime(digits[i]);
      const en = parseFourOrColonTime(digits[i+1]);
      if (st && en) pairs.push({ start: st, end: en, raw: `${digits[i]}~${digits[i+1]}` });
    }
  }
  return pairs;
}

function looksLikeHeader(line) {
  if (!line) return false;
  const h = line.toLowerCase();
  const headers = ['feeder name','how to locate','1st cycle','2nd cycle','3rd cycle','grid','timings','note:','contact', 'cycle'];
  for (const kw of headers) if (h.includes(kw)) return true;
  if (h.length < 3) return true;
  return false;
}

function timeOverlap(aStart, aEnd, bStart, bEnd) {
  const toMins = s => {
    const [hh,mm] = s.split(':').map(Number);
    return hh*60 + mm;
  };
  const fix = (s,e) => {
    let S = toMins(s), E = toMins(e);
    if (E <= S) E += 24*60;
    return [S,E];
  };
  const [AS,AE] = fix(aStart,aEnd);
  const [BS,BE] = fix(bStart,bEnd);
  return !(AE <= BS || AS >= BE);
}

function parseDateFromFilename(path) {
  // tries to find patterns like 26-June-2025 or 26_June_2025 or 2025-06-26
  const name = path.split(/[/\\]/).pop();
  const m1 = name.match(/(\d{1,2})[-_ ]?(january|february|march|april|may|june|july|august|september|october|november|december)[-_ ]?(\d{4})/i);
  if (m1) {
    const day = parseInt(m1[1],10);
    const month = new Date(`${m1[2]} 1, 2000`).getMonth(); // month index
    const year = parseInt(m1[3],10);
    return { year, month, day };
  }
  const m2 = name.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
  if (m2) {
    const year = parseInt(m2[1],10), month = parseInt(m2[2],10)-1, day = parseInt(m2[3],10);
    return { year, month, day };
  }
  return null;
}

function makeUTCfromLocal(year, monthIndex, day, hhmm, tzOffsetHours=TZ_OFFSET_HOURS) {
  // hhmm -> "HH:MM"
  const [hh, mm] = hhmm.split(':').map(Number);
  // Construct date in local (Asia/Karachi = tzOffsetHours) and return UTC Date object
  // Compute UTC timestamp = Date.UTC(year,month,day,hour - tzOffsetHours, minute)
  const utcTs = Date.UTC(year, monthIndex, day, hh - tzOffsetHours, mm, 0);
  return new Date(utcTs);
}

function makeImportHash(area, startISO, endISO) {
  return crypto.createHash('md5').update(`${area}|${startISO}|${endISO}`).digest('hex');
}

// simple geocode using LocationIQ then Nominatim fallback
async function geocode(areaText) {
  // first try LocationIQ if key present
  try {
    if (LOCATIONIQ_API_KEY) {
      const q = encodeURIComponent(`${areaText}, ${CITY}`);
      // bounding box for Karachi (approx): left,top,right,bottom? LocationIQ uses viewbox=left,top,right,bottom
      // We'll use a conservative box:
      const viewbox = '66.5,25.5,67.5,24.5'; // left,top,right,bottom
      const url = `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_API_KEY}&q=${q}&format=json&limit=1&bounded=1&viewbox=${viewbox}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length>0) {
          const r = data[0];
          return { lon: parseFloat(r.lon), lat: parseFloat(r.lat), provider: 'locationiq', raw: r };
        }
      }
    }
  } catch (e) {
    // continue to nominatim
  }
  // fallback Nominatim
  try {
    if (NOMINATIM_EMAIL) {
      const q = encodeURIComponent(`${areaText}, ${CITY}`);
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&email=${encodeURIComponent(NOMINATIM_EMAIL)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'loadshedding-tracker-script/1.0 (+https://example.com)' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length>0) {
          const r = data[0];
          return { lon: parseFloat(r.lon), lat: parseFloat(r.lat), provider: 'nominatim', raw: r };
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

(async function main(){
  console.log('Reading PDF:', PDF_PATH);
  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const pdf = await pdfParse(pdfBuffer);
  const text = pdf.text || '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // decide date
  let dateParts = null;
  if (dateArg) {
    const parts = dateArg.split('-').map(Number);
    if (parts.length===3) {
      dateParts = { year: parts[0], month: parts[1]-1, day: parts[2] };
    }
  }
  if (!dateParts) {
    const parsed = parseDateFromFilename(PDF_PATH);
    if (parsed) dateParts = parsed;
  }
  if (!dateParts) {
    // fallback to today (local)
    const d = new Date();
    dateParts = { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
    console.warn('Warning: could not parse date from filename or --date. Using today as event date:', `${dateParts.year}-${dateParts.month+1}-${dateParts.day}`);
  }

  // parse lines into entries
  const parsedEntries = [];
  for (let raw of lines) {
    raw = raw.replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim();
    if (!raw) continue;
    if (looksLikeHeader(raw)) continue;

    // try find first time index
    const idx4 = raw.search(/\d{4}/);
    const idxColon = raw.search(/\d{1,2}[:.]\d{2}/);
    if (idx4>=0 && (idx4 < idxColon || idxColon===-1)) {
      const areaPart = raw.slice(0, idx4).trim();
      const timesPart = raw.slice(idx4).trim();
      const pairs = extractTimePairsFromString(timesPart);
      const areaClean = cleanAreaRaw(areaPart);
      if (!areaClean) continue;
      if (pairs.length>0) {
        for (const p of pairs) {
          parsedEntries.push({ rawLine: raw, areaRaw: areaPart, areaClean, time: p });
        }
      } else {
        const maybeTime = extractTimePairsFromString(timesPart);
        parsedEntries.push({ rawLine: raw, areaRaw: areaPart, areaClean, time: maybeTime[0] || null });
      }
      continue;
    }

    if (idxColon >= 0) {
      const areaCandidate = raw.slice(0, idxColon).trim();
      const timeCandidate = raw.slice(idxColon).trim();
      const pairs = extractTimePairsFromString(timeCandidate);
      const areaClean = cleanAreaRaw(areaCandidate || raw);
      if (pairs.length>0) {
        for (const p of pairs) parsedEntries.push({ rawLine: raw, areaRaw: areaCandidate || raw, areaClean, time: p });
      } else {
        parsedEntries.push({ rawLine: raw, areaRaw: raw, areaClean, time: null });
      }
      continue;
    }

    // fallback area-only
    const areaClean = cleanAreaRaw(raw);
    if (areaClean) parsedEntries.push({ rawLine: raw, areaRaw: raw, areaClean, time: null });
  }

  // dedupe
  const seen = new Set();
  const uniq = [];
  for (const e of parsedEntries) {
    const key = `${e.areaClean}||${e.time ? e.time.start+'-'+e.time.end : 'NO_TIME'}`;
    if (!seen.has(key)) { seen.add(key); uniq.push(e); }
  }

  console.log(`Parsed ${uniq.length} entries from PDF.`);

  // connect to Mongo
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection(COLLECTION_NAME);

  const dbDocs = await col.find({}, { projection: { area:1, areaClean:1, startTime:1, endTime:1, time:1 } }).limit(FETCH_LIMIT).toArray();
  const dbNormalized = dbDocs.map(d => {
    const rawArea = (d.area || '') + '';
    return { id: d._id, raw: rawArea, areaClean: cleanAreaRaw(d.areaClean || rawArea), doc: d };
  });

  // compare & compute missing
  const missing = [];
  for (const p of uniq) {
    const scores = dbNormalized.map(d => ({ ref: d, score: stringSim.compareTwoStrings(p.areaClean, d.areaClean) }));
    scores.sort((a,b) => b.score - a.score);
    const best = scores[0];
    const bestScore = best ? best.score : 0;
    const bestDoc = best ? best.ref.doc : null;

    let timeMatches = true;
    if (p.time && bestDoc && bestDoc.startTime && bestDoc.endTime) {
      try {
        // bestDoc.startTime is a Date object stored in DB; convert to "HH:MM" in local tz
        const bStart = new Date(bestDoc.startTime).toISOString(); // fallback
        // convert to HH:MM in local by using timezone offset (we assume TZ_OFFSET_HOURS)
        const ds = new Date(bestDoc.startTime);
        const bsHH = new Date(ds.getTime() + TZ_OFFSET_HOURS*3600*1000).toISOString().substr(11,5);
        const de = new Date(bestDoc.endTime);
        const beHH = new Date(de.getTime() + TZ_OFFSET_HOURS*3600*1000).toISOString().substr(11,5);
        timeMatches = timeOverlap(p.time.start, p.time.end, bsHH, beHH);
      } catch (e) { timeMatches = true; }
    }

    const matched = bestScore >= FUZZY_THRESHOLD && (p.time ? timeMatches : true);
    if (!matched) missing.push({ parsed: p, bestMatchScore: bestScore, bestMatchDoc: bestDoc ? { _id: bestDoc._id, area: bestDoc.area } : null });
  }

  console.log(`\nFound ${missing.length} entries from PDF not confidently matched in DB (threshold ${FUZZY_THRESHOLD}).\n`);
  if (missing.length===0) {
    console.log('No missing outages found. Exiting.');
    await client.close();
    process.exit(0);
  }

  // show preview
  missing.forEach((m, i) => {
    console.log(`--- Missing #${i+1} ---`);
    console.log('PDF:', m.parsed.rawLine);
    console.log('Area:', m.parsed.areaRaw, '->', m.parsed.areaClean);
    console.log('Time:', m.parsed.time ? `${m.parsed.time.start} - ${m.parsed.time.end}` : '(none)');
    console.log('Best DB score:', m.bestMatchScore.toFixed(3), 'candidate:', m.bestMatchDoc ? JSON.stringify(m.bestMatchDoc) : 'none');
    console.log('');
  });

  // prepare docs to insert (includes geocoding)
  const toInsert = [];
  for (const m of missing) {
    // compute start/end Date in UTC from local timezone & dateParts
    let startDate = null, endDate = null;
    if (m.parsed.time) {
      startDate = makeUTCfromLocal(dateParts.year, dateParts.month, dateParts.day, m.parsed.time.start, TZ_OFFSET_HOURS);
      endDate = makeUTCfromLocal(dateParts.year, dateParts.month, dateParts.day, m.parsed.time.end, TZ_OFFSET_HOURS);
    }

    // geocode (best-effort) - throttling: small delay
    let geocodeRes = null;
    try {
      geocodeRes = await geocode(m.parsed.areaRaw);
      // sleep small to avoid rate-limits
      await new Promise(r=>setTimeout(r, 350));
    } catch (e) {
      geocodeRes = null;
    }

    const doc = {
      area: m.parsed.areaRaw.trim(),
      areaClean: m.parsed.areaClean,
      city: CITY,
      location: geocodeRes ? { type: 'Point', coordinates: [geocodeRes.lon, geocodeRes.lat] } : null,
      locationProvider: geocodeRes ? geocodeRes.provider : null,
      startTime: startDate,
      endTime: endDate,
      status: 'scheduled',
      importDate: new Date(),
      importHash: makeImportHash(m.parsed.areaClean, startDate ? startDate.toISOString() : '', endDate ? endDate.toISOString() : ''),
      reportedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'pdf-compare-match-schema',
      pdfLine: m.parsed.rawLine
    };
    toInsert.push(doc);
  }

  // prompt
  const promptCommit = async () => {
    if (FORCE_COMMIT) return true;
    return new Promise(resolve => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(`Type "commit" to insert ${toInsert.length} docs into ${DB_NAME}.${COLLECTION_NAME}, or anything else to cancel: `, ans => {
        rl.close();
        resolve(ans.trim().toLowerCase() === 'commit');
      });
    });
  };

  const ok = await promptCommit();
  if (!ok) {
    console.log('Cancelled. No changes.');
    await client.close();
    process.exit(0);
  }

  if (toInsert.length>0) {
    const res = await db.collection(COLLECTION_NAME).insertMany(toInsert);
    console.log(`Inserted ${res.insertedCount} documents. IDs:`, Object.values(res.insertedIds));
  } else {
    console.log('Nothing to insert.');
  }

  await client.close();
  console.log('Done.');
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});