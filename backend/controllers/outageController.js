const { DateTime } = require("luxon");
const Outage = require("../models/Outage");
const Area = require("../models/Area");
const { reverseGeocode, forwardGeocode } = require("../services/geocode");
const { hasValidCoords, normalizeName } = require("../utils/geo");

const SCHEDULE_TIMEZONE = process.env.SCHEDULE_TIMEZONE || "Asia/Karachi";
const PDF_SEQUENCE_ROTATE_BEFORE_MINUTES = 6 * 60;

function computeStatus(outage) {
  const now = Date.now();
  const startTime = outage.startTime ? new Date(outage.startTime).getTime() : null;
  const endTime = outage.endTime ? new Date(outage.endTime).getTime() : null;

  if (outage.status === "resolved") {
    return "completed";
  }

  if (startTime && startTime > now) {
    return "scheduled";
  }

  if (endTime && endTime <= now) {
    return "completed";
  }

  return "ongoing";
}

function serializeOutage(outageDoc) {
  const outage = outageDoc.toObject ? outageDoc.toObject() : outageDoc;
  const coords = outage.location?.coordinates || [];

  return {
    ...outage,
    status: computeStatus(outage),
    feeder: outage.feeder || null,
    location: coords.length === 2 ? { lng: coords[0], lat: coords[1] } : null,
  };
}

function getMinutesSinceMidnight(dateValue) {
  const dt = DateTime.fromJSDate(new Date(dateValue), { zone: SCHEDULE_TIMEZONE });
  return dt.hour * 60 + dt.minute;
}

function buildRoutineKey(outage) {
  const startMinutes = getMinutesSinceMidnight(outage.startTime);
  const endMinutes = outage.endTime ? getMinutesSinceMidnight(outage.endTime) : startMinutes;
  return `${outage.areaId}_${startMinutes}_${endMinutes}`;
}

function sortByClockTime(items) {
  return [...items].sort(
    (a, b) => getMinutesSinceMidnight(a.startTime) - getMinutesSinceMidnight(b.startTime)
  );
}

function sortByPdfSequence(items) {
  const sorted = sortByClockTime(items);
  const earlyMorning = sorted.filter(
    (item) => getMinutesSinceMidnight(item.startTime) < PDF_SEQUENCE_ROTATE_BEFORE_MINUTES
  );

  if (!earlyMorning.length || earlyMorning.length === sorted.length) {
    return sorted;
  }

  const regularDay = sorted.filter(
    (item) => getMinutesSinceMidnight(item.startTime) >= PDF_SEQUENCE_ROTATE_BEFORE_MINUTES
  );

  return [...regularDay, ...earlyMorning];
}

function materializeRoutineOutage(template, targetDayOffset = 0) {
  const baseDay = DateTime.now().setZone(SCHEDULE_TIMEZONE).startOf("day").plus({ days: targetDayOffset });
  const startTemplate = DateTime.fromJSDate(new Date(template.startTime), { zone: SCHEDULE_TIMEZONE });
  const endTemplate = template.endTime
    ? DateTime.fromJSDate(new Date(template.endTime), { zone: SCHEDULE_TIMEZONE })
    : null;

  let start = baseDay.set({
    hour: startTemplate.hour,
    minute: startTemplate.minute,
    second: startTemplate.second,
    millisecond: startTemplate.millisecond,
  });

  let end = endTemplate
    ? baseDay.set({
        hour: endTemplate.hour,
        minute: endTemplate.minute,
        second: endTemplate.second,
        millisecond: endTemplate.millisecond,
      })
    : null;

  if (end && end < start) {
    end = end.plus({ days: 1 });
  }

  return {
    ...template,
    _id: `${template._id}-${baseDay.toISODate()}`,
    startTime: start.toUTC().toISO(),
    endTime: end ? end.toUTC().toISO() : undefined,
    routineSourceId: template._id,
    routineDate: baseDay.toISODate(),
  };
}

