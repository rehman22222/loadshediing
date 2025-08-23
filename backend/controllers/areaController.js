// controllers/areaController.js
const Area = require("../models/Area");
const { forwardGeocode } = require("../services/geocode");

exports.getAreas = async (req, res, next) => {
  try {
    const { q } = req.query;
    const filter = q ? { name: { $regex: q, $options: "i" } } : {};
    const items = await Area.find(filter).limit(100).lean();
    res.json(items);
  } catch (err) { next(err); }
};

exports.getAreaById = async (req, res, next) => {
  try {
    const area = await Area.findById(req.params.id).lean();
    if (!area) return res.status(404).json({ message: "Area not found" });
    res.json(area);
  } catch (err) { next(err); }
};

exports.createArea = async (req, res, next) => {
  try {
    const { name, city } = req.body;
    if (!name) return res.status(400).json({ message: "name required" });

    const exists = await Area.findOne({ name });
    if (exists) return res.status(409).json({ message: "Area already exists" });

    let coords = null;
    try { coords = await forwardGeocode(name + (city ? ", " + city : "")); } catch(e){ coords = null; }
    const area = new Area({
      name,
      city: city || "Karachi",
      location: coords ? { type: "Point", coordinates: [coords.lon, coords.lat] } : undefined,
      locationIqPlaceId: coords?.placeId
    });
    await area.save();
    res.status(201).json(area);
  } catch (err) { next(err); }
};

