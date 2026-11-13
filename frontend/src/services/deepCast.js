const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

export const DEEP_CAST_MODELS = [
  { id: "auto", label: "Best match" },
  { id: "gfs_seamless", label: "GFS" },
  { id: "ecmwf_ifs025", label: "ECMWF" },
  { id: "icon_seamless", label: "ICON" },
];

const HOURLY = [
  "temperature_2m", "relative_humidity_2m", "dew_point_2m", "apparent_temperature",
  "precipitation_probability", "precipitation", "rain", "showers", "weather_code",
  "cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high", "visibility",
  "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m", "surface_pressure",
  "pressure_msl", "cape", "freezing_level_height", "uv_index", "shortwave_radiation",
  "direct_radiation", "diffuse_radiation", "direct_normal_irradiance", "sunshine_duration",
  "soil_temperature_0_to_7cm", "soil_moisture_0_to_7cm", "soil_moisture_7_to_28cm",
  "et0_fao_evapotranspiration", "temperature_850hPa", "relative_humidity_850hPa",
  "wind_speed_850hPa", "wind_direction_850hPa", "geopotential_height_850hPa",
  "temperature_500hPa", "geopotential_height_500hPa",
];
const DAILY = [
  "temperature_2m_max", "temperature_2m_min", "apparent_temperature_max",
  "apparent_temperature_min", "precipitation_sum", "rain_sum", "showers_sum",
  "precipitation_hours", "precipitation_probability_max", "wind_speed_10m_max",
  "wind_gusts_10m_max", "shortwave_radiation_sum", "sunshine_duration", "et0_fao_evapotranspiration",
  "uv_index_max", "sunrise", "sunset", "weather_code",
];
const CURRENT = [
  "temperature_2m", "relative_humidity_2m", "apparent_temperature", "precipitation",
  "rain", "showers", "weather_code", "cloud_cover", "surface_pressure", "pressure_msl",
  "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
];

async function json(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (payload?.error) throw new Error(payload.reason || "Provider returned an error");
  return payload;
}

function query(base, params) {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  return url.toString();
}

export async function fetchDeepCastForecast({ lat, lon, model = "auto", signal }) {
  const params = {
    latitude: lat,
    longitude: lon,
    hourly: HOURLY.join(","),
    daily: DAILY.join(","),
    current: CURRENT.join(","),
    timezone: "Asia/Kolkata",
    forecast_days: 7,
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
  };
  if (model && model !== "auto") params.models = model;
  const data = await json(query(FORECAST_URL, params), signal);
  return {
    ...data,
    model,
    fetchedAt: new Date().toISOString(),
    source: "Open-Meteo Forecast API",
    sourceUrl: "https://open-meteo.com/",
  };
}

export async function fetchDeepCastMarine({ lat, lon, signal }) {
  const data = await json(query(MARINE_URL, {
    latitude: lat,
    longitude: lon,
    hourly: "wave_height,wave_direction,wave_period,sea_surface_temperature",
    timezone: "Asia/Kolkata",
    forecast_days: 3,
  }), signal);
  const heights = data?.hourly?.wave_height || [];
  return {
    ...data,
    available: heights.some((value) => typeof value === "number"),
    source: "Open-Meteo Marine API",
    sourceUrl: "https://open-meteo.com/en/docs/marine-weather-api",
  };
}

