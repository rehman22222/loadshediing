const express = require("express");
const router = express.Router();
const areaController = require("../controllers/areaController");

router.get("/", areaController.getAreas);          // /api/areas?q=Johar
router.post("/", areaController.createArea);       // create (handles duplicate 409)

module.exports = router;
