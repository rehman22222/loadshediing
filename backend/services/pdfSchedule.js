// services/pdfSchedule.js
const fs = require("fs");
const pdfParse = require("pdf-parse");

/**
 * Convert "0935~1105" style string into start & end Date objects
 * @param {string} timeStr 
 * @param {string} dateISO - YYYY-MM-DD
 */
function parseCycle(timeStr, dateISO) {
  const parts = timeStr.split("~").map(p => p.trim());
  if (parts.length !== 2) return null;

  const startStr = parts[0];
  const endStr = parts[1];

  const start = new Date(dateISO);
  start.setHours(parseInt(startStr.substring(0,2)), parseInt(startStr.substring(2,4)), 0, 0);

  const end = new Date(dateISO);
  end.setHours(parseInt(endStr.substring(0,2)), parseInt(endStr.substring(2,4)), 0, 0);

  // handle overnight (end < start)
  if (end < start) end.setDate(end.getDate() + 1);

  return { startTime: start, endTime: end };
}

/**
 * Parse Load-Shedding PDF in table format like:
 * "33/E Korangi Town 0935~1105 1305~1435 1605~1735 2235~0005"
 */
async function parseSchedulePdf(filePath, forcedDate = null) {
  if (!fs.existsSync(filePath)) throw new Error("PDF file not found: " + filePath);
  const dataBuffer = fs.readFileSync(filePath);
  const parsed = await pdfParse(dataBuffer);
  const text = parsed.text.replace(/\r/g, "");

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Detect date from PDF or use forcedDate
  let dateISO = forcedDate;
  if (!dateISO) {
    const dateMatch = text.match(/(\d{1,2})[-\s](January|February|March|April|May|June|July|August|September|October|November|December)[-\s](\d{4})/i);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2,'0');
      const monthNames = {
        january: "01", february: "02", march: "03", april: "04",
        may: "05", june: "06", july: "07", august: "08",
        september: "09", october: "10", november: "11", december: "12"
      };
      const month = monthNames[dateMatch[2].toLowerCase()];
      const year = dateMatch[3];
      dateISO = `${year}-${month}-${day}`;
    } else {
      const now = new Date();
      dateISO = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    }
  }

  const items = [];

  for (let line of lines) {
    // Skip header lines
    if (/Feeder Name/i.test(line)) continue;

    // Match all cycles in format 0935~1105
    const cycleMatches = line.match(/\d{3,4}~\d{3,4}/g);
    if (!cycleMatches || cycleMatches.length === 0) continue;

    // Everything before first cycle is area/feeder name
    const firstCycleIndex = line.indexOf(cycleMatches[0]);
    const area = line.substring(0, firstCycleIndex).trim();

    for (const cycleStr of cycleMatches) {
      const cycle = parseCycle(cycleStr, dateISO);
      if (!cycle) continue;

      items.push({
        area,
        startTime: cycle.startTime,
        endTime: cycle.endTime
      });
    }
  }

  return { dateISO, items };
}

module.exports = { parseSchedulePdf };