async function getRoutineTemplatesForArea(areaId) {
  const items = await Outage.find({ areaId })
    .populate("reportedBy", "username email")
    .populate("areaId", "name city")
    .sort({ startTime: -1, createdAt: -1 })
    .lean();

  const unique = new Map();
  for (const item of items) {
    const key = buildRoutineKey(item);
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return sortByClockTime(Array.from(unique.values()));
}

async function buildRoutineScheduleForArea(areaId, options = {}) {
  const {
    includeToday = true,
    includeTomorrow = false,
    filterFutureFromNow = false,
    sortMode = "chronological",
  } = options;

  const templates = await getRoutineTemplatesForArea(areaId);
  const now = DateTime.now().setZone(SCHEDULE_TIMEZONE);
  const instances = [];

  if (includeToday) {
    instances.push(...templates.map((template) => materializeRoutineOutage(template, 0)));
  }

  if (includeTomorrow) {
    instances.push(...templates.map((template) => materializeRoutineOutage(template, 1)));
  }

  const filtered = filterFutureFromNow
    ? instances.filter((item) => {
        const end = item.endTime
          ? DateTime.fromISO(item.endTime, { zone: "utc" }).setZone(SCHEDULE_TIMEZONE)
          : DateTime.fromISO(item.startTime, { zone: "utc" }).setZone(SCHEDULE_TIMEZONE);
        return end >= now;
      })
    : instances;

  const ordered =
    sortMode === "pdf-sequence" && includeToday && !includeTomorrow
      ? sortByPdfSequence(filtered)
      : filtered.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return ordered.map(serializeOutage);
}

async function ensureArea({ area, city, latitude, longitude }) {
  const normalized = normalizeName(area).toLowerCase();
  let areaDoc = await Area.findOne({ normalizedName: normalized });

  if (areaDoc) {
    return areaDoc;
  }

  let coords = null;
  if (latitude != null && longitude != null) {
    coords = {
      lat: Number.parseFloat(latitude),
      lon: Number.parseFloat(longitude),
      placeId: null,
    };
  } else {
    coords = await forwardGeocode(city ? `${area}, ${city}` : `${area}, Karachi`);
  }

  if (!coords) {
    return null;
  }

  areaDoc = await Area.create({
    name: normalizeName(area),
    city: city || "Karachi",
    location: {
      type: "Point",
      coordinates: [coords.lon, coords.lat],
    },
    locationIqPlaceId: coords.placeId || null,
  });

  return areaDoc;
}

exports.createOutage = async (req, res) => {
  try {
    const {
      area: rawArea,
      location,
      startTime,
      endTime,
      latitude,
      longitude,
      description,
      note,
      city,
    } = req.body;

    const area = normalizeName(rawArea || location);
    let lat = latitude != null ? Number.parseFloat(latitude) : null;
    let lon = longitude != null ? Number.parseFloat(longitude) : null;
    let inferredCity = city || "Karachi";

    if (!area && (lat == null || lon == null)) {
      return res.status(400).json({ message: "Provide an area name or coordinates" });
    }

    let areaDoc = null;

    if (area) {
      areaDoc = await ensureArea({ area, city: inferredCity, latitude: lat, longitude: lon });
    }

    if (!areaDoc && lat != null && lon != null) {
      const reverse = await reverseGeocode(lat, lon);
      inferredCity = reverse?.city || inferredCity;
      const fallbackAreaName = normalizeName(area || reverse?.displayName || "Unknown Area");
      areaDoc = await ensureArea({
        area: fallbackAreaName,
        city: inferredCity,
        latitude: lat,
        longitude: lon,
      });
    }

    if (!areaDoc) {
      return res.status(422).json({
        message: "Unable to match or create an area for this outage",
      });
    }

    if ((lat == null || lon == null) && hasValidCoords(areaDoc.location)) {
      lon = areaDoc.location.coordinates[0];
      lat = areaDoc.location.coordinates[1];
    }

    if (lat == null || lon == null) {
      return res.status(422).json({ message: "Valid coordinates are required for outages" });
    }

    const outage = await Outage.create({
      area: areaDoc.name,
      areaId: areaDoc._id,
      city: areaDoc.city || inferredCity,
      location: {
        type: "Point",
        coordinates: [lon, lat],
      },
      locationIqPlaceId: areaDoc.locationIqPlaceId || null,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : undefined,
      reportedBy: req.userId,
      note: note || description || "",
    });

    const populated = await Outage.findById(outage._id)
      .populate("reportedBy", "username email")
      .populate("areaId", "name city");

    res.status(201).json(serializeOutage(populated));
  } catch (err) {
    console.error("createOutage error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllOutages = async (req, res) => {
  try {
    const page = Math.max(0, Number.parseInt(req.query.page || "0", 10));
    const limit = Math.min(200, Number.parseInt(req.query.limit || "100", 10));
    const filter = {};

    if (req.query.area) {
      filter.area = new RegExp(req.query.area, "i");
    }

    if (req.query.city) {
      filter.city = new RegExp(`^${req.query.city}$`, "i");
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.from || req.query.to) {
      filter.startTime = {};

      if (req.query.from) {
        filter.startTime.$gte = new Date(req.query.from);
      }

      if (req.query.to) {
        const toDate = new Date(req.query.to);
        toDate.setHours(23, 59, 59, 999);
        filter.startTime.$lte = toDate;
      }
    }

    const [items, total] = await Promise.all([
      Outage.find(filter)
        .populate("reportedBy", "username email")
        .populate("areaId", "name city")
        .sort({ startTime: 1 })
        .skip(page * limit)
        .limit(limit),
      Outage.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      total,
      page,
      limit,
      data: items.map(serializeOutage),
    });
  } catch (err) {
    console.error("getAllOutages error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};

exports.getUpcomingOutages = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!req.user.areaId) {
      return res.status(400).json({
        message: "User area not set. Please choose your area from the profile page.",
      });
    }

    const items = await buildRoutineScheduleForArea(req.user.areaId, {
      includeToday: true,
      includeTomorrow: true,
      filterFutureFromNow: true,
    });

    res.json(items);
  } catch (err) {
    console.error("getUpcomingOutages error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getOutagesForUserArea = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!req.user.areaId) {
      return res.status(400).json({
        message: "User area not set. Please choose your area from the profile page.",
      });
    }

    const items = await buildRoutineScheduleForArea(req.user.areaId, {
      includeToday: true,
      includeTomorrow: false,
      filterFutureFromNow: false,
      sortMode: "pdf-sequence",
    });

    res.json(items);
  } catch (err) {
    console.error("getOutagesForUserArea error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getNearbyOutages = async (req, res) => {
  try {
    const { lat, lng, maxDistance = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    const items = await Outage.find({
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
      .populate("reportedBy", "username email")
      .populate("areaId", "name city")
      .limit(100);

    res.json(items.map(serializeOutage));
  } catch (err) {
    console.error("getNearbyOutages error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getOutagesByArea = async (req, res) => {
  try {
    const areaName = normalizeName(req.params.area);
    const items = await Outage.find({
      area: new RegExp(`^${areaName}$`, "i"),
    })
      .populate("reportedBy", "username email")
      .populate("areaId", "name city")
      .sort({ startTime: -1 });

    res.json(items.map(serializeOutage));
  } catch (err) {
    console.error("getOutagesByArea error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getOutagesByCity = async (req, res) => {
  try {
    const city = normalizeName(req.params.city);
    const items = await Outage.find({
      city: new RegExp(`^${city}$`, "i"),
    })
      .populate("reportedBy", "username email")
      .populate("areaId", "name city")
      .sort({ startTime: 1 })
      .limit(200);

    res.json(items.map(serializeOutage));
  } catch (err) {
    console.error("getOutagesByCity error:", err);
    res.status(500).json({ error: err.message });
  }
};
