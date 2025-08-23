// routes/feedbackRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const feedback = require("../controllers/feedbackController");

router.post("/", auth, feedback.createFeedback);
router.get("/", auth, feedback.getFeedbacks);
router.get("/me", auth, feedback.getMyFeedback);
router.get("/area/:areaId", auth, feedback.getFeedbackByArea);
router.get("/outage/:outageId", auth, feedback.getFeedbackByOutage);

module.exports = router;
