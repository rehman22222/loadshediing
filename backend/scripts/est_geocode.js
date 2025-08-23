// backend/scripts/test_geocode.js
require("dotenv").config();
const { forwardGeocode, reverseGeocode } = require("../services/geocode");

async function run() {
  console.log("Testing LocationIQ key...");
  const f = await forwardGeocode("Gulshan-e-Iqbal, Karachi");
  console.log("forwardGeocode:", f);
  const r = await reverseGeocode(24.9220, 67.0969);
  console.log("reverseGeocode:", r);
}

run().catch(e => console.error(e));
