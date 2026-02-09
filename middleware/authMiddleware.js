const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const STATUS_CODES = require("../config/statusCodes");

const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  const startTime = Date.now();
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    logger.warn("Authorization attempt failed", {
      path: req.path,
      method: req.method,
      userAgent: req.get("user-agent"),
      ip: req.ip || req.socket.remoteAddress,
      reason: "Missing or malformed header",
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader.length,
    });
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      error: "Authorization header missing or malformed",
      message:
        "Please provide a valid Bearer token in the Authorization header.",
    });
  }

  const token = authHeader.split(" ")[1];
  const tokenMetadata = {
    tokenLength: token.length,
    tokenPrefix: token.substring(0, 10) + "...",
    hasValidFormat: token.length > 20,
  };

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const verificationTime = Date.now() - startTime;
    
    logger.debug("Token verified successfully", {
      email: payload.email,
      path: req.path,
      method: req.method,
      verificationTime: `${verificationTime}ms`,
      tokenMetadata,
      issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : undefined,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
      isExpired: payload.exp ? Date.now() > payload.exp * 1000 : undefined,
    });
    
    req.user = { email: payload.email };
    return next();
  } catch (err) {
    const verificationTime = Date.now() - startTime;
    
    logger.warn("Token verification failed", {
      path: req.path,
      method: req.method,
      verificationTime: `${verificationTime}ms`,
      error: err.name,
      errorMessage: err.message,
      tokenMetadata,
      ip: req.ip || req.socket.remoteAddress,
    });
    
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      error: "Invalid or expired token",
      message: "Please log in again to get a fresh token.",
    });
  }
}

module.exports = authMiddleware;
