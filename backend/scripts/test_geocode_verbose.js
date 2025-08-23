// backend/scripts/test_geocode_verbose.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");

console.log("=== VERBOSE GEOCODE TEST START ===");
console.log("Working dir:", process.cwd());
console.log("Node version:", process.version);

// show .env existence and first 3 chars of key (don't print whole key if you prefer)
const envPath = path.join(process.cwd(), ".env");
console.log(".env exists?", fs.existsSync(envPath));
try {
  const envRaw = fs.readFileSync(envPath, "utf8");
  const match = envRaw.match(/LOCATIONIQ_API_KEY\s*=\s*(.+)/);
  console.log("LOCATIONIQ_API_KEY present in .env?", !!match);
  if (match) console.log("LOCATIONIQ_API_KEY (first 8 chars):", match[1].trim().slice(0,8) + "..."); 
} catch(e){ console.log("could not read .env:", e.message); }

// load geocode service
let geocode;
try {
  geocode = require("../services/geocode");
  console.log("services/geocode.js loaded ok. functions:", Object.keys(geocode));
} catch (err) {
  console.error("Failed loading services/geocode.js ->", err.message);
  process.exit(1);
}

(async () => {
  try {
    console.log("Calling forwardGeocode('Gulshan-e-Iqbal, Karachi') ...");
    const f = await geocode.forwardGeocode("Gulshan-e-Iqbal, Karachi");
    console.log("forwardGeocode =>", f);

    console.log("Calling reverseGeocode(24.9220, 67.0969) ...");
    const r = await geocode.reverseGeocode(24.9220, 67.0969);
    console.log("reverseGeocode =>", r);

    console.log("=== VERBOSE GEOCODE TEST END ===");
    process.exit(0);
  } catch (err) {
    console.error("ERROR during geocode calls:", err?.response?.data || err.message || err);
    process.exit(1);
  }
})();
