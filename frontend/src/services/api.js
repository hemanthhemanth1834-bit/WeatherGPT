/* Client for the WeatherGPT backend. Original implementation.
   Same-origin /api in production; override with VITE_API_URL locally. */
const BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:8000/api"
    : "/api");

async function request(path, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

const get = (path) => request(path, { method: "GET" });

export const sendChatQuery = (query, persona = "general", language = "auto", locationName = "") =>
  request("/chat/query", {
    method: "POST",
    body: JSON.stringify({ query, persona, language, location_name: locationName }),
  });

export const fetchCurrentWeather = (location = "Pune", lat = null, lon = null, model = "auto", state = null) => {
  let path = `/weather/current?location=${encodeURIComponent(location)}&model=${model}`;
  if (lat !== null && lon !== null) path += `&lat=${lat}&lon=${lon}`;
  if (state) path += `&state=${encodeURIComponent(state)}`;
  return get(path);
};

export const fetchActiveAlerts = (severity = null) =>
  get(severity ? `/alerts/active?severity=${severity}` : "/alerts/active");

export const fetchIndiaAlerts = (state = null) =>
  get(state ? `/alerts/india?state=${encodeURIComponent(state)}` : "/alerts/india");

export const fetchCycloneTrack = () => get("/alerts/cyclone-track");

export const fetchCropAdvisory = (crop = "paddy", district = "Nagpur", state = "Maharashtra") =>
  get(`/advisory/crop?crop=${encodeURIComponent(crop)}&district=${encodeURIComponent(district)}&state=${encodeURIComponent(state)}`);

export const fetchAviationBriefing = (airport = "VIDP") =>
  get(`/aviation/briefing?airport=${encodeURIComponent(airport)}`);

export const fetchMarineAdvisory = (location = "Mumbai") =>
  get(`/marine/advisory?location=${encodeURIComponent(location)}`);

export const fetchClimateTrends = (region = "All India") =>
  get(`/climate/trends?region=${encodeURIComponent(region)}`);

export const fetchCityComparison = (city1 = "Mumbai", city2 = "Delhi") =>
  get(`/weather/compare?city1=${encodeURIComponent(city1)}&city2=${encodeURIComponent(city2)}`);

export const searchLocations = async (query = "", limit = 8) => {
  if (!query || query.trim().length < 2) return [];
  try {
    return await get(`/locations/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`);
  } catch {
    return [];
  }
};

export const fetchRegionalTalukas = async (region = "pune") => {
  try {
    return await get(`/locations/regional-explorer?region=${encodeURIComponent(region)}`);
  } catch {
    return [];
  }
};

export const fetchRiskAssessment = (location = "Pune", lat = null, lon = null) => {
  let path = `/risk/assess?location=${encodeURIComponent(location)}`;
  if (lat !== null && lon !== null) path += `&lat=${lat}&lon=${lon}`;
  return get(path);
};

export const fetchNwpStatus = () => get("/nwp/status");

export const fetchSatelliteInfo = (lat = 20.0, lon = 78.0) =>
  get(`/satellite/info?lat=${lat}&lon=${lon}`);

export const fetchIndianSources = () => get("/sources/indian");

export const fetchAgentTools = () => get("/agent/tools");

export const fetchDeveloperMeta = () => get("/meta/developer");

export const fetchAirQuality = (location = "Pune", lat = null, lon = null) => {
  let path = `/air-quality?location=${encodeURIComponent(location)}`;
  if (lat !== null && lon !== null) path += `&lat=${lat}&lon=${lon}`;
  return get(path);
};

export const fetchTravelSafety = (location = "Pune") =>
  get(`/travel/safety?location=${encodeURIComponent(location)}`);

export const fetchClimateHistory = (location = "Pune", years = 5) =>
  get(`/climate/history?location=${encodeURIComponent(location)}&years=${years}`);

export const fetchClimateMonthly = (location = "Pune", year = 2025) =>
  get(`/climate/monthly?location=${encodeURIComponent(location)}&year=${year}`);

export const fetchReverseGeocode = (lat, lon) =>
  get(`/locations/reverse?lat=${lat}&lon=${lon}`);

export const fetchProvidersHealth = (live = true) =>
  get(`/providers/health?live=${live ? "true" : "false"}`);

export const fetchEngineStatus = () => get("/agent/engine");

export const fetchUV = (location = "Pune") =>
  get(`/uv?location=${encodeURIComponent(location)}`);

export const fetchDisasters = (region = "world") =>
  get(`/disasters/global?region=${encodeURIComponent(region)}`);

export const fetchFloodRisk = (location = "Pune", lat = null, lon = null) => {
  let path = `/flood/risk?location=${encodeURIComponent(location)}`;
  if (lat !== null && lon !== null) path += `&lat=${lat}&lon=${lon}`;
  return get(path);
};

export const fetchSolar = (location = "Pune", rated_kw = 1) =>
  get(`/solar/estimate?location=${encodeURIComponent(location)}&rated_kw=${rated_kw}`);

export const fetchEmergencyPlaces = (lat, lon) =>
  get(`/places/emergency?lat=${lat}&lon=${lon}`);

export const fetchEarthquakes = (min_magnitude = 5, days = 7) =>
  get(`/disasters/earthquakes?min_magnitude=${min_magnitude}&days=${days}`);

export const fetchWildfires = (limit = 25) =>
  get(`/disasters/wildfires?limit=${limit}`);
