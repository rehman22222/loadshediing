// routes/outageRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const outageController = require("../controllers/outageController");

router.post("/", auth, outageController.createOutage);
router.get("/", outageController.getAllOutages);
router.get("/area/:area", outageController.getOutagesByArea);
router.get("/today", auth, outageController.getOutagesForUserArea);
router.get("/nearby", outageController.getNearbyOutages);

module.exports = router;
