// Formatting utilities
// Provides reusable formatting functions for percentages, durations, etc.

/**
 * Formats a number as a percentage with one decimal place
 * @param {number} n - A value between 0 and 1 (or any number, treated as ratio)
 * @returns {string} Formatted percentage (e.g., "50.0%")
 */
function fmtPct(n) {
  if (!isFinite(n)) return '0.0%';
  return (Math.round(n * 1000) / 10) + '%';
}

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "2min 30s", "45s", "–" for invalid/zero)
 */
function fmtDuration(ms) {
  if (!isFinite(ms) || ms <= 0) return '–';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? (m + 'min ' + s + 's') : (s + 's');
}

/**
 * Formats a number with commas as thousands separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Export for use in other modules (if using ES6 modules)
// For now, we'll attach to window for global access in non-module scripts
if (typeof window !== 'undefined') {
  window.formatUtils = {
    fmtPct,
    fmtDuration,
    formatNumber
  };
}