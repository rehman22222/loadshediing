const Area = require("../models/Area");
const Outage = require("../models/Outage");
const { forwardGeocode } = require("../services/geocode");
const { normalizeName } = require("../utils/geo");

function comparableName(value) {
  return normalizeName(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

exports.getAreas = async (req, res) => {
  try {
    const { city, search, q } = req.query;
    const term = search || q;
    const query = {};

    if (city) {
      query.city = city;
    }

    if (term) {
      query.$or = [
        { name: { $regex: term, $options: "i" } },
        { normalizedName: { $regex: normalizeName(term).toLowerCase(), $options: "i" } },
      ];
    }

    const areas = await Area.find(query).limit(200).sort({ name: 1 }).lean();
    const outageCounts = await Outage.aggregate([
      { $match: { areaId: { $in: areas.map((area) => area._id) } } },
      { $group: { _id: "$areaId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(outageCounts.map((item) => [String(item._id), item.count]));
    const deduped = new Map();

    for (const area of areas) {
      const key = `${area.city || "Karachi"}:${comparableName(area.name)}`;
      const enriched = {
        ...area,
        outageCount: countMap.get(String(area._id)) || 0,
      };

      const current = deduped.get(key);
      if (
        !current ||
        enriched.outageCount > current.outageCount ||
        (enriched.outageCount === current.outageCount && enriched.name.length < current.name.length)
      ) {
        deduped.set(key, enriched);
      }
    }

    const items = Array.from(deduped.values()).sort((a, b) => {
      if (b.outageCount !== a.outageCount) {
        return b.outageCount - a.outageCount;
      }
      return a.name.localeCompare(b.name);
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getNearbyAreas = async (req, res) => {
  try {
    const { lat, lng, limit = 5, maxDistance = 8000 } = req.query;

    if (lat == null || lng == null) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const nearbyAreas = await Area.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number.parseFloat(lng), Number.parseFloat(lat)],
          },
          $maxDistance: Number.parseInt(maxDistance, 10),
        },
      },
    })
      .limit(Math.min(Number.parseInt(limit, 10) || 5, 10))
      .lean();

    const outageCounts = await Outage.aggregate([
      { $match: { areaId: { $in: nearbyAreas.map((area) => area._id) } } },
      { $group: { _id: "$areaId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(outageCounts.map((item) => [String(item._id), item.count]));

    res.json(
      nearbyAreas.map((area) => ({
        ...area,
        outageCount: countMap.get(String(area._id)) || 0,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createArea = async (req, res) => {
  try {
    const { name: rawName, city } = req.body;
    const name = normalizeName(rawName);

    if (!name) {
      return res.status(400).json({ error: "Area name is required" });
    }

    const existing = await Area.findOne({
      normalizedName: name.toLowerCase(),
    });

    if (existing) {
      return res.status(409).json({ error: "Area with this name already exists", area: existing });
    }

    const geocodeQuery = city ? `${name}, ${city}` : `${name}, Karachi`;
    const coords = await forwardGeocode(geocodeQuery);

    if (!coords) {
      return res.status(422).json({
        error: "Unable to geocode this area right now. Please verify the spelling or add coordinates manually in MongoDB.",
      });
    }

    const area = await Area.create({
      name,
      city: city || "Karachi",
      location: {
        type: "Point",
        coordinates: [coords.lon, coords.lat],
      },
      locationIqPlaceId: coords.placeId || null,
    });

    res.status(201).json(area);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Area with this name already exists" });
    }

    res.status(400).json({ error: err.message });
  }
};
