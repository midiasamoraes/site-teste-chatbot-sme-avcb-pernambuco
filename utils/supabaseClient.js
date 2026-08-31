// Shared Supabase client utility
// Provides a consistent, reusable Supabase client instance with proper error handling

/**
 * Creates and returns a Supabase client instance
 * @returns {Object|null} Supabase client or null if unavailable
 */
function createSupabaseClient() {
  const supabaseUrl = 'https://dpixswlqxredyfahgjvy.supabase.co';
  const supabaseKey = 'sb_publishable_8ldstp8OyQSyypz9jyrDFQ_jHbMUUY7';
  
  // Check if Supabase script loaded properly
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.warn("Supabase script not loaded or createClient not available");
    return null;
  }
  
  try {
    return window.supabase.createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
    return null;
  }
}

// Create a singleton instance for reuse across the application
let _supabaseClientInstance = null;

/**
 * Gets the Supabase client instance (singleton pattern)
 * @returns {Object|null} Supabase client or null if unavailable
 */
function getSupabaseClient() {
  if (_supabaseClientInstance === null) {
    _supabaseClientInstance = createSupabaseClient();
  }
  return _supabaseClientInstance;
}

/**
 * Resets the Supabase client instance (useful for testing or reinitialization)
 */
function resetSupabaseClient() {
  _supabaseClientInstance = null;
}

// Export for use in other modules (if using ES6 modules)
// For now, we'll attach to window for global access in non-module scripts
if (typeof window !== 'undefined') {
  window.supabaseUtils = {
    getSupabaseClient,
    resetSupabaseClient,
    createSupabaseClient
  };
}