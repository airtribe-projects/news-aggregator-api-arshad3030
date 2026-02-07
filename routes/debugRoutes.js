const express = require("express");
const router = express.Router();
const profiler = require("../utils/profiler");
const authMiddleware = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

/**
 * GET /debug/profile
 * Protected route - Returns profiling statistics
 * Shows slowest operations, call counts, and timing metrics
 */
router.get("/profile", authMiddleware, (req, res) => {
  try {
    const stats = profiler.getStats();
    const topSlowest = profiler.getTopSlowest(15);
    const isEnabled = profiler.isEnabled();

    if (!isEnabled) {
      return res.status(200).json({
        message: "Profiling is disabled",
        note: "Set ENABLE_PROFILING=true or NODE_ENV=development to enable profiling",
        enabled: false,
      });
    }

    return res.status(200).json({
      message: "Profiling statistics retrieved successfully",
      enabled: true,
      totalOperations: Object.keys(stats).length,
      totalCalls: Object.values(stats).reduce((sum, op) => sum + op.calls, 0),
      topSlowest,
      allStats: stats,
    });
  } catch (err) {
    logger.error("Error retrieving profiling stats", { error: err.message });
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve profiling statistics",
    });
  }
});

/**
 * POST /debug/profile/reset
 * Protected route - Resets profiling statistics
 * Clears all collected metrics
 */
router.post("/profile/reset", authMiddleware, (req, res) => {
  try {
    profiler.resetStats();
    logger.info("Profiler statistics reset by user", { email: req.user.email });

    return res.status(200).json({
      message: "Profiling statistics reset successfully",
    });
  } catch (err) {
    logger.error("Error resetting profiling stats", { error: err.message });
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to reset profiling statistics",
    });
  }
});

/**
 * GET /debug/profile/report
 * Protected route - Returns formatted profiling report as text
 * Useful for logging or viewing in terminal
 */
router.get("/profile/report", authMiddleware, (req, res) => {
  try {
    const report = profiler.getReport();
    const isEnabled = profiler.isEnabled();

    if (!isEnabled) {
      return res
        .status(200)
        .type("text/plain")
        .send(
          "Profiling is disabled\n" +
            "Set ENABLE_PROFILING=true or NODE_ENV=development to enable profiling",
        );
    }

    logger.info("Profiler report requested", { email: req.user.email });

    return res.status(200).type("text/plain").send(report);
  } catch (err) {
    logger.error("Error generating profiling report", { error: err.message });
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to generate profiling report",
    });
  }
});

module.exports = router;
