// routes/outages.js
const express = require("express");
const Outage = require("../models/Outage");
const auth = require("../middleware/auth"); // ✅ add this

const router = express.Router();

// Add a new outage (Protected)
router.post("/", auth, async (req, res) => {
  try {
    const { area, startTime, endTime, status } = req.body;

    // Basic validation (optional but helpful)
    if (!area || !startTime) {
      return res.status(400).json({ error: "area and startTime are required" });
    }

    const outage = new Outage({
      area,
      startTime, // Send as ISO string or Date; Mongoose will cast
      endTime,
      status, // optional; defaults to 'ongoing'
      reportedBy: req.userId   // 👈 link to logged-in user
    });

    await outage.save();
    return res.status(201).json(outage);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Get all outages (Public) — include reporter info
router.get("/", async (req, res) => {
  try {
    const outages = await Outage.find()
      .sort({ reportedAt: -1 })
      .populate("reportedBy", "username email"); // 👈 show reporter username/email

    return res.json(outages);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
module.exports = router;
