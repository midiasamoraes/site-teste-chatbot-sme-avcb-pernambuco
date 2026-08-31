// Chart.js helper utilities
// Provides reusable functions for creating and destroying Chart.js charts

/**
 * Safely destroys a Chart.js chart instance if it exists
 * @param {string} id - The canvas element ID
 */
function destroyChart(id) {
  if (window.charts && window.charts[id]) {
    window.charts[id].destroy();
    delete window.charts[id];
  }
}

/**
 * Creates a new Chart.js chart instance
 * @param {string} id - The canvas element ID
 * @param {Object} config - Chart.js configuration object
 * @returns {Object|null} The created chart instance or null if canvas not found
 */
function makeChart(id, config) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  // Initialize charts object on window if not exists (for backward compatibility)
  if (!window.charts) window.charts = {};
  window.charts[id] = new Chart(ctx, config);
  return window.charts[id];
}

// Export for use in other modules (if using ES6 modules)
// For now, we'll attach to window for global access in non-module scripts
if (typeof window !== 'undefined') {
  window.chartUtils = {
    destroyChart,
    makeChart
  };
}