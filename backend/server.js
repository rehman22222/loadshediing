const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// route imports
const authRoutes = require("./routes/authRoutes");
const outageRoutes = require("./routes/outageRoutes");
const areaRoutes = require("./routes/areaRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const iapRoutes = require("./routes/iapRoutes");

// middleware
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use(express.urlencoded({ extended: true }));

// default route
app.get("/", (req, res) => res.send("Server is running 🚀"));

// mount routes
app.use("/api/auth", authRoutes);
app.use("/api/outages", outageRoutes);
app.use("/api/areas", areaRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/iap", iapRoutes);

// error handler (last)
app.use(errorHandler);

// connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));
