const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Import route files
const authRoutes = require("./routes/authRoutes");
const outageRoutes = require("./routes/outageRoutes");
const app = express();
app.use(express.json());
app.use(cors());

// Default route
app.get("/", (req, res) => res.send("Server is running 🚀"));

// Auth routes
console.log("[server] mounting /api/auth"); // { changed code }
app.use("/api/auth", authRoutes);

// Outage routes
console.log("[server] mounting /api/outages");
app.use("/api/outages", outageRoutes);
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);


const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));