// backend/services/geocode.js
const axios = require("axios");
const BASE = "https://us1.locationiq.com/v1";
const KEY = process.env.LOCATIONIQ_API_KEY || process.env.LOCATIONIQ_KEY || process.env.LOCATIONIQ; // support common names

async function reverseGeocode(lat, lon) {
  if (!KEY) throw new Error("LOCATIONIQ_API_KEY not set in env");
  try {
    const res = await axios.get(`${BASE}/reverse.php`, {
      params: { key: KEY, lat, lon, format: "json" },
      timeout: 10000
    });
    const addr = res.data.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || null;
    return { city, placeId: res.data.place_id, lat: parseFloat(res.data.lat), lon: parseFloat(res.data.lon) };
  } catch (err) {
    const resp = err?.response?.data ? JSON.stringify(err.response.data) : "";
    throw new Error("reverseGeocode error: " + (err.message || "") + " " + resp);
  }
}

async function forwardGeocode(query) {
  if (!KEY) throw new Error("LOCATIONIQ_API_KEY not set in env");
  try {
    const res = await axios.get(`${BASE}/search.php`, {
      params: { key: KEY, q: query, format: "json", limit: 1 },
      timeout: 10000
    });
    if (!res.data || res.data.length === 0) return null;
    const top = res.data[0];
    return { lat: parseFloat(top.lat), lon: parseFloat(top.lon), placeId: top.place_id };
  } catch (err) {
    const resp = err?.response?.data ? JSON.stringify(err.response.data) : "";
    throw new Error("forwardGeocode error: " + (err.message || "") + " " + resp);
  }
}

module.exports = { forwardGeocode, reverseGeocode };