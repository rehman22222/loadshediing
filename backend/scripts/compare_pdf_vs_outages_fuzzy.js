// scripts/compare_pdf_vs_outages_fuzzy.js
const fs = require("fs");
const pdfParse = require("pdf-parse");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");
const stringSimilarity = require("string-similarity");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const PDF_PATH = "C:/Users/Zubair Computer/Downloads/Documents/Load-Shed-Schedule-26-June-2025.pdf";

// Helper: clean PDF lines
function cleanAreaName(line) {
  return line
    .replace(/\d{2,}/g, " ")          // remove timings/numbers
    .replace(/\s+/g, " ")             // normalize spaces
    .replace(/([a-z])([A-Z])/g, "$1 $2") // split stuck words
    .replace(/[^a-zA-Z0-9\/\-\s\(\)]/g, "") // remove weird chars
    .trim();
}

async function extractAreasFromPDF() {
  const dataBuffer = fs.readFileSync(PDF_PATH);
  const data = await pdfParse(dataBuffer);
  const lines = data.text.split("\n");

  let candidates = lines
    .map(line => cleanAreaName(line))
    .filter(line => line.length > 3 && isNaN(line));

  return [...new Set(candidates)];
}

async function runComparison() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  const outages = await db.collection("outages").find({}).toArray();

  const dbAreas = [...new Set(outages.map(o => o.area.trim()))];
  const pdfAreas = await extractAreasFromPDF();

  console.log(`📄 Extracted ${pdfAreas.length} candidate areas from PDF`);
  console.log(`🗄️ DB has ${dbAreas.length} areas\n`);

  let matched = [];
  let missing = [];

  pdfAreas.forEach(area => {
    const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(area, dbAreas);
    if (bestMatch.rating >= 0.75) {
      matched.push({ area, matchedWith: dbAreas[bestMatchIndex], score: bestMatch.rating });
    } else {
      missing.push(area);
    }
  });

  console.log("=== COMPARISON RESULT ===");
  console.log("Matched:", matched.length);
  console.log("Missing in DB:", missing.length);

  console.log("\n--- Missing in DB ---");
  missing.forEach(m => console.log(" -", m));

  console.log("\n--- Example Matches ---");
  matched.slice(0, 10).forEach(m => console.log(`✅ ${m.area} ↔ ${m.matchedWith} (${m.score.toFixed(2)})`));

  await client.close();
}

runComparison().catch(console.error);