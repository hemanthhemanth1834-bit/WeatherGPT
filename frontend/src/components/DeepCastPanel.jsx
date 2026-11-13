import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight, CloudRain, Droplets, Gauge, MapPin, Pause, Play,
  RefreshCw, Search, Sun, Waves, Wind,
} from "lucide-react";
import { fetchClimateMonthly, fetchEnsembleForecast, fetchFloodRisk, fetchNwpComparison, fetchRiskAssessment } from "../services/api";
import {
  accumulation, currentHourIndex, DEEP_CAST_MODELS, fetchAirQualityTimeline,
  fetchDeepCastForecast, fetchDeepCastMarine, fetchRainAnomaly, formatValue,
  maxOf, meanOf, minOf, parseProviderTime, sliceHours,
} from "../services/deepCast";
import { LocalSatelliteImagery } from "./LocationImagery";
import DeepCastRadarMap from "./DeepCastRadarMap";
import { BarChart, Metric, TopicSection, TrendChart, Unavailable, VerticalProfile } from "./DeepCastCharts";
import { frameTimeLabel, getRadarFrames } from "../services/radar";
import "./DeepCastPanel.css";

const WIND_LABELS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

function number(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstNumber(...values) {
  for (const value of values) {
    const found = number(value);
    if (found !== null) return found;
  }
  return null;
}

function clock(value) {
  if (!value) return "-";
  const date = parseProviderTime(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(11, 16);
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
}

function stamp(value) {
  if (!value) return "-";
  const date = parseProviderTime(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
}

function windLabel(degrees) {
  const value = number(degrees);
  if (value === null) return "—";
  return WIND_LABELS[Math.round(value / 22.5) % 16];
}

function toneForLevel(level) {
  const value = String(level || "").toUpperCase();
  if (["EXTREME", "HIGH", "ORANGE", "RED"].includes(value)) return "danger";
  if (["MODERATE", "YELLOW"].includes(value)) return "warn";
  return "ok";
}

function levelGrid(levels = {}) {
  return Object.entries(levels).map(([key, value]) => (
    <div className={`wg-dc-level ${toneForLevel(value)}`} key={key}>
      <span>{key}</span>
      <b>{value}</b>
    </div>
  ));
}

export default function DeepCastPanel({ weather, selectedPlace, onTab, onAsk, onSearch }) {
  const lat = Number(weather?.lat);
  const lon = Number(weather?.lon);
  const place = weather?.location || selectedPlace || "your location";
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lon);

  const [model, setModel] = useState("auto");
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(hasPoint);
  const [error, setError] = useState("");
  const [nwp, setNwp] = useState(null);
  const [ensemble, setEnsemble] = useState(null);
  const [air, setAir] = useState(null);
  const [anomaly, setAnomaly] = useState(null);
  const [risk, setRisk] = useState(null);
  const [flood, setFlood] = useState(null);
  const [climate, setClimate] = useState(null);
  const [marine, setMarine] = useState(null);
  const [radarData, setRadarData] = useState(null);
  const [radarIndex, setRadarIndex] = useState(0);
  const [radarError, setRadarError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!hasPoint) return undefined;
    const controller = new AbortController();
    const requestId = ++requestRef.current;
    const isCurrent = () => requestRef.current === requestId && !controller.signal.aborted;

    fetchDeepCastForecast({ lat, lon, model, signal: controller.signal })
      .then((data) => { if (isCurrent()) setForecast(data); })
      .catch((reason) => {
        if (isCurrent() && reason?.name !== "AbortError") setError(reason?.message || "Forecast provider unavailable");
      })
      .finally(() => { if (isCurrent()) setLoading(false); });

    const optional = [
      [fetchNwpComparison(place), setNwp],
      [fetchEnsembleForecast(lat, lon, 3, controller.signal), setEnsemble],
      [fetchAirQualityTimeline({ lat, lon, signal: controller.signal }), setAir],
      [fetchRainAnomaly({ lat, lon, signal: controller.signal }), setAnomaly],
      [fetchRiskAssessment(place, lat, lon), setRisk],
      [fetchFloodRisk(place, lat, lon), setFlood],
      [fetchClimateMonthly(place, 2025), setClimate],
      [fetchDeepCastMarine({ lat, lon, signal: controller.signal }), setMarine],
    ];
    optional.forEach(([promise, setter]) => {
      promise.then((value) => { if (isCurrent()) setter(value); }).catch(() => { if (isCurrent()) setter(null); });
    });

    return () => controller.abort();
  }, [hasPoint, lat, lon, place, model, reloadKey]);

  useEffect(() => {
    if (!hasPoint) return undefined;
    const controller = new AbortController();
    let active = true;
    getRadarFrames({ signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setRadarData(data);
        setRadarIndex(Math.max(0, (data?.past?.length || 1) - 1));
      })
      .catch((reason) => {
        if (active && reason?.name !== "AbortError") setRadarError(true);
      });
    return () => { active = false; controller.abort(); };
  }, [hasPoint, reloadKey]);

  useEffect(() => {
    document.body.classList.add("wg-dc-route");
    return () => document.body.classList.remove("wg-dc-route");
  }, []);

  useEffect(() => {
    if (!playing || !radarData?.past?.length) return undefined;
    const timer = window.setInterval(() => {
      setRadarIndex((index) => (index + 1) % radarData.past.length);
    }, 850);
    return () => window.clearInterval(timer);
  }, [playing, radarData]);

  const hourly = forecast?.hourly || {};
  const current = forecast?.current || {};
  const index = currentHourIndex(hourly);
  const next24 = sliceHours(hourly, index, 24);
  const next48 = sliceHours(hourly, index, 48);
  const labels24 = next24.time.map(clock);
  const labels48 = next48.time.map(clock);
  const daily = forecast?.daily || {};

  const temp = firstNumber(current.temperature_2m, hourly.temperature_2m?.[index]);
  const feels = firstNumber(current.apparent_temperature, hourly.apparent_temperature?.[index]);
  const humidity = firstNumber(current.relative_humidity_2m, hourly.relative_humidity_2m?.[index]);
  const wind = firstNumber(current.wind_speed_10m, hourly.wind_speed_10m?.[index]);
  const gust = firstNumber(current.wind_gusts_10m, hourly.wind_gusts_10m?.[index]);
  const pressure = firstNumber(current.pressure_msl, hourly.pressure_msl?.[index]);
  const precipitation = firstNumber(current.precipitation, hourly.precipitation?.[index]);
  const visibility = firstNumber(hourly.visibility?.[index]);
  const cape = firstNumber(hourly.cape?.[index]);
  const cloud = firstNumber(current.cloud_cover, hourly.cloud_cover?.[index]);

  const rain3 = accumulation(hourly, "precipitation", index, 3);
  const rain6 = accumulation(hourly, "precipitation", index, 6);
  const rain24 = accumulation(hourly, "precipitation", index, 24);
  const rain72 = accumulation(hourly, "precipitation", index, 72);
  const peakRainProbability = maxOf(next24.values("precipitation_probability"));
  const peakCape = maxOf(next24.values("cape"));
  const peakGust = maxOf(next24.values("wind_gusts_10m"));
  const peakWind = maxOf(next24.values("wind_speed_10m"));
  const maxTemp = maxOf(next48.values("temperature_2m"));
  const minTemp = minOf(next48.values("temperature_2m"));
  const meanHumidity = meanOf(next24.values("relative_humidity_2m"));
  const minVisibility = minOf(next24.values("visibility"));
  const pressureTrend = (() => {
    const values = next48.values("pressure_msl").filter(Number.isFinite);
    return values.length > 1 ? values[values.length - 1] - values[0] : null;
  })();
  const stormHours = (hourly.weather_code || []).slice(index, index + 48).filter((code) => Number(code) >= 95).length;
  const radiationDaily = number(daily.shortwave_radiation_sum?.[0]);
  const uvMax = number(daily.uv_index_max?.[0]);
  const sunrise = daily.sunrise?.[0] ? clock(daily.sunrise[0]) : "—";

  const airIndex = currentHourIndex(air?.hourly || {});
  const usAqi = firstNumber(air?.hourly?.us_aqi?.[airIndex]);
  const pm25 = firstNumber(air?.hourly?.pm2_5?.[airIndex]);
  const pm10 = firstNumber(air?.hourly?.pm10?.[airIndex]);
  const ozone = firstNumber(air?.hourly?.ozone?.[airIndex]);
  const aqLabels = (air?.hourly?.time || []).slice(airIndex, airIndex + 24).map(clock);
  const aqValues = (air?.hourly?.us_aqi || []).slice(airIndex, airIndex + 24);

  const radarFrames = radarData?.past || [];
  const radarFrame = radarFrames[radarIndex];
  const radarStamp = radarFrame ? frameTimeLabel(radarFrame) : "-";

  const modelRows = nwp?.models ? Object.entries(nwp.models) : [];
  const analyst = [
    temp !== null ? `Current temperature is ${formatValue(temp, "°C", 1)}, feeling like ${formatValue(feels, "°C", 1)}.` : null,
    rain24 !== null ? `The next 24 hours carry ${formatValue(rain24, "mm", 1)} of modelled precipitation, with a peak hourly probability of ${formatValue(peakRainProbability, "%", 0)}.` : null,
    peakWind !== null ? `Peak 10 m wind is ${formatValue(peakWind, "km/h", 0)} and peak gust ${formatValue(peakGust, "km/h", 0)}.` : null,
    peakCape !== null ? `Peak CAPE is ${formatValue(peakCape, "J/kg", 0)}; this is an instability signal, not a storm forecast.` : null,
    risk?.overall ? `The deterministic WeatherGPT screening is ${risk.overall} overall, with flood ${risk.levels?.flood || "—"}.` : null,
    anomaly?.available ? `The latest 30-day rainfall is ${formatValue(anomaly.anomaly30, "mm", 1)} versus the five-year mean (${formatValue(anomaly.pct30, "%", 0)}).` : null,
    usAqi !== null ? `US AQI at the selected point is ${formatValue(usAqi, "", 0)} (${air?.hourly?.us_aqi ? "Open-Meteo air-quality model" : "provider value"}).` : null,
  ].filter(Boolean);

  const waiting = <Unavailable title="Waiting for data">Select a location and allow the Open-Meteo forecast request to complete. No values are shown until they are returned.</Unavailable>;
  const forecastNote = forecast ? `Open-Meteo ${forecast.model === "auto" ? "best-match" : model} forecast · retrieved ${stamp(forecast.fetchedAt)} · Asia/Kolkata` : "Forecast data not yet available.";

  return (
    <div className="wg-dc">
      <header className="wg-dc-hero">
        <div className="wg-dc-hero-top">
          <div>
            <span className="wg-dc-kicker">NUMERICAL WEATHER INTELLIGENCE</span>
            <h1>AI Weather Deep-Cast</h1>
            <p>
              A 25-topic atmospheric command center built from actual Open-Meteo forecasts, NASA GIBS imagery,
              RainViewer radar and WeatherGPT deterministic screening. Every value carries its source and valid time.
            </p>
            <div className="wg-dc-location-line">
              <MapPin size={15} aria-hidden="true" />
              <b>{weather?.location || selectedPlace || "No location selected"}</b>
              {weather?.state ? <span>{weather.state}{weather.country ? `, ${weather.country}` : ""}</span> : null}
              <span>{hasPoint ? `${lat.toFixed(3)}°, ${lon.toFixed(3)}°` : selectedPlace ? "Forecast unavailable" : "Choose a place to begin"}</span>
            </div>
          </div>
          <div className="wg-dc-controls">
            <form
              className="wg-dc-search"
              onSubmit={(event) => {
                event.preventDefault();
                const value = query.trim();
                if (value && onSearch) onSearch(value);
              }}
            >
              <label htmlFor="deepcast-location-search">Search location</label>
              <div>
                <Search size={14} aria-hidden="true" />
                <input
                  id="deepcast-location-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="City, district or postcode"
                  autoComplete="off"
                />
                <button type="submit" disabled={!query.trim() || !onSearch}>Search</button>
              </div>
            </form>
            <div className="wg-dc-control-row">
              <label>Model
                <select value={model} onChange={(event) => {
                  setModel(event.target.value);
                  setLoading(true);
                  setError("");
                  setForecast(null);
                  setNwp(null);
                  setAir(null);
                  setAnomaly(null);
                  setRisk(null);
                  setFlood(null);
                  setClimate(null);
                  setMarine(null);
                }}>
                  {DEEP_CAST_MODELS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                </select>
              </label>
              <span className="wg-dc-units">Metric · °C · km/h · mm</span>
              <button type="button" className="wg-dc-refresh" onClick={() => {
                setLoading(true);
                setError("");
                setReloadKey((key) => key + 1);
              }}>
                <RefreshCw size={14} aria-hidden="true" /> Refresh
              </button>
            </div>
            <small>{forecastNote}</small>
          </div>
        </div>

        <div className="wg-dc-signals" aria-label="Current conditions and next 24 hour signals">
          <span><CloudRain size={14} aria-hidden="true" /> {formatValue(precipitation, "mm", 1)} current precip.</span>
          <span><Droplets size={14} aria-hidden="true" /> {formatValue(humidity, "%", 0)} humidity</span>
          <span><Gauge size={14} aria-hidden="true" /> {formatValue(pressure, "hPa", 0)} MSL</span>
          <span><Wind size={14} aria-hidden="true" /> {formatValue(wind, "km/h", 0)} {windLabel(current.wind_direction_10m)}</span>
          <span><Sun size={14} aria-hidden="true" /> UV {formatValue(uvMax, "", 1)} · sunrise {sunrise}</span>
          <span><Waves size={14} aria-hidden="true" /> {formatValue(rain24, "mm", 1)} rain next 24h</span>
        </div>

        <div className="wg-dc-metrics">
          <Metric label="Temperature" value={formatValue(temp, "", 1)} unit="°C" sub={`Feels ${formatValue(feels, "°C", 1)}`} />
          <Metric label="24 h rain" value={formatValue(rain24, "", 1)} unit="mm" sub={`Peak probability ${formatValue(peakRainProbability, "%", 0)}`} />
          <Metric label="Wind / gust" value={formatValue(peakWind, "", 0)} unit="km/h" sub={`Gust ${formatValue(peakGust, "km/h", 0)}`} />
          <Metric label="Pressure" value={formatValue(pressure, "", 0)} unit="hPa" sub={`48 h trend ${formatValue(pressureTrend, "hPa", 1)}`} />
          <Metric label="CAPE peak" value={formatValue(peakCape, "", 0)} unit="J/kg" sub="Instability, not a storm forecast" tone={peakCape > 2000 ? "warn" : ""} />
          <Metric label="Risk screen" value={risk?.overall || "—"} sub={risk?.data_type || "Awaiting risk engine"} tone={toneForLevel(risk?.overall)} />
          <Metric label="US AQI" value={formatValue(usAqi, "", 0)} sub={usAqi !== null ? "Open-Meteo air quality" : "No air-quality value"} tone={usAqi > 150 ? "warn" : ""} />
          <Metric label="Freshness" value={forecast ? "FORECAST" : loading ? "LOADING" : "UNAVAILABLE"} sub={forecast ? `Valid to ${stamp(hourly.time?.[index + 71])}` : "No forecast payload"} />
        </div>

        {error ? (
          <div className="wg-dc-error" role="alert">
            <b>Forecast provider unavailable.</b> {error}. Secondary providers may still load; no values are substituted.
            <button type="button" onClick={() => {
              setLoading(true);
              setError("");
              setReloadKey((key) => key + 1);
            }}>Retry forecast</button>
          </div>
        ) : null}
      </header>

      <div className="wg-dc-jump" aria-label="Deep-Cast topic index">
        {[
          ["01", "Satellite"], ["02", "Radar"], ["03", "Precipitation"], ["04", "Pressure"], ["05", "Wind"],
          ["06", "Instability"], ["07", "Moisture"], ["08", "Heat"], ["09", "Models"], ["10", "Verification"],
          ["11", "Severe"], ["12", "Rain anomaly"], ["13", "Flash flood"], ["14", "Rivers"], ["15", "Cyclone"],
          ["16", "Lightning"], ["17", "Fog"], ["18", "Air quality"], ["19", "Soil"], ["20", "Drought"],
          ["21", "Marine"], ["22", "Solar"], ["23", "Upper air"], ["24", "Timeline"], ["25", "Analyst"],
        ].map(([number, label]) => (
          <a
            key={number}
            href="#/deep-cast"
            onClick={(event) => {
              event.preventDefault();
              const target = document.getElementById(`deepcast-topic-${number}`);
              target?.scrollIntoView({
                behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                block: "start",
              });
            }}
          >{number} {label}</a>
        ))}
      </div>

      <TopicSection number="01" title="Live Satellite Intelligence" status="DELAYED" source="NASA GIBS / VIIRS + MODIS" sourceUrl="https://worldview.earthdata.nasa.gov/" timestamp="Daily true-colour product; previous day" note="These are georeferenced satellite images, not current-condition photographs. Cloud cover can hide the surface; the timestamp is the GIBS observation date.">
        {hasPoint ? (
          <LocalSatelliteImagery
            lat={lat}
            lon={lon}
            place={place}
            layerIds={["viirs", "modis"]}
            title={`Satellite view around ${place}`}
            description="NASA GIBS daily true-colour imagery. Switch between VIIRS and MODIS. Delayed by at least one day; not a live radar frame."
          />
        ) : waiting}
      </TopicSection>

      <TopicSection number="02" title="Live Radar & Rainfall Tracking" status={radarFrame ? "DELAYED" : "UNAVAILABLE"} source="RainViewer" sourceUrl="https://www.rainviewer.com/" timestamp={radarStamp} note="RainViewer past frames show observed radar reflectivity, not a forecast. Blank or sparse areas can mean no precipitation or no radar coverage; they are not an all-clear.">
        {!hasPoint ? waiting : radarError ? (
          <Unavailable title="Radar provider unavailable">RainViewer frames could not be loaded. No synthetic radar has been substituted.</Unavailable>
        ) : radarFrame ? (
          <div className="wg-dc-radar">
            <div className="wg-dc-radar-media">
              <DeepCastRadarMap
                lat={lat}
                lon={lon}
                host={radarData?.host}
                frame={radarFrame}
                label={`OpenStreetMap with RainViewer observed radar around ${place} at ${radarStamp}`}
              />
              <span className="wg-dc-image-badge">OBSERVED · DELAYED</span>
            </div>
            <div className="wg-dc-radar-controls">
              <button type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause radar playback" : "Play radar playback"}>
                {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />} {playing ? "Pause" : "Play"} recent frames
              </button>
              <input
                type="range"
                min="0"
                max={Math.max(0, radarFrames.length - 1)}
                value={radarIndex}
                onChange={(event) => setRadarIndex(Number(event.target.value))}
                aria-label="Radar frame time"
              />
              <span>{radarIndex + 1} / {radarFrames.length} · {radarStamp}</span>
            </div>
            <p className="wg-dc-caption">RainViewer mosaic over OpenStreetMap context. A frame can be delayed by several minutes; it is not a nowcast.</p>
          </div>
        ) : <Unavailable title="Loading radar frames">The RainViewer frame list has not loaded yet. No radar image is shown until a real frame is available.</Unavailable>}
      </TopicSection>

      <TopicSection number="03" title="AI Precipitation Deep-Cast" status="FORECAST" source="Open-Meteo" sourceUrl="https://open-meteo.com/" timestamp={forecast ? `Valid ${clock(hourly.time?.[index])} to ${clock(hourly.time?.[index + 71])}` : undefined} note="These are numerical-model precipitation values and probabilities, not observed rainfall. Accumulations are point estimates at the selected grid cell.">
        {forecast ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="Next 3 h" value={formatValue(rain3, "", 1)} unit="mm" />
              <Metric label="Next 6 h" value={formatValue(rain6, "", 1)} unit="mm" />
              <Metric label="Next 24 h" value={formatValue(rain24, "", 1)} unit="mm" />
              <Metric label="Next 72 h" value={formatValue(rain72, "", 1)} unit="mm" />
            </div>
            <div className="wg-dc-chart-grid">
              <BarChart title="Hourly precipitation — next 24 h" labels={labels24} values={next24.values("precipitation")} unit="mm" />
              <TrendChart title="Precipitation probability — next 24 h" labels={labels24} series={[{ label: "Probability", values: next24.values("precipitation_probability"), color: "#38bdf8", unit: "%" }]} yUnit="%" />
            </div>
          </>
        ) : waiting}
      </TopicSection>

      <TopicSection number="04" title="Atmospheric Pressure & Synoptic Systems" status="FORECAST" source="Open-Meteo" timestamp={forecast ? stamp(hourly.time?.[index]) : undefined} note="Pressure is a model field at the selected point. This view does not draw fronts, troughs or official synoptic analyses.">
        {forecast ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="Mean sea level" value={formatValue(pressure, "", 0)} unit="hPa" />
              <Metric label="48 h change" value={formatValue(pressureTrend, "", 1)} unit="hPa" sub={pressureTrend < -2 ? "Falling" : pressureTrend > 2 ? "Rising" : "Relatively steady"} />
              <Metric label="Surface pressure" value={formatValue(hourly.surface_pressure?.[index], "", 0)} unit="hPa" />
              <Metric label="Freezing level" value={formatValue(hourly.freezing_level_height?.[index], "", 0)} unit="m" />
            </div>
            <TrendChart title="Pressure — next 48 h" labels={labels48} series={[
              { label: "MSL pressure", values: next48.values("pressure_msl"), color: "#2dd4bf", unit: "hPa" },
              { label: "Surface pressure", values: next48.values("surface_pressure"), color: "#a78bfa", unit: "hPa" },
            ]} yUnit="hPa" />
          </>
        ) : waiting}
      </TopicSection>

      <TopicSection number="05" title="Wind Field & Gust Analysis" status="FORECAST" source="Open-Meteo" timestamp={forecast ? stamp(hourly.time?.[index]) : undefined} note="Wind is modelled at 10 m above ground. Local terrain, buildings and exposure can produce very different surface winds.">
        {forecast ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="Sustained" value={formatValue(wind, "", 0)} unit="km/h" sub={`From ${windLabel(current.wind_direction_10m)}`} />
              <Metric label="Gust" value={formatValue(gust, "", 0)} unit="km/h" />
              <Metric label="Peak next 24 h" value={formatValue(peakWind, "", 0)} unit="km/h" />
              <Metric label="Peak gust next 24 h" value={formatValue(peakGust, "", 0)} unit="km/h" tone={peakGust > 60 ? "warn" : ""} />
            </div>
            <TrendChart title="Wind speed and gust — next 24 h" labels={labels24} series={[
              { label: "Wind speed", values: next24.values("wind_speed_10m"), color: "#38bdf8", unit: "km/h" },
              { label: "Gust", values: next24.values("wind_gusts_10m"), color: "#fbbf24", unit: "km/h" },
            ]} yUnit="km/h" />
          </>
        ) : waiting}
      </TopicSection>

      <TopicSection number="06" title="Thunderstorm & Atmospheric Instability" status="DERIVED" source="Open-Meteo CAPE + WeatherGPT screen" timestamp={forecast ? stamp(hourly.time?.[index]) : undefined} note="CAPE is convective available potential energy from the model. High CAPE is a favourable ingredient, not a thunderstorm prediction or a calibrated probability.">
        {forecast ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="Current CAPE" value={formatValue(cape, "", 0)} unit="J/kg" />
              <Metric label="Peak next 24 h" value={formatValue(peakCape, "", 0)} unit="J/kg" tone={peakCape > 2000 ? "warn" : ""} />
              <Metric label="Thunder hours" value={stormHours} unit="of 48 h" sub="Weather-code screen" />
              <Metric label="Risk level" value={risk?.levels?.thunderstorm || "—"} tone={toneForLevel(risk?.levels?.thunderstorm)} />
            </div>
            <TrendChart title="CAPE — next 24 h" labels={labels24} series={[{ label: "CAPE", values: next24.values("cape"), color: "#f97316", unit: "J/kg" }]} yUnit="J/kg" />
          </>
        ) : waiting}
      </TopicSection>

      <TopicSection number="07" title="Humidity, Moisture & Cloud Layers" status="FORECAST" source="Open-Meteo" timestamp={forecast ? stamp(hourly.time?.[index]) : undefined} note="Cloud fractions are model layer estimates. Dew point indicates moisture availability; it is not a measured surface observation.">
        {forecast ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="Relative humidity" value={formatValue(humidity, "", 0)} unit="%" />
              <Metric label="Dew point" value={formatValue(hourly.dew_point_2m?.[index], "", 1)} unit="°C" />
              <Metric label="Cloud cover" value={formatValue(cloud, "", 0)} unit="%" />
              <Metric label="24 h mean RH" value={formatValue(meanHumidity, "", 0)} unit="%" />
            </div>
            <TrendChart title="Humidity and cloud layers — next 24 h" labels={labels24} series={[
              { label: "Relative humidity", values: next24.values("relative_humidity_2m"), color: "#2dd4bf", unit: "%" },
              { label: "Low cloud", values: next24.values("cloud_cover_low"), color: "#38bdf8", unit: "%" },
              { label: "Mid cloud", values: next24.values("cloud_cover_mid"), color: "#a78bfa", unit: "%" },
              { label: "High cloud", values: next24.values("cloud_cover_high"), color: "#fbbf24", unit: "%" },
            ]} yUnit="%" />
          </>
        ) : waiting}
      </TopicSection>

      <TopicSection number="08" title="Heatwave, Temperature & Thermal Analysis" status="FORECAST" source="Open-Meteo" timestamp={forecast ? stamp(hourly.time?.[index]) : undefined} note="Temperature and apparent temperature are model values. The screening threshold is not an official heatwave declaration.">
        {forecast ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="Now" value={formatValue(temp, "", 1)} unit="°C" />
              <Metric label="Feels like" value={formatValue(feels, "", 1)} unit="°C" />
              <Metric label="48 h maximum" value={formatValue(maxTemp, "", 1)} unit="°C" tone={maxTemp >= 40 ? "warn" : ""} />
              <Metric label="48 h minimum" value={formatValue(minTemp, "", 1)} unit="°C" />
            </div>
            <TrendChart title="Temperature and apparent temperature — next 48 h" labels={labels48} series={[
              { label: "Air temperature", values: next48.values("temperature_2m"), color: "#f87171", unit: "°C" },
              { label: "Feels like", values: next48.values("apparent_temperature"), color: "#fbbf24", unit: "°C" },
            ]} yUnit="°C" digits={1} />
          </>
        ) : waiting}
      </TopicSection>

      <TopicSection number="09" title="Multi-Model Forecast Comparison" status={nwp?.status || "UNAVAILABLE"} source={nwp?.source || "Open-Meteo model-specific endpoints"} timestamp={nwp ? stamp(new Date()) : undefined} note="Each row is a separate model endpoint for the same point and valid time. Differences show model spread; they are not an accuracy ranking.">
        {modelRows.length ? (
          <div className="wg-dc-table-wrap">
            <table className="wg-dc-table">
              <thead><tr><th>Model</th><th>Temperature</th><th>Rain probability</th><th>Wind</th><th>Condition</th><th>Updated</th></tr></thead>
              <tbody>
                {modelRows.map(([key, row]) => (
                  <tr key={key}>
                    <th>{key.toUpperCase()}</th>
                    <td>{formatValue(row.temperature_c, "°C", 1)}</td>
                    <td>{formatValue(row.rain_probability_pct, "%", 0)}</td>
                    <td>{formatValue(row.wind_speed_kmh, "km/h", 1)}</td>
                    <td>{row.condition || "—"}</td>
                    <td>{row.updated_at_ist || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="wg-dc-caption">Temperature spread: {formatValue(nwp?.spread?.temperature_c, "°C", 1)} · rain-probability spread: {formatValue(nwp?.spread?.rain_probability_pct, "%", 0)}. {nwp?.interpretation || ""}</p>
          </div>
        ) : <Unavailable title="Model comparison unavailable">The NWP comparison endpoint returned no model rows. The main forecast above is still shown; no model values are invented.</Unavailable>}
      </TopicSection>

      <TopicSection
        number="09B"
        title="Ensemble Spread & Rain Probability"
        status={ensemble?.status || "UNAVAILABLE"}
        source={ensemble?.source || "Open-Meteo Ensemble API"}
        sourceUrl={ensemble?.source_url}
        timestamp={ensemble?.retrieved_at}
        note="Spread is disagreement across GEFS, ECMWF and ICON ensemble members at one grid point. Rain probability is the share of members reaching 0.5 mm/h; it is not a calibrated probability or an official warning."
      >
        {ensemble?.status === "LIVE" && ensemble.hours?.length ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric
                label="Members"
                value={formatValue(ensemble.summary?.member_count, "", 0)}
                unit="runs"
                sub={`${formatValue(ensemble.summary?.model_count, "", 0)} model ensembles`}
              />
              <Metric
                label="Mean temp spread"
                value={formatValue(ensemble.summary?.temperature_spread_mean_c, "", 1)}
                unit="°C"
              />
              <Metric
                label="Widest spread"
                value={formatValue(ensemble.summary?.temperature_spread_max_c, "", 1)}
                unit="°C"
                sub={
                  ensemble.summary?.temperature_spread_max_time
                    ? stamp(ensemble.summary.temperature_spread_max_time)
                    : undefined
                }
              />
              <Metric
                label="Peak rain probability"
                value={formatValue(ensemble.summary?.precipitation_probability_max_pct, "", 0)}
                unit="%"
                sub={
                  ensemble.summary?.precipitation_probability_max_time
                    ? stamp(ensemble.summary.precipitation_probability_max_time)
                    : undefined
                }
              />
            </div>
            <div className="wg-dc-table-wrap">
              <table className="wg-dc-table">
                <thead>
                  <tr>
                    <th>Valid</th>
                    <th>Mean temp</th>
                    <th>Spread</th>
                    <th>Rain probability</th>
                    <th>Mean rain</th>
                  </tr>
                </thead>
                <tbody>
                  {ensemble.hours.slice(0, 12).map((row) => (
                    <tr key={row.time}>
                      <td>{clock(row.time)}</td>
                      <td>{formatValue(row.temperature_mean_c, "°C", 1)}</td>
                      <td>{formatValue(row.temperature_spread_c, "°C", 1)}</td>
                      <td>{formatValue(row.precipitation_probability_pct, "%", 0)}</td>
                      <td>{formatValue(row.precipitation_mean_mm, "mm", 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="wg-dc-caption">
              Forecast uncertainty only. A narrow spread does not guarantee accuracy; a wide spread signals
              disagreement. Follow IMD and NDMA warnings for safety decisions.
            </p>
          </>
        ) : (
          <Unavailable title="Ensemble members unavailable">
            The Open-Meteo Ensemble API did not return usable member data. No spread or probability is estimated in
            its place.
          </Unavailable>
        )}
      </TopicSection>

      <TopicSection number="10" title="Forecast Accuracy & Verification" status="UNAVAILABLE" source="No verification archive connected" note="WeatherGPT does not store a scored forecast-versus-observation archive for this location. Model spread is shown in topic 09 as disagreement, not accuracy.">
        <Unavailable title="Verification is not available">A defensible verification score requires aligned historical forecasts and quality-controlled observations. No such dataset is connected here, so no hit rate, MAE or confidence score is displayed.</Unavailable>
      </TopicSection>

      <TopicSection number="11" title="Severe Weather Probability" status="DERIVED" source="WeatherGPT deterministic risk engine" timestamp={risk?.data_type ? `Data type: ${risk.data_type}` : undefined} note="This is a deterministic threshold screen over forecast inputs, not a calibrated probability and not an official warning. Always follow IMD, NDMA and local authorities.">
        {risk ? (
          <>
            <div className="wg-dc-risk-head">
              <div><span>Overall screening</span><b className={`wg-dc-level-text ${toneForLevel(risk.overall)}`}>{risk.overall}</b></div>
              <p>{risk.advisories?.[0] || "No advisory text returned."}</p>
            </div>
            <div className="wg-dc-levels">{levelGrid(risk.levels)}</div>
            <p className="wg-dc-caption">Source: {risk.source}. {risk.disclaimer}</p>
          </>
        ) : <Unavailable title="Risk screen unavailable">The deterministic risk endpoint did not return a result. No severe-weather probability is fabricated.</Unavailable>}
      </TopicSection>

      <TopicSection number="12" title="Rainfall Anomaly & Monsoon Analysis" status={anomaly?.available ? "OBSERVED" : "UNAVAILABLE"} source={anomaly?.source || "Open-Meteo Archive API (ERA5)"} sourceUrl={anomaly?.sourceUrl} timestamp={anomaly?.period} note="Anomaly compares the latest 30 and 90 days with the same calendar windows in the previous five years. ERA5 is reanalysis, not a rain-gauge measurement.">
        {anomaly?.available ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="30-day rainfall" value={formatValue(anomaly.current30, "", 1)} unit="mm" />
              <Metric label="5-year mean" value={formatValue(anomaly.mean30, "", 1)} unit="mm" />
              <Metric label="30-day anomaly" value={formatValue(anomaly.anomaly30, "", 1)} unit="mm" sub={`${formatValue(anomaly.pct30, "%", 0)} vs mean`} />
              <Metric label="Dry days / 90" value={`${anomaly.dryDays90 ?? "—"}`} sub={`Baseline ${formatValue(anomaly.meanDryDays90, "", 0)}`} />
            </div>
            {climate?.months?.length ? <BarChart title={`Monthly rainfall — ${climate.year || 2025} (ERA5)`} labels={climate.months.map((month) => month.month)} values={climate.months.map((month) => month.total_rain_mm)} unit="mm" color="#2dd4bf" /> : null}
          </>
        ) : <Unavailable title="Rainfall anomaly unavailable">The archive request did not return enough comparable data. No anomaly percentage is shown.</Unavailable>}
      </TopicSection>

      <TopicSection number="13" title="Flash-Flood Potential" status={flood?.risk ? "COMPUTED" : "UNAVAILABLE"} source={flood?.source || "WeatherGPT flood proxy"} timestamp={flood?.updated_at_ist} note="This is a rain-plus-elevation proxy, not a hydraulic model or measured inundation. The satellite panel is a delayed flood-water composite, not a live extent map.">
        {flood ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="Proxy risk" value={flood.risk} tone={toneForLevel(flood.risk)} />
              <Metric label="Score" value={formatValue(flood.score, "", 0)} />
              <Metric label="Rain 24 h" value={formatValue(flood.rain_24h_mm, "", 1)} unit="mm" />
              <Metric label="Elevation" value={formatValue(flood.elevation_m, "", 0)} unit="m" />
            </div>
            <p className="wg-dc-note">{flood.drivers?.length ? `Drivers: ${flood.drivers.join(", ")}. ` : ""}{flood.limits || ""}</p>
          </>
        ) : <Unavailable title="Flood proxy unavailable">The flood-risk endpoint has not returned a result. No flood level is inferred.</Unavailable>}
        {hasPoint ? (
          <LocalSatelliteImagery
            lat={lat}
            lon={lon}
            place={place}
            layerId="flood"
            title={`NASA MODIS flood-water composite around ${place}`}
            description="MODIS combined 2-day flood composite. Delayed satellite classification, not observed inundation depth and not a live flood extent."
          />
        ) : null}
        <button type="button" className="wg-dc-link" onClick={() => onTab?.("risk")}>Open FloodWatch <ArrowRight size={14} aria-hidden="true" /></button>
      </TopicSection>

      <TopicSection number="14" title="River & Catchment Monitoring" status="UNAVAILABLE" source="No river-gauge feed connected" note="A catchment view requires gauge levels, discharge and reservoir operations. WeatherGPT currently has none of these for this location.">
        <Unavailable title="No river telemetry">No river gauge, discharge or reservoir feed is connected. The flash-flood proxy in topic 13 is rainfall and elevation context only; it is not a river-level observation.</Unavailable>
      </TopicSection>

      <TopicSection number="15" title="Cyclone & Tropical System Tracking" status="PARTIAL" source="WeatherGPT wind/rain heuristic" timestamp={forecast ? stamp(hourly.time?.[index]) : undefined} note="The risk engine's cyclone category is a wind/rain heuristic. It does not detect, name, locate or track a tropical cyclone.">
        {forecast ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="Cyclone screen" value={risk?.levels?.cyclone || "—"} tone={toneForLevel(risk?.levels?.cyclone)} />
              <Metric label="Peak wind" value={formatValue(peakWind, "", 0)} unit="km/h" />
              <Metric label="Peak gust" value={formatValue(peakGust, "", 0)} unit="km/h" />
              <Metric label="72 h rain" value={formatValue(rain72, "", 1)} unit="mm" />
            </div>
            <Unavailable title="No track or cone is shown">No official cyclone track, intensity forecast or wind-radius product is connected. Use IMD and RSMC bulletins for tropical-system decisions.</Unavailable>
          </>
        ) : waiting}
      </TopicSection>

      <TopicSection number="16" title="Lightning & Convective Hazards" status="PARTIAL" source="Open-Meteo CAPE and weather code" timestamp={forecast ? stamp(hourly.time?.[index]) : undefined} note="There is no lightning detection network in this build. CAPE and weather codes are convective screening signals, not lightning observations or strike probabilities.">
        {forecast ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="Peak CAPE" value={formatValue(peakCape, "", 0)} unit="J/kg" />
              <Metric label="Thunder-code hours" value={stormHours} unit="of 48 h" />
              <Metric label="Peak gust" value={formatValue(peakGust, "", 0)} unit="km/h" />
              <Metric label="Rain 3 h" value={formatValue(rain3, "", 1)} unit="mm" />
            </div>
            <Unavailable title="No strike data">Lightning detection requires a dedicated network. No strike count, distance or probability is claimed here.</Unavailable>
          </>
        ) : waiting}
      </TopicSection>

      <TopicSection number="17" title="Visibility & Fog Analysis" status="FORECAST" source="Open-Meteo" timestamp={forecast ? stamp(hourly.time?.[index]) : undefined} note="Visibility is a model field, not a transmissometer observation. Local fog can be more localized or denser than the grid value.">
        {forecast ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="Current visibility" value={formatValue(visibility, "", 0)} unit="m" tone={visibility < 1000 ? "warn" : ""} />
              <Metric label="24 h minimum" value={formatValue(minVisibility, "", 0)} unit="m" />
              <Metric label="Humidity" value={formatValue(humidity, "", 0)} unit="%" />
              <Metric label="Dew point" value={formatValue(hourly.dew_point_2m?.[index], "", 1)} unit="°C" />
            </div>
            <TrendChart title="Visibility — next 24 h" labels={labels24} series={[{ label: "Visibility", values: next24.values("visibility").map((value) => (value === null ? null : value / 1000)), color: "#a78bfa", unit: "km" }]} yUnit="km" digits={1} />
          </>
        ) : waiting}
      </TopicSection>

      <TopicSection number="18" title="Air Quality & Aerosols" status={air ? "FORECAST" : "UNAVAILABLE"} source={air?.source || "Open-Meteo Air Quality"} sourceUrl={air?.sourceUrl} timestamp={air?.hourly?.time?.[airIndex] ? clock(air.hourly.time[airIndex]) : undefined} note="Air-quality fields are provider-model output, not a local monitor. AQI is US EPA scale. Aerosol optical depth is a satellite column measure, not surface PM2.5.">
        {air ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="US AQI" value={formatValue(usAqi, "", 0)} tone={usAqi > 150 ? "warn" : ""} sub={usAqi > 100 ? "Unhealthy for sensitive groups or worse" : "Provider scale"} />
              <Metric label="PM2.5" value={formatValue(pm25, "", 1)} unit="µg/m³" />
              <Metric label="PM10" value={formatValue(pm10, "", 1)} unit="µg/m³" />
              <Metric label="Ozone" value={formatValue(ozone, "", 1)} unit="µg/m³" />
            </div>
            <TrendChart title="US AQI — next 24 h" labels={aqLabels} series={[{ label: "US AQI", values: aqValues, color: "#fbbf24" }]} yUnit="AQI" />
            {hasPoint ? (
              <LocalSatelliteImagery
                lat={lat}
                lon={lon}
                place={place}
                layerId="aod"
                title={`MODIS aerosol optical depth around ${place}`}
                description="NASA GIBS daily aerosol optical depth. It indicates column aerosol loading, not surface air quality or PM2.5."
              />
            ) : null}
          </>
        ) : <Unavailable title="Air-quality data unavailable">No air-quality values were returned. No AQI is estimated or filled in.</Unavailable>}
      </TopicSection>

      <TopicSection number="19" title="Soil Moisture & Agricultural Stress" status="FORECAST" source="Open-Meteo land variables" timestamp={forecast ? stamp(hourly.time?.[index]) : undefined} note="Soil moisture and temperature are model fields for shallow layers. They are not probe measurements and do not diagnose crop stress by themselves.">
        {forecast ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="0–7 cm moisture" value={formatValue(hourly.soil_moisture_0_to_7cm?.[index], "", 3)} unit="m³/m³" />
              <Metric label="7–28 cm moisture" value={formatValue(hourly.soil_moisture_7_to_28cm?.[index], "", 3)} unit="m³/m³" />
              <Metric label="0–7 cm temperature" value={formatValue(hourly.soil_temperature_0_to_7cm?.[index], "", 1)} unit="°C" />
              <Metric label="ET₀ today" value={formatValue(daily.et0_fao_evapotranspiration?.[0], "", 2)} unit="mm" />
            </div>
            <TrendChart title="Soil moisture — next 24 h" labels={labels24} series={[
              { label: "0–7 cm", values: next24.values("soil_moisture_0_to_7cm"), color: "#2dd4bf", unit: "m³/m³" },
              { label: "7–28 cm", values: next24.values("soil_moisture_7_to_28cm"), color: "#38bdf8", unit: "m³/m³" },
            ]} yUnit="m³/m³" digits={3} />
          </>
        ) : waiting}
      </TopicSection>

      <TopicSection number="20" title="Drought & Water Stress" status={anomaly?.available ? "DERIVED" : "UNAVAILABLE"} source="ERA5 rainfall anomaly + model soil moisture" timestamp={anomaly?.period} note="This is a rainfall and soil-moisture context screen. It is not an official drought declaration, groundwater assessment or reservoir balance.">
        {anomaly?.available ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="90-day anomaly" value={formatValue(anomaly.anomaly90, "", 1)} unit="mm" sub={`${formatValue(anomaly.pct90, "%", 0)} vs 5-year mean`} />
              <Metric label="90-day rainfall" value={formatValue(anomaly.current90, "", 1)} unit="mm" />
              <Metric label="Dry days" value={`${anomaly.dryDays90}`} unit="of 90" sub={`Baseline ${formatValue(anomaly.meanDryDays90, "", 0)}`} />
              <Metric label="Shallow soil moisture" value={formatValue(hourly.soil_moisture_0_to_7cm?.[index], "", 3)} unit="m³/m³" />
            </div>
            <p className="wg-dc-caption">Baseline years: {anomaly.baselineYears}. Negative rainfall anomaly indicates a drier-than-baseline window; it does not by itself establish drought impacts.</p>
          </>
        ) : <Unavailable title="Drought context unavailable">The archive anomaly could not be computed. No drought category is assigned.</Unavailable>}
      </TopicSection>

      <TopicSection number="21" title="Coastal & Marine Forecast" status={marine?.available ? "FORECAST" : "NO COVERAGE"} source={marine?.source || "Open-Meteo Marine API"} sourceUrl={marine?.sourceUrl} timestamp={marine?.hourly?.time?.[0] ? stamp(marine.hourly.time[0]) : undefined} note="Marine values are requested at the selected coordinates. Inland points legitimately have no marine grid; no coastal data from another city is substituted.">
        {marine?.available ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="Wave height" value={formatValue(maxOf((marine.hourly.wave_height || []).slice(0, 24)), "", 2)} unit="m" />
              <Metric label="Wave period" value={formatValue(meanOf((marine.hourly.wave_period || []).slice(0, 24)), "", 1)} unit="s" />
              <Metric label="Sea temperature" value={formatValue(marine.hourly.sea_surface_temperature?.[0], "", 1)} unit="°C" />
              <Metric label="Direction" value={windLabel(marine.hourly.wave_direction?.[0])} />
            </div>
            <TrendChart title="Wave height — next 24 h" labels={(marine.hourly.time || []).slice(0, 24).map(clock)} series={[{ label: "Wave height", values: (marine.hourly.wave_height || []).slice(0, 24), color: "#38bdf8", unit: "m" }]} yUnit="m" digits={2} />
          </>
        ) : <Unavailable title="No marine coverage at this point">The Open-Meteo Marine API returned no usable wave grid for the selected coordinates. This is expected inland. No distant coastal station is presented as local.</Unavailable>}
      </TopicSection>

      <TopicSection number="22" title="Solar Radiation & Cloud Impact" status="FORECAST" source="Open-Meteo" timestamp={forecast ? stamp(hourly.time?.[index]) : undefined} note="Radiation values are model estimates for a horizontal or modelled plane. They are not a pyranometer measurement or a bankable solar yield forecast.">
        {forecast ? (
          <>
            <div className="wg-dc-metric-grid four">
              <Metric label="Daily radiation sum" value={formatValue(radiationDaily, "", 1)} unit="MJ/m²" />
              <Metric label="UV maximum" value={formatValue(uvMax, "", 1)} />
              <Metric label="Cloud cover" value={formatValue(cloud, "", 0)} unit="%" />
              <Metric label="Sunshine today" value={formatValue((daily.sunshine_duration?.[0] || 0) / 3600, "", 1)} unit="h" />
            </div>
            <TrendChart title="Shortwave and direct radiation — next 24 h" labels={labels24} series={[
              { label: "Shortwave", values: next24.values("shortwave_radiation"), color: "#fbbf24", unit: "W/m²" },
              { label: "Direct", values: next24.values("direct_radiation"), color: "#f97316", unit: "W/m²" },
            ]} yUnit="W/m²" />
          </>
        ) : waiting}
      </TopicSection>

      <TopicSection number="23" title="Upper-Air & Vertical Profiles" status={forecast ? "FORECAST" : "UNAVAILABLE"} source="Open-Meteo pressure-level variables" timestamp={forecast ? stamp(hourly.time?.[index]) : undefined} note="This is a model profile at 2 m, 850 hPa and 500 hPa. It is not a radiosonde observation and does not resolve fine-scale inversions.">
        {forecast ? (
          <div className="wg-dc-profile-grid">
            <VerticalProfile
              title={`Model profile — ${clock(hourly.time?.[index])} IST`}
              levels={[
                { label: "2 m", temperature: temp, humidity },
                { label: "850 hPa", temperature: hourly.temperature_850hPa?.[index], humidity: hourly.relative_humidity_850hPa?.[index] },
                { label: "500 hPa", temperature: hourly.temperature_500hPa?.[index] },
              ]}
            />
            <div className="wg-dc-metric-grid two">
              <Metric label="850 hPa wind" value={formatValue(hourly.wind_speed_850hPa?.[index], "", 0)} unit="km/h" sub={windLabel(hourly.wind_direction_850hPa?.[index])} />
              <Metric label="850 hPa height" value={formatValue(hourly.geopotential_height_850hPa?.[index], "", 0)} unit="m" />
              <Metric label="500 hPa height" value={formatValue(hourly.geopotential_height_500hPa?.[index], "", 0)} unit="m" />
              <Metric label="Freezing level" value={formatValue(hourly.freezing_level_height?.[index], "", 0)} unit="m" />
            </div>
          </div>
        ) : waiting}
      </TopicSection>

      <TopicSection number="24" title="Weather Timeline & Event Replay" status={forecast ? "FORECAST" : "UNAVAILABLE"} source="Open-Meteo forecast + RainViewer past frames" timestamp={forecast ? stamp(hourly.time?.[index]) : undefined} note="The table is a forecast timeline. Event replay here means the short RainViewer radar sequence, not a reanalysis of a past weather event.">
        {forecast ? (
          <>
            <div className="wg-dc-table-wrap">
              <table className="wg-dc-table">
                <thead><tr><th>Time (IST)</th><th>Temperature</th><th>Rain</th><th>Probability</th><th>Wind</th><th>Cloud</th></tr></thead>
                <tbody>
                  {Array.from({ length: 12 }).map((_, offset) => {
                    const at = index + offset;
                    return (
                      <tr key={hourly.time?.[at] || offset}>
                        <th>{clock(hourly.time?.[at])}</th>
                        <td>{formatValue(hourly.temperature_2m?.[at], "°C", 1)}</td>
                        <td>{formatValue(hourly.precipitation?.[at], "mm", 1)}</td>
                        <td>{formatValue(hourly.precipitation_probability?.[at], "%", 0)}</td>
                        <td>{formatValue(hourly.wind_speed_10m?.[at], "km/h", 0)}</td>
                        <td>{formatValue(hourly.cloud_cover?.[at], "%", 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="wg-dc-caption">Radar sequence available: {radarFrames.length} past frames{radarFrames.length ? `, latest ${frameTimeLabel(radarFrames[radarFrames.length - 1])}` : ""}. Frame times are provider timestamps, not model valid times.</p>
          </>
        ) : waiting}
      </TopicSection>

      <TopicSection number="25" title="AI Weather Analyst" status="DERIVED" source="Deterministic WeatherGPT summary from displayed values" timestamp={forecast ? stamp(forecast.fetchedAt) : undefined} note="This analyst is a deterministic template over the values shown above. It is not an LLM, does not add facts, and cannot predict beyond the retrieved horizon.">
        {forecast ? (
          <div className="wg-dc-analyst">
            <ul>{analyst.map((line) => <li key={line}>{line}</li>)}</ul>
            <p className="wg-dc-caption">Signals are model or deterministic-screen outputs. Follow official warnings for safety decisions.</p>
            <button type="button" className="wg-dc-link" onClick={() => onAsk?.(`Explain this Deep-Cast for ${place}: temperature ${formatValue(temp, "°C", 1)}, 24h rain ${formatValue(rain24, "mm", 1)}, peak CAPE ${formatValue(peakCape, "J/kg", 0)}, risk ${risk?.overall || "unavailable"}. Distinguish model values from observations and do not add facts.`)}>
              Ask the AI Assistant about this forecast <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        ) : waiting}
      </TopicSection>

      <footer className="wg-dc-footer">
        <p><b>Data classification:</b> forecast/model values are not observations; NASA GIBS imagery is delayed; RainViewer frames are observed radar with provider delay; risk and flood values are deterministic WeatherGPT screens, not official warnings.</p>
        <p>Sources: Open-Meteo Forecast, Air Quality, Marine, Archive (ERA5), NASA GIBS, RainViewer, WeatherGPT risk engine. Free/open sources only. No paid API or key is used on this page.</p>
      </footer>
    </div>
  );
}
