function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  const isProduction = process.env.NODE_ENV === "production";

  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      errors: Object.values(err.errors).map((error) => error.message)
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    const message = field === "email"
      ? "An account with this email already exists"
      : "Duplicate value already exists";

    return res.status(409).json({ message });
  }

  if (err.message?.startsWith("CORS blocked origin")) {
    return res.status(403).json({ message: err.message });
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Invalid or expired authentication" });
  }

  console.error(err);

  res.status(statusCode).json({
    message: isProduction && statusCode >= 500 ? "Server error" : err.message || "Server error"
  });
}

module.exports = { notFound, errorHandler };
