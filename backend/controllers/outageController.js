// controllers/outageController.js
const Outage = require("../models/Outage");
const Area = require("../models/Area");
const { reverseGeocode, forwardGeocode } = require("../services/geocode");
const { hasValidCoords, normalizeName } = require("../utils/geo");

/**
 * GET /api/outages (public)
 * Fetch all outages
 */
// inside controllers/outageController.js (replace createOutage)
exports.createOutage = async (req, res) => {
  try {
    const { area, startTime, endTime, latitude, longitude, note } = req.body;
    if (!area && (!latitude || !longitude)) {
      return res.status(400).json({ message: "area or lat/lon required" });
    }

    // Normalize area for lookup
    const normalized = area ? area.trim().toLowerCase() : null;
    let areaDoc = null;
    if (normalized) {
      areaDoc = await Area.findOne({ normalizedName: normalized });
      if (!areaDoc) {
        // try geocode then create area
        let coords = null;
        try {
          const geo = await forwardGeocode(`${area}, Karachi`);
          if (geo) coords = { type: "Point", coordinates: [geo.lon, geo.lat] };
        } catch(e) {}
        areaDoc = new Area({
          name: area,
          normalizedName: normalized,
          city: "Karachi",
          location: coords || { type: "Point", coordinates: [0,0] },
          locationIqPlaceId: null
        });
        await areaDoc.save();
      }
    }

    let lat = latitude, lon = longitude;
    if ((!lat || !lon) && areaDoc && hasValidCoords(areaDoc.location)) {
      lon = areaDoc.location.coordinates[0];
      lat = areaDoc.location.coordinates[1];
    }

    // if still missing -> attempt forward geocode
    if ((!lat || !lon) && area) {
      try {
        const geo = await forwardGeocode(`${area}, Karachi`);
        if (geo) { lat = geo.lat; lon = geo.lon; }
      } catch(e) {}
    }

    if (!lat || !lon) return res.status(400).json({ message: "Coordinates required or area not found" });

    const outage = new Outage({
      area: area || areaDoc?.name || "Unknown Area",
      areaId: areaDoc?._id || null,
      city: areaDoc?.city || "Karachi",
      location: { type: "Point", coordinates: [parseFloat(lon), parseFloat(lat)] },
      locationIqPlaceId: areaDoc?.locationIqPlaceId || null,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
      reportedBy: req.userId,
      note,
    });

    await outage.save();
    const populated = await outage.populate("reportedBy", "username email");
    res.status(201).json(populated);
  } catch (err) {
    console.error("createOutage error:", err);
    res.status(500).json({ error: err.message });
  }
};
/**
 * GET /api/outages (public)
 * Fetch all outages with optional filters: ?page=&limit=&area=&status=
 */
exports.getAllOutages = async (req, res) => {
  try {
    // pagination
    const page = Math.max(0, parseInt(req.query.page || '0', 10));
    const limit = Math.min(200, parseInt(req.query.limit || '100', 10));

    // build filter
    const filter = {};
    if (req.query.area) {
      // case-insensitive partial match
      filter.area = new RegExp(req.query.area, 'i');
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    // optional date range filter: ?from=2025-06-26&to=2025-06-26 (ISO yyyy-mm-dd)
    if (req.query.from || req.query.to) {
      filter.startTime = {};
      if (req.query.from) filter.startTime.$gte = new Date(req.query.from);
      if (req.query.to) {
        // make end of day if only date provided
        const toDate = new Date(req.query.to);
        toDate.setHours(23,59,59,999);
        filter.startTime.$lte = toDate;
      }
    }

    // query DB
    const [items, total] = await Promise.all([
      Outage.find(filter)
        .populate('reportedBy', 'username email')
        .populate('areaId', 'name city')
        .sort({ startTime: -1 })
        .skip(page * limit)
        .limit(limit),
      Outage.countDocuments(filter)
    ]);

    res.json({ ok: true, total, page, limit, data: items });
  } catch (err) {
    console.error('getAllOutages error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};


/**
 * GET /api/outages/today (auth required)
 * Fetch today's outages for the user's area
 */
exports.getOutagesForUserArea = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "User not found" });

    if (!user.areaId) {
      return res.status(400).json({ message: "User area not set. Please set your area in profile." });
    }

    const start = new Date(); 
    start.setHours(0, 0, 0, 0);
    const end = new Date(); 
    end.setHours(23, 59, 59, 999);

    const query = {
      areaId: user.areaId,
      startTime: { $lt: end },
      $or: [
        { endTime: { $exists: false } }, 
        { endTime: { $gt: start } }
      ]
    };

    const items = await Outage.find(query)
      .populate("reportedBy", "username email")
      .populate("areaId", "name city")
      .limit(200)
      .sort({ startTime: -1 });

    res.json(items);
  } catch (err) {
    console.error("getOutagesForUserArea error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/outages/nearby?lat=&lng=&maxDistance=5000 (premium)
 * Fetch outages within a radius
 */
exports.getNearbyOutages = async (req, res) => {
  try {
    const { lat, lng, maxDistance = 5000 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: "lat & lng required" });
    }

    const items = await Outage.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(maxDistance),
        },
      },
    })
    .populate("reportedBy", "username email")
    .populate("areaId", "name city")
    .limit(100);

    res.json(items);
  } catch (err) {
    console.error("getNearbyOutages error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/outages/area/:area (public)
 * Fetch outages by area name
 */
exports.getOutagesByArea = async (req, res) => {
  try {
    const areaName = req.params.area;
    const items = await Outage.find({ area: areaName })
      .populate("reportedBy", "username email")
      .populate("areaId", "name city")
      .sort({ startTime: -1 });
    res.json(items);
  } catch (err) {
    console.error("getOutagesByArea error:", err);
    res.status(500).json({ error: err.message });
  }
};