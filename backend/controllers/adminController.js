const Area = require("../models/Area");
const Outage = require("../models/Outage");
const User = require("../models/User");
const Feedback = require("../models/Feedback");
const Purchase = require("../models/Purchase");

const SCHEDULE_TIMEZONE = process.env.SCHEDULE_TIMEZONE || "Asia/Karachi";
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date) {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function makeDateSeries(days) {
  const end = startOfUtcDay(new Date());
  const start = new Date(end.getTime() - (days - 1) * DAY_MS);
  const series = [];

  for (let index = 0; index < days; index += 1) {
    const date = new Date(start.getTime() + index * DAY_MS);
    series.push({
      date: date.toISOString().slice(0, 10),
      count: 0,
    });
  }

  return { start, series };
}

function mergeDateSeries(baseSeries, values, valueKey = "count") {
  const map = new Map(values.map((item) => [item.date, item[valueKey] || item.count || 0]));
  return baseSeries.map((item) => ({
    ...item,
    count: map.get(item.date) || 0,
  }));
}

function percentage(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

exports.getAnalytics = async (req, res, next) => {
  try {
    const { start: trendStart, series: trendBase } = makeDateSeries(14);

    const [
      totalUsers,
      freeUsers,
      premiumUsers,
      adminUsers,
      totalAreas,
      totalOutages,
      importedOutages,
      manualOutages,
      feedbackCount,
      activePurchases,
      purchaseVolume,
      alertsEnabledUsers,
      usersWithArea,
      usersWithLocation,
      areasWithValidCoords,
      areasWithOutages,
      topAreas,
      importBatches,
      userGrowthRaw,
      feedbackTrendRaw,
      purchaseTrendRaw,
      outageWindowDistribution,
      cityCoverage,
      recentUsers,
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
      Outage.countDocuments({ $or: [{ importDate: { $exists: false } }, { importDate: null }] }),
      Feedback.countDocuments(),
      Purchase.countDocuments({ isActive: true }),
      Purchase.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      User.countDocuments({ "alertPreferences.enabled": true }),
      User.countDocuments({ areaId: { $exists: true, $ne: null } }),
      User.countDocuments({ "location.lat": { $type: "number" }, "location.lng": { $type: "number" } }),
      Area.countDocuments({
        "location.coordinates": {
          $exists: true,
          $ne: [0, 0],
        },
      }),
      Outage.distinct("areaId", { areaId: { $exists: true, $ne: null } }),
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
      User.aggregate([
        { $match: { createdAt: { $gte: trendStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, date: "$_id", count: 1 } },
      ]),
      Feedback.aggregate([
        { $match: { createdAt: { $gte: trendStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, date: "$_id", count: 1 } },
      ]),
      Purchase.aggregate([
        { $match: { createdAt: { $gte: trendStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, date: "$_id", count: 1 } },
      ]),
      Outage.aggregate([
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%H:00",
                date: "$startTime",
                timezone: SCHEDULE_TIMEZONE,
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, hour: "$_id", count: 1 } },
      ]),
      Outage.aggregate([
        { $group: { _id: { $ifNull: ["$city", "Karachi"] }, outages: { $sum: 1 }, areas: { $addToSet: "$areaId" } } },
        { $project: { _id: 0, city: "$_id", outages: 1, areas: { $size: "$areas" } } },
        { $sort: { outages: -1 } },
        { $limit: 8 },
      ]),
      User.find()
        .select("username email role areaId createdAt")
        .populate("areaId", "name city")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
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
    const premiumLikeUsers = premiumUsers + adminUsers;
    const otherUsers = Math.max(totalUsers - freeUsers - premiumUsers - adminUsers, 0);
    const areasCoveredCount = Array.isArray(areasWithOutages) ? areasWithOutages.length : 0;
    const missingCoordinateAreas = Math.max(totalAreas - areasWithValidCoords, 0);
    const totalPurchaseVolume = purchaseVolume[0]?.total || 0;

    res.json({
      totalUsers,
      freeUsers,
      premiumUsers,
      adminUsers,
      otherUsers,
      totalAreas,
      totalOutages,
      importedOutages,
      manualOutages,
      feedbackCount,
      activePurchases,
      alertsEnabledUsers,
      usersWithArea,
      usersWithLocation,
      areasWithValidCoords,
      missingCoordinateAreas,
      areasCoveredCount,
      latestImportDate,
      latestImportCount: importBatches[0]?.count || 0,
      coverageRate: percentage(areasCoveredCount, totalAreas),
      coordinateQualityRate: percentage(areasWithValidCoords, totalAreas),
      premiumConversionRate: percentage(premiumLikeUsers, totalUsers),
      alertAdoptionRate: percentage(alertsEnabledUsers, totalUsers),
      areaSelectionRate: percentage(usersWithArea, totalUsers),
      locationOptInRate: percentage(usersWithLocation, totalUsers),
      totalPurchaseVolume,
      planBreakdown: [
        { name: "Free", value: freeUsers, percent: percentage(freeUsers, totalUsers) },
        { name: "Premium", value: premiumUsers, percent: percentage(premiumUsers, totalUsers) },
        { name: "Admin", value: adminUsers, percent: percentage(adminUsers, totalUsers) },
        ...(otherUsers
          ? [{ name: "Unclassified", value: otherUsers, percent: percentage(otherUsers, totalUsers) }]
          : []),
      ],
      outageSourceBreakdown: [
        { name: "Imported", value: importedOutages, percent: percentage(importedOutages, totalOutages) },
        { name: "Manual", value: manualOutages, percent: percentage(manualOutages, totalOutages) },
      ],
      userGrowth: mergeDateSeries(trendBase, userGrowthRaw),
      feedbackTrend: mergeDateSeries(trendBase, feedbackTrendRaw),
      purchaseTrend: mergeDateSeries(trendBase, purchaseTrendRaw),
      outageWindowDistribution,
      cityCoverage,
      topAreas,
      importBatches: [...importBatches].reverse(),
      recentUsers: recentUsers.map((item) => ({
        id: String(item._id),
        user: item.username || item.email || "Unknown user",
        email: item.email || null,
        role: item.role,
        area: item.areaId?.name || "No area selected",
        createdAt: item.createdAt,
      })),
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
