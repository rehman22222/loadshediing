// middleware/premiumOnly.js
const Purchase = require("../models/Purchase");
const User = require("../models/User");

module.exports = async function premiumOnly(req, res, next) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    // quick path: user.role === 'premium'
    const user = await User.findById(req.userId).select("role");
    if (user && user.role === "premium") return next();

    // fallback: active purchase
    const active = await Purchase.findOne({
      userId: req.userId,
      isActive: true,
      expiryDate: { $gt: new Date() }
    }).lean();

    if (!active) {
      return res.status(402).json({ // 402 Payment Required (semantic)
        message: "Premium feature. No active subscription."
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};