export async function fetchAirQualityTimeline({ lat, lon, signal }) {
  const data = await json(query(AIR_URL, {
    latitude: lat,
    longitude: lon,
    hourly: "pm10,pm2_5,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,us_aqi",
    timezone: "Asia/Kolkata",
    forecast_days: 3,
  }), signal);
  return {
    ...data,
    source: "Open-Meteo Air Quality API",
    sourceUrl: "https://open-meteo.com/en/docs/air-quality-api",
  };
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function daysBefore(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

function yearsBefore(date, years) {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() - years);
  return next;
}

async function fetchArchiveRain({ lat, lon, start, end, signal }) {
  const data = await json(query(ARCHIVE_URL, {
    latitude: lat,
    longitude: lon,
    start_date: start,
    end_date: end,
    daily: "precipitation_sum",
    timezone: "Asia/Kolkata",
  }), signal);
  return data?.daily?.precipitation_sum || [];
}

function sum(values) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

export async function fetchRainAnomaly({ lat, lon, signal }) {
  const end = daysBefore(new Date(), 1);
  const start = daysBefore(end, 89);
  const offsets = [0, 1, 2, 3, 4, 5];
  const series = await Promise.all(offsets.map(async (offset) => {
    const values = await fetchArchiveRain({
      lat,
      lon,
      start: isoDate(yearsBefore(start, offset)),
      end: isoDate(yearsBefore(end, offset)),
      signal,
    });
    return { offset, values };
  }));
  const current = series.find((item) => item.offset === 0)?.values || [];
  const baselines = series.filter((item) => item.offset > 0).map((item) => item.values).filter((values) => values.length);
  if (!current.length || !baselines.length) {
    return { available: false, source: "Open-Meteo Archive API (ERA5)", sourceUrl: "https://open-meteo.com/en/docs/historical-weather-api" };
  }
  const current90 = sum(current);
  const current30 = sum(current.slice(-30));
  const baseline90 = baselines.map((values) => sum(values));
  const baseline30 = baselines.map((values) => sum(values.slice(-30)));
  const mean90 = sum(baseline90) / baseline90.length;
  const mean30 = sum(baseline30) / baseline30.length;
  const anomaly30 = current30 - mean30;
  const dryDays90 = current.filter((value) => Number.isFinite(value) && value < 1).length;
  const baselineDryDays = baselines.map((values) => values.filter((value) => Number.isFinite(value) && value < 1).length);
  return {
    available: true,
    current30, mean30, anomaly30,
    pct30: mean30 > 0 ? (anomaly30 / mean30) * 100 : null,
    current90, mean90, anomaly90: current90 - mean90,
    pct90: mean90 > 0 ? ((current90 - mean90) / mean90) * 100 : null,
    dryDays90,
    meanDryDays90: baselineDryDays.length ? sum(baselineDryDays) / baselineDryDays.length : null,
    baselineYears: baselines.length,
    period: `${isoDate(start)} to ${isoDate(end)}`,
    source: "Open-Meteo Archive API (ERA5 reanalysis)",
    sourceUrl: "https://open-meteo.com/en/docs/historical-weather-api",
  };
}

// Open-Meteo returns timezone-naive local timestamps (Asia/Kolkata for this
// panel). Parse them explicitly as IST so a browser in another timezone does
// not shift the displayed hour or pick the wrong forecast hour.
export function parseProviderTime(value) {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return new Date(NaN);
  const naive = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value);
  return new Date(naive ? `${value}+05:30` : value);
}

export function currentHourIndex(hourly) {
  if (!hourly?.time?.length) return 0;
  const now = Date.now() - 60 * 60 * 1000;
  const index = hourly.time.findIndex((time) => parseProviderTime(time).getTime() >= now);
  return index < 0 ? 0 : index;
}

export function sliceHours(hourly, start, count) {
  const begin = Math.max(0, start);
  return {
    time: (hourly?.time || []).slice(begin, begin + count),
    values: (key) => (hourly?.[key] || []).slice(begin, begin + count),
  };
}

export function accumulation(hourly, key, start, count) {
  const values = (hourly?.[key] || []).slice(start, start + count);
  // A missing hour must not silently reduce a rainfall total.
  if (!values.length || values.some((value) => !Number.isFinite(value))) return null;
  return sum(values);
}

export function maxOf(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? Math.max(...valid) : null;
}

export function minOf(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? Math.min(...valid) : null;
}

export function meanOf(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? sum(valid) / valid.length : null;
}

export function formatValue(value, unit = "", digits = 0) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}${unit ? ` ${unit}` : ""}`;
}
