// controllers/outageController.js
const mongoose = require("mongoose");
const Outage = require("../models/Outage");
const Area = require("../models/Area");
const User = require("../models/User");
const { reverseGeocode, forwardGeocode } = require("../services/geocode");

// GET /api/outages
exports.getAllOutages = async (req, res, next) => {
  try {
    const items = await Outage.find()
      .populate("reportedBy", "username email")
      .populate("areaId", "name city")
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { next(err); }
};

// POST /api/outages (auth)
exports.createOutage = async (req, res, next) => {
  try {
    const { areaId, areaName, startTime, endTime, latitude, longitude, note } = req.body;

    if (!startTime) return res.status(400).json({ message: "startTime required" });

    let lat = latitude != null ? Number(latitude) : undefined;
    let lon = longitude != null ? Number(longitude) : undefined;
    if (Number.isNaN(lat)) lat = undefined;
    if (Number.isNaN(lon)) lon = undefined;

    let areaDoc = null;
    let finalAreaName = areaName || null;
    let city = null;

    if (areaId && mongoose.isValidObjectId(areaId)) {
      areaDoc = await Area.findById(areaId);
      if (!areaDoc) return res.status(400).json({ message: "areaId not found" });
      finalAreaName = finalAreaName || areaDoc.name;
      city = areaDoc.city || city;
      if (!lat || !lon) {
        const [ALon, ALat] = areaDoc.location?.coordinates || [];
        if (ALat != null && ALon != null) { lat = ALat; lon = ALon; }
      }
    }

    if ((!lat || !lon) && finalAreaName) {
      const f = await forwardGeocode(`${finalAreaName}${city ? ", " + city : ""}`);
      if (f) { lat = f.lat; lon = f.lon; }
    }

    if (!lat || !lon) return res.status(400).json({ message: "valid lat & lng required or provide resolvable area" });

    if (!city) {
      try { const rev = await reverseGeocode(lat, lon); city = rev?.city || "Karachi"; } catch (_) { city = "Karachi"; }
    }

    const outage = new Outage({
      areaId: areaDoc?._id,
      areaName: finalAreaName || areaDoc?.name || "Unknown",
      city,
      location: { type: "Point", coordinates: [parseFloat(lon), parseFloat(lat)] },
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
      status: endTime ? "resolved" : "ongoing",
      reportedBy: req.userId,
      note
    });
    await outage.save();

    const populated = await Outage.findById(outage._id)
      .populate("reportedBy", "username email")
      .populate("areaId", "name city");

    res.status(201).json(populated);
  } catch (err) { next(err); }
};

// GET /api/outages/today (auth)
exports.getOutagesForUserArea = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("areaId");
    if (!user?.areaId) return res.status(400).json({ message: "User area not set" });

    const area = await Area.findById(user.areaId).select("name");
    if (!area) return res.status(400).json({ message: "User area not found" });

    const start = new Date(); start.setHours(0,0,0,0);
    const end   = new Date(); end.setHours(23,59,59,999);

    const items = await Outage.find({
      startTime: { $lt: end },
      $or: [{ endTime: null }, { endTime: { $gt: start } }],
      $or: [{ areaId: area._id }, { areaName: area.name }]
    })
      .populate("reportedBy", "username email")
      .populate("areaId", "name city")
      .sort({ startTime: 1 });

    res.json(items);
  } catch (err) { next(err); }
};

// GET /api/outages/nearby?lat=&lng=&maxDistance=&areaId=&areaName=
exports.getNearbyOutages = async (req, res, next) => {
  try {
    let { lat, lng, maxDistance = 5000, areaId, areaName } = req.query;

    // allow using areaId or areaName to resolve center point
    if ((!lat || !lng) && areaId && mongoose.isValidObjectId(areaId)) {
      const area = await Area.findById(areaId);
      const [lon, la] = area?.location?.coordinates || [];
      if (la != null && lon != null) { lat = la; lng = lon; }
    }
    if ((!lat || !lng) && areaName) {
      const a = await Area.findOne({ name: areaName });
      const [lon, la] = a?.location?.coordinates || [];
      if (la != null && lon != null) { lat = la; lng = lon; }
    }

    lat = Number(lat); lng = Number(lng); maxDistance = Number(maxDistance);
    if ([lat,lng,maxDistance].some(n => Number.isNaN(n))) {
      return res.status(400).json({ message: "lat,lng,maxDistance must be numbers or provide a valid areaId/areaName" });
    }

    const items = await Outage.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: maxDistance
        }
      }
    })
      .populate("reportedBy", "username email")
      .populate("areaId", "name city");

    res.json(items);
  } catch (err) { next(err); }
};

// GET /api/outages/area/:area (public)
exports.getOutagesByArea = async (req, res, next) => {
  try {
    const areaParam = req.params.area;
    const items = await Outage.find({
      $or: [
        { areaName: { $regex: `^${areaParam}$`, $options: "i" } },
        { areaName: { $regex: areaParam, $options: "i" } }
      ]
    })
      .populate("reportedBy", "username email")
      .populate("areaId", "name city")
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (err) { next(err); }
};