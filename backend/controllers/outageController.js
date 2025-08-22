const Outage = require("../models/Outage");

// POST: Add new outage
const createOutage = async (req, res) => {
  try {
    const { area, startTime, endTime } = req.body;

    const outage = new Outage({ area, startTime, endTime });
    await outage.save();

    res.status(201).json(outage);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET: Fetch all outages
const getOutages = async (req, res) => {
  try {
    const outages = await Outage.find().sort({ reportedAt: -1 });
    res.json(outages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createOutage, getOutages };