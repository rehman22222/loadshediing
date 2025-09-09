// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function auth(req, res, next) {
  try {
    // 1) extract token
    let token = null;
    if (req.headers && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (typeof req.header === "function" && req.header("x-auth-token")) {
      token = req.header("x-auth-token");
    } else if (req.cookies && req.cookies.token) { // optional: support cookies if you use them
      token = req.cookies.token;
    }

    if (!token || typeof token !== "string") {
      console.log("[auth] no token for", req.method, req.originalUrl);
      return res.status(401).json({ msg: "No token, authorization denied" });
    }

    // 2) ensure secret exists
    if (!process.env.JWT_SECRET) {
      console.error("[auth] JWT_SECRET is not set in environment");
      return res.status(500).json({ msg: "Server configuration error" });
    }

    // 3) verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.warn("[auth] token invalid:", err.message);
      return res.status(401).json({ msg: "Token is not valid" });
    }

    // 4) support multiple possible id fields in token
    const userId = decoded?.id || decoded?.userId || decoded?.sub;
    if (!userId) {
      console.warn("[auth] token payload missing user id");
      return res.status(401).json({ msg: "Token payload invalid" });
    }

    // 5) load user (omit password)
    const user = await User.findById(userId).select("-password");
    if (!user) {
      console.warn("[auth] user not found for id:", userId);
      return res.status(401).json({ msg: "User not found" });
    }

    // 6) attach to request
    req.userId = userId;
    req.user = user;

    next();
  } catch (err) {
    console.error("[auth] unexpected error:", err);
    // 500 because this is an unexpected server error
    return res.status(500).json({ msg: "Server error" });
  }
}

module.exports = auth;