const express = require("express");

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.use(auth, requireRole("admin"));

router.get("/analytics", adminController.getAnalytics);

module.exports = router;
