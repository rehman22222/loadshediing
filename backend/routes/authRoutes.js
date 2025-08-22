// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
console.log("[authRoutes] module loaded");
// helper function to sign JWT
function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// ================== REGISTER ==================
router.post("/register", async (req, res) => {
  try {
    const { username, name, email, password } = req.body;

    const finalUsername = username || name; 
    if (!finalUsername || !email || !password) {
      return res
        .status(400)
        .json({ message: "username, email and password are required" });
    }

    // check if email already exists
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // save new user
    user = new User({
      username: finalUsername,
      email,
      password: hashedPassword,
    });
    await user.save();

    // sign token
    const token = signToken(user._id);

    return res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, username: user.username, email: user.email },
      token,
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ================== LOGIN ==================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "email and password are required" });

    // check user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // sign token
    const token = signToken(user._id);

    return res.json({
      message: "Login successful",
      user: { id: user._id, username: user.username, email: user.email },
      token,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ================== PROFILE (Protected) ==================
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    console.error("PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
// PUT /api/auth/profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { username, email, password } = req.body; // fields user can update
    const updateFields = {};

    if (username) updateFields.username = username;
    if (email) updateFields.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateFields },
      { new: true } // return updated user
    ).select("-password"); // exclude password in response

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("PROFILE UPDATE ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;