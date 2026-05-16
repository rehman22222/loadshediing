const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const outageRoutes = require("./routes/outageRoutes");
const areaRoutes = require("./routes/areaRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const iapRoutes = require("./routes/iapRoutes");
const adminRoutes = require("./routes/adminRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const errorHandler = require("./middleware/errorHandler");
const { ensureAdminAccount } = require("./utils/bootstrapAdmin");
const { connectMongoose } = require("./utils/dbConnection");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const API_PREFIX = "/api";
const ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "bypass-tunnel-reminder",
  "x-pinggy-no-interstitial",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }

  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", ALLOWED_HEADERS.join(", "));
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Loadshedding Tracker API is running",
  });
});

app.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/outages`, outageRoutes);
app.use(`${API_PREFIX}/areas`, areaRoutes);
app.use(`${API_PREFIX}/feedback`, feedbackRoutes);
app.use(`${API_PREFIX}/iap`, iapRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

async function start() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }

  await connectMongoose({
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`MongoDB connected: ${mongoose.connection.db.databaseName}`);
  const adminInfo = await ensureAdminAccount();
  console.log(`Admin account ready: ${adminInfo.email}`);
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
