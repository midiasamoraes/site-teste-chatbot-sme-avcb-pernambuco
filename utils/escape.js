// HTML escaping utility
// Provides a secure function to escape HTML special characters to prevent XSS

/**
 * Escapes HTML special characters in a string
 * @param {string|*} s - The input to escape (null/undefined treated as empty string)
 * @returns {string} The escaped string safe for HTML context
 */
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

// Export for use in other modules (if using ES6 modules)
// For now, we'll attach to window for global access in non-module scripts
if (typeof window !== 'undefined') {
  window.escapeUtils = {
    escapeHtml
  };
}