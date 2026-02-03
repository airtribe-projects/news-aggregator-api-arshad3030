const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    logger.warn("Authorization failed", {
      path: req.path,
      reason: "Missing auth cookie",
    });

    return res.status(401).json({
      error: "Authentication required",
      message: "Login cookie not found",
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    logger.debug("JWT verified", { email: payload.email });

    req.user = { email: payload.email };
    next();
  } catch (err) {
    logger.warn("JWT verification failed", { error: err.name });

    return res.status(401).json({
      error: "Invalid or expired token",
      message: "Please log in again",
    });
  }
}

module.exports = authMiddleware;
