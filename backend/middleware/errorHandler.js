// middleware/errorHandler.js
module.exports = (err, req, res, next) => {
    console.error(err.stack);
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: Object.values(err.errors).map(v => v.message).join(", ") });
    }
    if (err.code === 11000) return res.status(400).json({ message: "Duplicate field value" });
    res.status(err.status || 500).json({ message: err.message || "Server error" });
  };
  