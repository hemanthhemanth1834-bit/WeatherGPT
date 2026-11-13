/* Client for the WeatherGPT backend. Original implementation.
   Same-origin /api in production; override with VITE_API_URL locally. */
const BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:8000/api"
    : "/api");

async function request(path, options = {}) {
  const { timeout = 20000, signal: externalSignal, ...init } = options;
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", abortFromCaller, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    });
    if (!response.ok) {
      // Attach the HTTP status so callers can distinguish "backend answered
      // with an error" (reachable) from a network failure/abort (not
      // reachable) without parsing the message.
      const error = new Error(`Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener("abort", abortFromCaller);
  }
}

const get = (path, options = {}) => request(path, { method: "GET", ...options });

export const sendChatQuery = (
  query,
  persona = "general",
  language = "auto",
  locationName = "",
  { signal } = {}
) =>
  request("/chat/query", {
    method: "POST",
    body: JSON.stringify({ query, persona, language, location_name: locationName }),
    signal,
  });

export const fetchCurrentWeather = (location = "Pune", lat = null, lon = null, model = "auto", state = null, signal = null) => {
  let path = `/weather/current?location=${encodeURIComponent(location)}&model=${model}`;
  if (lat !== null && lon !== null) path += `&lat=${lat}&lon=${lon}`;
  if (state) path += `&state=${encodeURIComponent(state)}`;
  return get(path, { signal });
};

export const fetchActiveAlerts = (severity = null) =>
  get(severity ? `/alerts/active?severity=${severity}` : "/alerts/active");

export const fetchIndiaAlerts = (state = null) =>
  get(state ? `/alerts/india?state=${encodeURIComponent(state)}` : "/alerts/india");

export const fetchImdWarnings = (limit = 20) =>
  get(`/imd/warnings?limit=${encodeURIComponent(limit)}`);

export const fetchCropAdvisory = (crop = "paddy", district = "Nagpur", state = "Maharashtra") =>
  get(`/advisory/crop?crop=${encodeURIComponent(crop)}&district=${encodeURIComponent(district)}&state=${encodeURIComponent(state)}`);

export const fetchAviationBriefing = (airport = "VIDP") =>
  get(`/aviation/briefing?airport=${encodeURIComponent(airport)}`);

export const fetchMarineAdvisory = (location = "Mumbai") =>
  get(`/marine/advisory?location=${encodeURIComponent(location)}`);

export const fetchClimateTrends = (region = "All India") =>
  get(`/climate/trends?region=${encodeURIComponent(region)}`);


export const searchLocations = async (query = "", limit = 8, signal = null) => {
  if (!query || query.trim().length < 2) return [];
  try {
    return await get(`/locations/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`, { signal });
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

export const fetchNwpComparison = (location = "Pune") =>
  get(`/nwp/compare?location=${encodeURIComponent(location)}`);

export const fetchEnsembleForecast = (lat, lon, days = 3, signal = null) =>
  get(`/ensemble/forecast?lat=${lat}&lon=${lon}&days=${days}`, { signal });

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

export const fetchClimateDashboard = ({
  location,
  year,
  startYear = 1991,
  baselineStart = 1991,
  baselineEnd = 2020,
}) => {
  const params = new URLSearchParams({
    location,
    start_year: String(startYear),
    baseline_start: String(baselineStart),
    baseline_end: String(baselineEnd),
  });
  if (year != null) params.set("year", String(year));
  return get(`/climate/dashboard?${params.toString()}`, { timeout: 45000 });
};

export const fetchReverseGeocode = (lat, lon) =>
  get(`/locations/reverse?lat=${lat}&lon=${lon}`, { timeout: 6000 });

export const fetchProvidersHealth = (live = true) =>
  get(`/providers/health?live=${live ? "true" : "false"}`);

export const fetchEngineStatus = (live = false) =>
  get(`/agent/engine${live ? "?live=true" : ""}`);

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
