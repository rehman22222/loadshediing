const Area = require("../models/Area");
const { forwardGeocode } = require("../services/geocode");
const { normalizeName } = require("../utils/geo");

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

    const items = await Area.find(query).limit(100).sort({ name: 1 });
    res.json(items);
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
