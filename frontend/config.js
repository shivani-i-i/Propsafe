// Dynamic configuration loader
// Loads API keys from multiple sources (in priority order):
// 1. import.meta.env (Vite/build-time - for development)
// 2. window.CONFIG (set by HTML or server)
// 3. frontend/config.json (local JSON config file)

let configCache = null;

async function loadConfig() {
  if (configCache) return configCache;
  
  try {
    const response = await fetch('./config.json');
    if (response.ok) {
      configCache = await response.json();
      return configCache;
    }
  } catch (error) {
    // config.json not found - this is okay, use other sources
  }
  
  return {};
}

export async function getGoogleMapsApiKey() {
  // Try Vite environment first (dev)
  if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  }
  
  // Try window.CONFIG (if set by HTML)
  if (window.CONFIG?.GOOGLE_MAPS_API_KEY) {
    return window.CONFIG.GOOGLE_MAPS_API_KEY;
  }
  
  // Try loading from config.json
  const config = await loadConfig();
  if (config.googleMapsApiKey) {
    return config.googleMapsApiKey;
  }
  
  // Not configured
  return null;
}

export async function loadGoogleMapsScript() {
  return new Promise(async (resolve, reject) => {
    const apiKey = await getGoogleMapsApiKey();
    
    if (!apiKey) {
      reject(new Error(
        'Google Maps API key not configured. ' +
        'See setup instructions at: https://github.com/shivani-i-i/Propsafe#setup'
      ));
      return;
    }
    
    const scriptElement = document.getElementById('googlemaps-script');
    if (!scriptElement) {
      reject(new Error('Google Maps script element not found in HTML'));
      return;
    }
    
    // Check if already loaded
    if (window.google?.maps) {
      resolve();
      return;
    }
    
    scriptElement.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    scriptElement.async = true;
    scriptElement.defer = true;
    
    scriptElement.onload = () => resolve();
    scriptElement.onerror = () => reject(new Error('Failed to load Google Maps API'));
  });
}
