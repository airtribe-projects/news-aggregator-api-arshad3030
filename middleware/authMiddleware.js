const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    logger.warn("Authorization attempt failed", {
      path: req.path,
      reason: "Missing or malformed header",
    });
    return res.status(401).json({
      error: "Authorization header missing or malformed",
      message:
        "Please provide a valid Bearer token in the Authorization header.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    logger.debug("Token verified", { email: payload.email });
    req.user = { email: payload.email };
    return next();
  } catch (err) {
    logger.warn("Token verification failed", { error: err.name });
    return res.status(401).json({
      error: "Invalid or expired token",
      message: "Please log in again to get a fresh token.",
    });
  }
}

module.exports = authMiddleware;
