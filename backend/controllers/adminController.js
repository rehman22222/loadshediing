const Area = require("../models/Area");
const Outage = require("../models/Outage");
const User = require("../models/User");
const Feedback = require("../models/Feedback");
const Purchase = require("../models/Purchase");

exports.getAnalytics = async (req, res, next) => {
  try {
    const [
      totalUsers,
      freeUsers,
      premiumUsers,
      adminUsers,
      totalAreas,
      totalOutages,
      importedOutages,
      feedbackCount,
      activePurchases,
      alertsEnabledUsers,
      topAreas,
      importBatches,
      recentFeedback,
      recentPurchases,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "free" }),
      User.countDocuments({ role: "premium" }),
      User.countDocuments({ role: "admin" }),
      Area.countDocuments(),
      Outage.countDocuments(),
      Outage.countDocuments({ importDate: { $exists: true, $ne: null } }),
      Feedback.countDocuments(),
      Purchase.countDocuments({ isActive: true }),
      User.countDocuments({ "alertPreferences.enabled": true }),
      Outage.aggregate([
        { $group: { _id: "$area", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
        { $project: { _id: 0, area: "$_id", count: 1 } },
      ]),
      Outage.aggregate([
        { $match: { importDate: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$importDate" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 6 },
        { $project: { _id: 0, date: "$_id", count: 1 } },
      ]),
      Feedback.find()
        .populate("userId", "username email")
        .populate("areaId", "name city")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Purchase.find()
        .populate("userId", "username email role")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const latestImportDate = importBatches.length > 0 ? importBatches[0].date : null;

    res.json({
      totalUsers,
      freeUsers,
      premiumUsers,
      adminUsers,
      totalAreas,
      totalOutages,
      importedOutages,
      feedbackCount,
      activePurchases,
      alertsEnabledUsers,
      latestImportDate,
      topAreas,
      importBatches,
      recentFeedback: recentFeedback.map((item) => ({
        id: String(item._id),
        message: item.message,
        area: item.areaId?.name || "Unknown area",
        user: item.userId?.username || "Unknown user",
        createdAt: item.createdAt,
      })),
      recentPurchases: recentPurchases.map((item) => ({
        id: String(item._id),
        user: item.userId?.username || item.userId?.email || "Unknown user",
        email: item.userId?.email || null,
        planId: item.planId || item.productId,
        paymentMethod: item.paymentMethod || "placeholder_card",
        status: item.status || (item.isActive ? "active" : "cancelled"),
        amount: item.amount || 0,
        createdAt: item.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};
