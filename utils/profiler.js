const logger = require("./logger");

// Enable profiling in development mode or when explicitly set
const ENABLE_PROFILING =
  process.env.ENABLE_PROFILING || process.env.NODE_ENV === "development";

// Threshold in milliseconds for warning about slow operations
const SLOWNESS_THRESHOLD = 100;

class Profiler {
  constructor() {
    this.marks = {}; // Object to store mark start times: { label: bigint }
    this.metrics = new Map(); // Map to store metrics: label -> { count, totalTime, minTime, maxTime }
  }

  /**
   * Mark the start of an operation
   * @param {string} label - Unique identifier for this operation
   */
  mark(label) {
    if (!ENABLE_PROFILING) return;
    this.marks[label] = process.hrtime.bigint(); // High-resolution timer in nanoseconds
  }

  /**
   * Measure time elapsed since mark() was called
   * Logs a warning if duration exceeds threshold
   * @param {string} label - Must match the label used in mark()
   * @param {number} warningThreshold - Optional custom threshold in milliseconds
   * @returns {number} Duration in milliseconds or undefined if profiling disabled
   */
  measure(label, warningThreshold = SLOWNESS_THRESHOLD) {
    if (!ENABLE_PROFILING) return;

    const start = this.marks[label];
    if (!start) {
      logger.warn(
        `Profiler: No mark found for "${label}". Did you forget mark()?`,
      );
      return;
    }

    const end = process.hrtime.bigint();
    // Convert nanoseconds to milliseconds (1 ms = 1,000,000 ns)
    const durationMs = Number(end - start) / 1_000_000;

    // Update or create metric entry
    const metric = this.metrics.get(label) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: -Infinity,
    };

    metric.count++;
    metric.totalTime += durationMs;
    metric.minTime = Math.min(metric.minTime, durationMs);
    metric.maxTime = Math.max(metric.maxTime, durationMs);

    this.metrics.set(label, metric);

    // Warn if operation is slow
    if (durationMs > warningThreshold) {
      logger.warn(
        `⚠️ SLOW OPERATION: "${label}" took ${durationMs.toFixed(2)}ms (threshold: ${warningThreshold}ms)`,
      );
    }

    // Clean up mark
    delete this.marks[label];

    return durationMs;
  }

  /**
   * Get all collected profiling statistics
   * @returns {Object} Object with format: { label: { calls, totalMs, avgMs, minMs, maxMs } }
   */
  getStats() {
    const stats = {};

    for (const [label, metric] of this.metrics.entries()) {
      stats[label] = {
        calls: metric.count,
        totalMs: metric.totalTime.toFixed(2),
        avgMs: (metric.totalTime / metric.count).toFixed(2),
        minMs: metric.minTime.toFixed(2),
        maxMs: metric.maxTime.toFixed(2),
      };
    }

    return stats;
  }

  /**
   * Get top N slowest operations (by average time)
   * @param {number} limit - How many to return (default: 10)
   * @returns {Array} Array of {label, avgMs, maxMs, calls} sorted by avgMs descending
   */
  getTopSlowest(limit = 10) {
    const entries = Array.from(this.metrics.entries())
      .map(([label, metric]) => ({
        label,
        avgMs: metric.totalTime / metric.count,
        maxMs: metric.maxTime,
        calls: metric.count,
        totalMs: metric.totalTime,
      }))
      .sort((a, b) => b.avgMs - a.avgMs) // Sort by average time, descending
      .slice(0, limit);

    return entries.map((entry) => ({
      label: entry.label,
      avgMs: entry.avgMs.toFixed(2),
      maxMs: entry.maxMs.toFixed(2),
      calls: entry.calls,
      totalMs: entry.totalMs.toFixed(2),
    }));
  }

  /**
   * Clear all collected metrics
   */
  resetStats() {
    this.metrics.clear();
    logger.info("Profiler statistics reset");
  }

  /**
   * Get formatted profiling report
   * @returns {string} Formatted report suitable for logging/display
   */
  getReport() {
    const stats = this.getStats();
    const topSlowest = this.getTopSlowest();

    let report = "\n=== PROFILING REPORT ===\n";
    report += `Total operations tracked: ${this.metrics.size}\n`;
    report += `Total calls: ${Array.from(this.metrics.values()).reduce((sum, m) => sum + m.count, 0)}\n\n`;

    report += "TOP 10 SLOWEST OPERATIONS (by average time):\n";
    report += "─".repeat(80) + "\n";
    report +=
      "Operation".padEnd(35) +
      "Avg (ms)".padStart(12) +
      "Max (ms)".padStart(12) +
      "Calls".padStart(10) +
      "Total (ms)".padStart(12) +
      "\n";
    report += "─".repeat(80) + "\n";

    topSlowest.forEach((entry) => {
      report +=
        entry.label.padEnd(35) +
        entry.avgMs.padStart(12) +
        entry.maxMs.padStart(12) +
        String(entry.calls).padStart(10) +
        entry.totalMs.padStart(12) +
        "\n";
    });

    report += "─".repeat(80) + "\n";

    return report;
  }

  /**
   * Check if profiling is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return ENABLE_PROFILING;
  }
}

// Export singleton instance
module.exports = new Profiler();
