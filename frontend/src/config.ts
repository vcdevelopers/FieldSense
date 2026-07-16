// Centralized configuration for the application

// Base API URL without trailing slash (e.g., https://fieldops.vibecopilot.ai)
let envApi = import.meta.env.VITE_API_URL;
if (envApi && envApi.endsWith('/')) {
  envApi = envApi.slice(0, -1);
}

// Ensure the root doesn't contain /api at the end for when we need just the domain
let envApiRoot = envApi;
if (envApiRoot && envApiRoot.endsWith('/api')) {
  envApiRoot = envApiRoot.slice(0, -4);
}

// API_ROOT is the domain only (e.g. http://127.0.0.1:8000)
export const API_ROOT = envApiRoot || `http://${window.location.hostname}:8000`;

// API_BASE_URL contains the /api prefix (e.g. http://127.0.0.1:8000/api)
export const API_BASE_URL = envApi ? (envApi.endsWith('/api') ? envApi : `${envApi}/api`) : `${API_ROOT}/api`;
