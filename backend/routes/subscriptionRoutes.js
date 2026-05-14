const express = require("express");

const auth = require("../middleware/auth");
const subscriptionController = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/plans", subscriptionController.getPlans);
router.get("/status", auth, subscriptionController.getStatus);
router.post("/checkout", auth, subscriptionController.checkoutPlaceholder);

module.exports = router;
