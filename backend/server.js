const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
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
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const API_PREFIX = "/api";

const corsOptions = {
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",").map((item) => item.trim()) : true,
  credentials: true,
};

app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
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

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

async function start() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set in backend/.env");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("MongoDB connected");
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
