const express = require("express");
const auth = require("../middleware/auth");
const premiumOnly = require("../middleware/premiumOnly");
const outageController = require("../controllers/outageController");

const router = express.Router();

router.post("/", auth, outageController.createOutage);
router.get("/", outageController.getAllOutages);
router.get("/upcoming", auth, outageController.getUpcomingOutages);
router.get("/today", auth, outageController.getOutagesForUserArea);
router.get("/nearby", auth, premiumOnly, outageController.getNearbyOutages);
router.get("/city/:city", outageController.getOutagesByCity);
router.get("/area/:area", outageController.getOutagesByArea);

module.exports = router;
