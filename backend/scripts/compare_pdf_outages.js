// compare_pdf_outages.js
// Usage: node scripts/compare_pdf_outages.js
// Output: missing_areas.json (in PDF but NOT in DB)
//         extra_areas.json   (in DB but NOT in PDF)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI not found in .env. Please add it and retry.');
  process.exit(1);
}

// Default PDF_PATH: if you set PDF_PATH in .env it will be used, otherwise use the path you gave
let PDF_PATH = process.env.PDF_PATH ||
  'file:///C:/Users/Zubair%20Computer/Downloads/Documents/Load-Shed-Schedule-26-June-2025.pdf';

// Handle file:// URIs and decode spaces
if (PDF_PATH.startsWith('file://')) {
  // strip file:// and decode URI components
  PDF_PATH = decodeURIComponent(PDF_PATH.replace(/^file:\/+/, ''));
}
// Normalize Windows backslashes if any
PDF_PATH = PDF_PATH.replace(/\//g, path.sep);

// Output files
const OUT_MISSING = process.env.OUT_FILE_MISSING || path.join(process.cwd(), 'missing_areas.json');
const OUT_EXTRA = process.env.OUT_FILE_EXTRA || path.join(process.cwd(), 'extra_areas.json');

// DB settings
const DB_NAME = process.env.DB_NAME || 'loadsheddingDB';
const COLLECTION = process.env.COLLECTION || 'outages';

// --- helpers ---
function normalizeName(s) {
  if (!s) return '';
  // remove time-like tokens (e.g. 0705~0935 or 0705~0935 1135~1435)
  let t = String(s);
  t = t.replace(/(\d{2,4}~\d{2,4}(\s+\d{2,4}~\d{2,4})*)/g, '');
  // replace multiple spaces/tabs with single space, trim
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, ''); // remove hidden chars
  t = t.replace(/[\u2010-\u2015]/g, ' '); // dashes to space
  t = t.replace(/[“”"']/g, ''); // remove quotes
  t = t.replace(/[.,`®]/g, ''); // remove some punctuation
  t = t.replace(/\s*\(\s*Ex-[^)]+\)\s*/ig, ' '); // remove "(Ex-...)" parts (keeps rest) — optional
  t = t.replace(/\s+/g, ' ').trim().toLowerCase();
  return t;
}

async function extractAreasFromPDF(pdfPath) {
  if (!fs.existsSync(pdfPath)) throw new Error('PDF not found at: ' + pdfPath);
  const buffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(buffer);
  const lines = data.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // keep lines containing a time-separator "~" (most schedule lines have 0705~0935 etc.)
  const candidateLines = lines.filter(l => l.includes('~'));

  // Map to area names by stripping times and normalizing
  const areas = candidateLines.map(line => {
    // remove time groups from anywhere in the line
    let cleaned = line.replace(/(\d{2,4}~\d{2,4}(\s+\d{2,4}~\d{2,4})*)/g, '').trim();
    // Sometimes the time appears in the middle and the feeder/name is split — collapse multiple spaces
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    return normalizeName(cleaned);
  }).filter(a => a.length > 0);

  // unique while preserving order
  return Array.from(new Set(areas));
}

async function fetchOutagesAreas(mongoUri) {
  const client = new MongoClient(mongoUri, { maxPoolSize: 5 });
  await client.connect();
  try {
    const db = client.db(DB_NAME);
    const col = db.collection(COLLECTION);

    // fetch only documents where area exists and not null
    const cursor = col.find({ area: { $exists: true, $ne: null } }, { projection: { area: 1 } });
    const set = new Set();
    await cursor.forEach(doc => {
      if (doc && doc.area) {
        set.add(normalizeName(String(doc.area)));
      }
    });
    return Array.from(set);
  } finally {
    await client.close();
  }
}

(async function main() {
  try {
    console.log('PDF path:', PDF_PATH);
    console.log('Connecting to MongoDB and parsing PDF...');

    const [pdfAreas, dbAreas] = await Promise.all([
      extractAreasFromPDF(PDF_PATH),
      fetchOutagesAreas(MONGO_URI)
    ]);

    const pdfSet = new Set(pdfAreas);
    const dbSet = new Set(dbAreas);

    const missing = pdfAreas.filter(a => !dbSet.has(a)); // in PDF but not in DB
    const extra = dbAreas.filter(a => !pdfSet.has(a));   // in DB but not in PDF

    console.log('Unique PDF areas found:', pdfAreas.length);
    console.log('Unique DB areas found:', dbAreas.length);
    console.log('Missing (in PDF but not DB):', missing.length);
    console.log('Extra   (in DB but not PDF):', extra.length);

    fs.writeFileSync(OUT_MISSING, JSON.stringify({ count: missing.length, missing }, null, 2), 'utf8');
    fs.writeFileSync(OUT_EXTRA, JSON.stringify({ count: extra.length, extra }, null, 2), 'utf8');

    console.log('Wrote ->', OUT_MISSING);
    console.log('Wrote ->', OUT_EXTRA);
    if (missing.length > 0) {
      console.log('\nFirst 20 missing areas (preview):\n', missing.slice(0, 20).map((x,i)=>`${i+1}. ${x}`).join('\n'));
    } else {
      console.log('\nNo missing areas found — your outages collection matches the PDF (based on normalization).');
    }
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
