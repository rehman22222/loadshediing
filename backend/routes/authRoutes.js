// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const mongoose = require("mongoose");

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function serializeUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    areaId: user.areaId || null,
  };
}

// REGISTER (areaId optional now)
router.post("/register", async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    const finalUsername = username || name;
    if (!finalUsername || !email || !password) {
      return res.status(400).json({ message: "username, email and password are required" });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User with this email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ username: finalUsername, email, password: hashedPassword });
    await user.save();

    const token = signToken(user._id);
    return res.status(201).json({
      message: "User registered successfully",
      user: serializeUser(user),
      token
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = signToken(user._id);
    return res.json({
      message: "Login successful",
      user: serializeUser(user),
      token
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PROFILE (GET)
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("-password")
      .populate("areaId", "name city");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("-password")
      .populate("areaId", "name city");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PROFILE (PUT)
router.put("/profile", auth, async (req, res) => {
  try {
    const { username, email, password, areaId } = req.body;
    const updateFields = {};

    if (username) updateFields.username = username;
    if (email) updateFields.email = email;
    if (areaId && mongoose.isValidObjectId(areaId)) updateFields.areaId = areaId;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateFields },
      { new: true }
    ).select("-password").populate("areaId", "name city");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// UPDATE AREA (separate, simple body: { areaId })
// add this, below PUT /profile
router.put("/update-area", auth, async (req, res) => {
  try {
    const { areaId } = req.body;
    if (!areaId) return res.status(400).json({ msg: "areaId is required" });

    const user = await User.findByIdAndUpdate(
      req.userId,
      { areaId },
      { new: true }
    ).select("-password");

    res.json({ msg: "Area updated successfully", user });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

module.exports = router;
