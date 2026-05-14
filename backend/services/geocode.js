const axios = require("axios");

const LOCATIONIQ_BASE = "https://us1.locationiq.com/v1";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

const _cache = new Map();
let _preferredLocationIqKeyIndex = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getLocationIqKeys() {
  const rawValues = [
    ...(process.env.LOCATIONIQ_API_KEYS || "")
      .split(",")
      .map((item) => item.trim()),
    process.env.LOCATIONIQ_API_KEY_1,
    process.env.LOCATIONIQ_API_KEY,
    process.env.LOCATIONIQ_KEY,
    process.env.LOCATIONIQ,
    process.env.LOCATIONIQ_API_KEY_2,
    process.env.LOCATIONIQ_SECONDARY_API_KEY,
    process.env.LOCATIONIQ_API_KEY_3,
  ];

  return [...new Set(rawValues.filter(Boolean))];
}

function getOrderedLocationIqKeys() {
  const keys = getLocationIqKeys();
  if (keys.length <= 1) {
    return keys.map((key, index) => ({ key, index }));
  }

  const startIndex = Math.min(_preferredLocationIqKeyIndex, keys.length - 1);
  const ordered = [];

  for (let offset = 0; offset < keys.length; offset += 1) {
    const index = (startIndex + offset) % keys.length;
    ordered.push({ key: keys[index], index });
  }

  return ordered;
}

function shouldRetryLocationIq(error) {
  const status = error?.response?.status;
  return !status || status >= 500 || status === 408;
}

function formatLocationIqError(error, keyIndex) {
  const status = error?.response?.status;
  const detail = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
  return `key ${keyIndex + 1}${status ? ` (HTTP ${status})` : ""}: ${detail}`;
}

async function requestLocationIqWithKey(key, keyIndex, endpoint, params, retries = 2) {
  try {
    const res = await axios.get(`${LOCATIONIQ_BASE}${endpoint}`, {
      params: { key, format: "json", ...params },
      timeout: 10000,
    });

    _preferredLocationIqKeyIndex = keyIndex;
    return res.data;
  } catch (err) {
    if (retries > 0 && shouldRetryLocationIq(err)) {
      await sleep(300 + (2 - retries) * 200);
      return requestLocationIqWithKey(key, keyIndex, endpoint, params, retries - 1);
    }

    throw new Error(formatLocationIqError(err, keyIndex));
  }
}

async function requestLocationIq(endpoint, params, retries = 2) {
  const orderedKeys = getOrderedLocationIqKeys();
  if (!orderedKeys.length) {
    throw new Error("No LocationIQ API keys configured in env");
  }

  const failures = [];

  for (const { key, index } of orderedKeys) {
    try {
      return await requestLocationIqWithKey(key, index, endpoint, params, retries);
    } catch (error) {
      failures.push(error.message);
    }
  }

  throw new Error(`LocationIQ request failed for all configured keys: ${failures.join(" | ")}`);
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

  if (getLocationIqKeys().length > 0) {
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

  if (getLocationIqKeys().length > 0) {
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
