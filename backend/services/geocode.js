const axios = require("axios");

const LOCATIONIQ_BASE = "https://us1.locationiq.com/v1";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const LOCATIONIQ_KEY =
  process.env.LOCATIONIQ_API_KEY || process.env.LOCATIONIQ_KEY || process.env.LOCATIONIQ;

const _cache = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestLocationIq(endpoint, params, retries = 2) {
  if (!LOCATIONIQ_KEY) {
    throw new Error("LOCATIONIQ_API_KEY not set in env");
  }

  try {
    const res = await axios.get(`${LOCATIONIQ_BASE}${endpoint}`, {
      params: { key: LOCATIONIQ_KEY, format: "json", ...params },
      timeout: 10000,
    });
    return res.data;
  } catch (err) {
    if (retries > 0) {
      await sleep(300 + (2 - retries) * 200);
      return requestLocationIq(endpoint, params, retries - 1);
    }

    const detail = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(detail);
  }
}

async function requestNominatim(path, params) {
  const res = await axios.get(`${NOMINATIM_BASE}${path}`, {
    params: {
      format: "jsonv2",
      addressdetails: 1,
      ...params,
    },
    timeout: 10000,
    headers: {
      "User-Agent": "loadshedding-tracker/1.0",
    },
  });

  return res.data;
}

async function forwardGeocode(query) {
  if (!query) return null;

  const cacheKey = `f:${query.toLowerCase()}`;
  if (_cache.has(cacheKey)) {
    return _cache.get(cacheKey);
  }

  let result = null;

  if (LOCATIONIQ_KEY) {
    const out = await requestLocationIq("/search.php", { q: query, limit: 1 });
    if (Array.isArray(out) && out.length > 0) {
      const top = out[0];
      result = {
        lat: Number.parseFloat(top.lat),
        lon: Number.parseFloat(top.lon),
        placeId: top.place_id ? String(top.place_id) : null,
        source: "locationiq",
      };
    }
  }

  if (!result) {
    const out = await requestNominatim("/search", { q: query, limit: 1 });
    if (Array.isArray(out) && out.length > 0) {
      const top = out[0];
      result = {
        lat: Number.parseFloat(top.lat),
        lon: Number.parseFloat(top.lon),
        placeId: top.place_id ? String(top.place_id) : null,
        source: "nominatim",
      };
    }
  }

  if (result) {
    _cache.set(cacheKey, result);
    await sleep(150);
  }

  return result;
}

async function reverseGeocode(lat, lon) {
  if (lat == null || lon == null) return null;

  const cacheKey = `r:${Number(lat).toFixed(6)}:${Number(lon).toFixed(6)}`;
  if (_cache.has(cacheKey)) {
    return _cache.get(cacheKey);
  }

  let result = null;

  if (LOCATIONIQ_KEY) {
    const data = await requestLocationIq("/reverse.php", { lat, lon });
    const addr = data.address || {};
    result = {
      city: addr.city || addr.town || addr.village || addr.county || null,
      displayName: data.display_name || null,
      placeId: data.place_id ? String(data.place_id) : null,
      lat: Number.parseFloat(data.lat),
      lon: Number.parseFloat(data.lon),
      source: "locationiq",
    };
  }

  if (!result) {
    const data = await requestNominatim("/reverse", { lat, lon });
    const addr = data.address || {};
    result = {
      city: addr.city || addr.town || addr.village || addr.county || null,
      displayName: data.display_name || null,
      placeId: data.place_id ? String(data.place_id) : null,
      lat: Number.parseFloat(data.lat),
      lon: Number.parseFloat(data.lon),
      source: "nominatim",
    };
  }

  _cache.set(cacheKey, result);
  await sleep(150);
  return result;
}

module.exports = { forwardGeocode, reverseGeocode };
