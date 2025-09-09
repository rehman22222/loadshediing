// routes/outageRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const premiumOnly = require("../middleware/premiumOnly");
const outageController = require("../controllers/outageController");
// routes/outageRoutes.js (temporarily add immediately after require)

// POST /api/outages → Report new outage
router.post("/", auth, outageController.createOutage);

// GET /api/outages → Fetch all outages
router.get("/", outageController.getAllOutages);

// GET /api/outages/area/:area → Fetch outages by area name
router.get("/area/:area", outageController.getOutagesByArea);

// GET /api/outages/today → User's area outages (auth required)
router.get("/today", auth, outageController.getOutagesForUserArea);

// GET /api/outages/nearby → Nearby outages by lat/lng (premium only)
router.get("/nearby", auth, premiumOnly, outageController.getNearbyOutages);

module.exports = router;