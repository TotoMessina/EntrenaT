import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

// User provided credentials configured as standard defaults
const DEFAULT_URL = 'https://qxtgjxmuoxrwqboapbzd.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dGdqeG11b3hyd3Fib2FwYnpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTAyMjYsImV4cCI6MjA5NDc4NjIyNn0.qNHQA2qHFboQkPZTPARXAXOud4r868MYoW9TVimBxqM';

/**
 * Initializes the Supabase client dynamically with the provided URL and Anon Key.
 * Stored in memory as a singleton.
 */
export const initSupabase = (url, key) => {
  if (!url || !key) {
    supabaseInstance = null;
    return null;
  }
  try {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
    supabaseInstance = null;
    return null;
  }
};

/**
 * Gets the current active Supabase client instance.
 * If not initialized, tries to restore from localStorage or falls back to defaults.
 */
export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const url = localStorage.getItem('fitanalytics_supabase_url') || DEFAULT_URL;
  const key = localStorage.getItem('fitanalytics_supabase_key') || DEFAULT_KEY;

  if (url && key) {
    return initSupabase(url, key);
  }
  return null;
};

/**
 * Resets the active Supabase client instance.
 */
export const clearSupabase = () => {
  supabaseInstance = null;
};

