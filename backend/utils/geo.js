// utils/geo.js
function hasValidCoords(geo) {
    if (!geo || geo.type !== "Point" || !Array.isArray(geo.coordinates)) return false;
    const [lng, lat] = geo.coordinates;
    return [lng, lat].every(n => typeof n === "number" && !Number.isNaN(n)) &&
           !(lng === 0 && lat === 0);
  }
  
  function normalizeName(s) {
    if (!s) return "";
    return s.replace(/\s+/g, " ").replace(/[^\S\r\n]+/g, " ").trim();
  }
  
  module.exports = { hasValidCoords, normalizeName };
  