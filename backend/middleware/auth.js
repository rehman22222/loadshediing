// middleware/auth.js
const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  let token = null;

  // Prefer "Authorization: Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } 
  // Or check "x-auth-token"
  else if (req.header("x-auth-token")) {
    token = req.header("x-auth-token");
  }

  if (!token) {
    console.log("[auth] no token for", req.method, req.originalUrl);
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    console.log("[auth] token received (truncated):", token.slice(0, 8) + "..."); // { changed code }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // attach user id
    console.log("[auth] token valid, userId:", req.userId); // { changed code }
    next();
  } catch (err) {
    console.log("[auth] token invalid:", err.message); // { changed code }
    return res.status(400).json({ msg: "Token is not valid" });
  }
}

module.exports = auth;