// controllers/areaController.js
const Area = require("../models/Area");
const { forwardGeocode } = require("../services/geocode");
const { normalizeName } = require("../utils/geo");

exports.getAreas = async (req, res) => {
  try {
    const { city, search } = req.query;
    const query = {};
    
    if (city) query.city = city;
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const items = await Area.find(query)
      .limit(500)
      .sort({ name: 1 });
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
    
    let coords = null;
    try { 
      coords = await forwardGeocode(name + (city ? ", " + city : ", Karachi")); 
    } catch(e) { 
      console.log("Geocoding failed for", name, ":", e.message);
      coords = null; 
    }
    
    const area = new Area({
      name,
      city: city || "Karachi",
      location: coords ? { type: "Point", coordinates: [coords.lon, coords.lat] } : undefined,
      locationIqPlaceId: coords?.placeId,
      autoCreated: false
    });
    
    await area.save();
    res.status(201).json(area);
  } catch (err) { 
    if (err.code === 11000) {
      return res.status(400).json({ error: "Area with this name already exists" });
    }
    res.status(400).json({ error: err.message }); 
  }
};