const express = require("express");
const authMiddleware = require("../middleware/auth.js");

const router = express.Router();

// Example protected route
router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    message: "User profile fetched successfully",
    user: req.user
  });
});

module.exports = router;
