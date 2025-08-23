// scripts/seed_areas_from_text.js
require("dotenv").config();
const mongoose = require("mongoose");
const Area = require("../models/Area");
const { forwardGeocode } = require("../services/geocode");

// Put your raw area names here (one per line)
const RAW = `
Abbasi Nagar P R L
Abdul Ghani Gulistan E Johar
Abdul Mannan Garden East
Abdul Rehman KDA
Abdullah Gabol Village (Ex-Sector Y) Gulshan-E-Maymar
Abidabad (Ex-Mushtaq 1) Site
Achanak Hotel Shadman
Acil Valika
Adam Hingora Goth Malir
`.trim();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const lines = RAW.split("\n").map(l => l.trim()).filter(Boolean);
  for (const name of lines) {
    try {
      const existing = await Area.findOne({ name });
      if (existing) { console.log("exists:", name); continue; }

      const geo = await forwardGeocode(name + ", Karachi");
      const area = new Area({
        name,
        city: "Karachi",
        location: geo ? { type: "Point", coordinates: [geo.lon, geo.lat] } : undefined,
        locationIqPlaceId: geo?.placeId
      });
      await area.save();
      console.log("Saved:", name);
      // avoid hammering API: sleep 200ms
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error("Error seeding", name, err.message);
    }
  }
  await mongoose.disconnect();
  console.log("Done");
}

run();
