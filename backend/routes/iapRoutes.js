const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const iapController = require("../controllers/iapController");

router.post("/verify", auth, iapController.verifyPurchase);

module.exports = router;
