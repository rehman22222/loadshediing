// services/geocode.js
const axios = require("axios");
const BASE = "https://us1.locationiq.com/v1";
const KEY = process.env.LOCATIONIQ_API_KEY || process.env.LOCATIONIQ_KEY || process.env.LOCATIONIQ;
if (!KEY) {
  console.warn("[geocode] LOCATIONIQ key missing. Set LOCATIONIQ_API_KEY in .env for geocoding.");
}

// in-memory cache for this process (mild, reset on restart)
const _cache = new Map();

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function _request(url, params, retries = 2) {
  if (!KEY) throw new Error("LOCATIONIQ_API_KEY not set in env");
  try {
    const res = await axios.get(url, { params: { key: KEY, format: "json", ...params }, timeout: 10000 });
    return res.data;
  } catch (err) {
    if (retries > 0) {
      await sleep(300 + (2 - retries) * 200);
      return _request(url, params, retries - 1);
    }
    const resp = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(resp);
  }
}

async function forwardGeocode(query) {
  if (!query) return null;
  const key = `f:${query.toLowerCase()}`;
  if (_cache.has(key)) return _cache.get(key);

  const out = await _request(`${BASE}/search.php`, { q: query, limit: 1 });
  if (!out || out.length === 0) return null;
  const top = out[0];
  const result = { lat: parseFloat(top.lat), lon: parseFloat(top.lon), placeId: top.place_id };
  _cache.set(key, result);
  // small delay to reduce hitting rate limits when called in loops
  await sleep(150);
  return result;
}

async function reverseGeocode(lat, lon) {
  if (lat == null || lon == null) return null;
  const key = `r:${lat.toFixed(6)}:${lon.toFixed(6)}`;
  if (_cache.has(key)) return _cache.get(key);

  const data = await _request(`${BASE}/reverse.php`, { lat, lon });
  const addr = data.address || {};
  const city = addr.city || addr.town || addr.village || addr.county || null;
  const result = { city, placeId: data.place_id, lat: parseFloat(data.lat), lon: parseFloat(data.lon) };
  _cache.set(key, result);
  await sleep(150);
  return result;
}

module.exports = { forwardGeocode, reverseGeocode };
