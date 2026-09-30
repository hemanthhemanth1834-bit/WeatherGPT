import React, { useState, useEffect } from "react";
import { 
  Sun, CloudSun, CloudRain, CloudLightning, CloudDrizzle, CloudFog, Cloud, Snowflake,
  Wind, Droplets, Compass, Gauge, Sunrise, Sunset, Eye, AlertTriangle, ShieldCheck, 
  MapPin, Sparkles, ArrowUpRight, ChevronRight, Navigation, Layers
} from "lucide-react";
import { fetchRegionalTalukas } from "../services/api";
import SourceBadge from "./SourceBadge";
import RiskPanel from "./RiskPanel";

export function getDynamicWeatherIcon(condition = "", iconName = "", size = 20) {
  const cond = condition.toLowerCase();
  const ic = (iconName || "").toLowerCase();

  if (cond.includes("thunder") || cond.includes("lightning") || cond.includes("hail") || ic.includes("lightning") || ic.includes("hail")) {
    return <CloudLightning size={size} className="text-amber-400" />;
  }
  if (cond.includes("heavy rain") || cond.includes("violent") || cond.includes("squall") || ic.includes("rainwind")) {
    return <CloudRain size={size} className="text-blue-400 animate-pulse" />;
  }
  if (cond.includes("rain") || cond.includes("shower") || ic.includes("rain")) {
    return <CloudRain size={size} className="text-sky-400" />;
  }
  if (cond.includes("drizzle") || ic.includes("drizzle")) {
    return <CloudDrizzle size={size} className="text-cyan-400" />;
  }
  if (cond.includes("snow") || ic.includes("snowflake")) {
    return <Snowflake size={size} className="text-indigo-200" />;
  }
  if (cond.includes("fog") || cond.includes("haze") || ic.includes("fog")) {
    return <CloudFog size={size} className="text-slate-400" />;
  }
  if (cond.includes("overcast") || ic === "cloud") {
    return <Cloud size={size} className="text-slate-300" />;
  }
  if (cond.includes("partly") || cond.includes("mainly") || ic.includes("cloudsun")) {
    return <CloudSun size={size} className="text-amber-300" />;
  }
  return <Sun size={size} className="text-amber-400" />;
}

export default function WeatherDashboard({ weatherData, isLoading, onAskAI }) {
  const [talukas, setTalukas] = useState([]);

  useEffect(() => {
    if (weatherData && weatherData.location) {
      const loc = weatherData.location.toLowerCase();
      const region = loc.includes("pune") || loc.includes("wagholi") || loc.includes("hinjawadi") || loc.includes("kothrud") || loc.includes("hadapsar") || loc.includes("baramati") 
        ? "pune" 
        : (loc.includes("mumbai") || loc.includes("andheri") || loc.includes("thane") ? "mumbai" : "pune");
      
      fetchRegionalTalukas(region).then((res) => {
        if (res && res.length > 0) setTalukas(res);
      });
    }
  }, [weatherData?.location]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-3">
        <div className="w-12 h-12 rounded-full border-4 border-sky-500 border-t-transparent animate-spin"></div>
        <p className="text-xs text-slate-400 font-medium">Fetching real-time NWP observations, 24h future predictions & satellite feeds...</p>
      </div>
    );
  }

  if (!weatherData) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm">
        No weather telemetry available. Please search a location or click auto-detect.
      </div>
    );
  }

  // Calculate upcoming rain highlights
  const hourly = weatherData.hourly || [];
  const currentRainProb = hourly[0]?.rain_prob || (weatherData.precipitation > 0 ? 70 : 10);
  const next12Hours = hourly.slice(0, 12);
  const peakRainProb = next12Hours.length > 0 ? Math.max(...next12Hours.map(h => h.rain_prob)) : currentRainProb;
  const peakRainHour = next12Hours.find(h => h.rain_prob === peakRainProb);
  const todayRainSum = weatherData.daily[0]?.rain_sum || weatherData.precipitation || 0.0;
  const isRainActive = weatherData.precipitation > 0 || (weatherData.condition_code >= 51 && weatherData.condition_code <= 99);
  const isRainPredicted = peakRainProb >= 40 || todayRainSum > 1.0;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 space-y-5 animate-fadeIn">
      {/* Source transparency: every important weather result identifies its source */}
      <SourceBadge
        source={weatherData.data_source || "Open-Meteo"}
        updated={weatherData.updated_at_ist || ""}
        dataType={weatherData.data_type || "Forecast"}
        status={weatherData.status || "LIVE"}
      />
      {/* Real-time Precipitation / Severe Weather Banner */}
      {(isRainActive || isRainPredicted) && (
        <div className={`p-4 rounded-3xl border shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isRainActive || peakRainProb >= 70
            ? "bg-gradient-to-r from-blue-950/90 via-sky-950/80 to-slate-900/90 border-sky-500/40 text-sky-100 shadow-sky-950/50"
            : "bg-gradient-to-r from-slate-900/90 via-sky-950/50 to-slate-900/90 border-slate-700/80 text-slate-200"
        }`}>
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-sky-500/20 border border-sky-400/30 text-sky-300 flex-shrink-0">
              <CloudRain size={24} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                  {isRainActive ? "Active Rainfall Spell" : "Precipitation Forecast Window"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-500/40">
                  {peakRainProb}% Probability
                </span>
              </div>
              <p className="text-xs text-slate-200 font-medium mt-0.5">
                {isRainActive 
                  ? `Active precipitation (${weatherData.precipitation} mm) recorded in ${weatherData.location}. Convective rain spells expected to persist with peak around ${peakRainHour?.time || "upcoming hours"}.`
                  : `Elevated rain probability reaching ${peakRainProb}% around ${peakRainHour?.time || "later today"}. Predicted 24h accumulation: ${todayRainSum} mm.`
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => onAskAI(`Explain rainfall and micro-cloudburst conditions for ${weatherData.location} today and upcoming days`)}
            className="flex-shrink-0 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 rounded-xl transition shadow-md flex items-center gap-1"
          >
            <span>Rain Breakdown</span>
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Primary Hero Weather Card */}
      <div className="glass-card p-6 border border-slate-700/80 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-sky-950/40">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          {/* Location & Temp Details */}
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
              <MapPin size={14} />
              <span>{weatherData.location}, {weatherData.state}</span>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded-full border border-sky-500/30 font-mono">
                {weatherData.nwp_model}
              </span>
            </div>
            <div className="flex items-baseline gap-4 mt-2">
              <span className="text-6xl sm:text-7xl font-black tracking-tight text-white font-heading">
                {weatherData.current_temp}°
                <span className="text-3xl text-slate-400 font-normal">C</span>
              </span>
              <div>
                <div className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <span>{weatherData.condition}</span>
                  {getDynamicWeatherIcon(weatherData.condition, "", 22)}
                </div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">
                  Feels like <span className="text-slate-200 font-semibold">{weatherData.feels_like}°C</span> • High: <span className="text-white font-bold">{weatherData.daily[0]?.temp_max}°C</span> / Low: <span className="text-slate-400 font-medium">{weatherData.daily[0]?.temp_min}°C</span>
                </div>
              </div>
            </div>
          </div>

          {/* AQI Indicator & Ask AI button */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3 bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Air Quality (AQI)</div>
                <div className="text-xs font-bold text-white">
                  <span className="text-emerald-400 font-extrabold">{weatherData.aqi_status}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-extrabold text-sm font-mono shadow-sm">
                {weatherData.aqi}
              </div>
            </div>

            <button
              onClick={() => onAskAI(`Provide a comprehensive weather, rain, and hazard outlook for ${weatherData.location} for this week.`)}
              className="btn-primary text-xs py-2 px-3.5"
            >
              <Sparkles size={14} /> Ask WeatherGPT Insights
            </button>
          </div>
        </div>

        {/* 4-Metric Grid Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/90 shadow-sm">
            <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/20">
              <Droplets size={20} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Humidity</div>
              <div className="text-base font-extrabold text-white">{weatherData.humidity}%</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/90 shadow-sm">
            <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/20">
              <Wind size={20} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Wind Velocity</div>
              <div className="text-base font-extrabold text-white">
                {weatherData.wind_speed} <span className="text-xs font-normal text-slate-400">km/h {weatherData.wind_direction}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/90 shadow-sm">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Sun size={20} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">UV Index</div>
              <div className="text-base font-extrabold text-white">
                {weatherData.uv_index} <span className="text-[10px] font-semibold text-amber-300">({weatherData.uv_index > 7 ? 'High' : 'Moderate'})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/90 shadow-sm">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              <Gauge size={20} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Surface Pressure</div>
              <div className="text-base font-extrabold text-white">{weatherData.pressure} <span className="text-xs font-normal text-slate-400">hPa</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Regional Taluka & Micro-Climate Explorer */}
      {talukas.length > 0 && (
        <div className="glass-card p-4 border border-slate-800/80">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-sky-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Micro-Location & Taluka Explorer ({weatherData.location} Region)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">1-Click Micro-Climate Switch</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {talukas.map((t, idx) => {
              const isCurrent = weatherData.location.toLowerCase() === t.name.toLowerCase();
              return (
                <button
                  key={idx}
                  onClick={() => onAskAI(`Detailed weather and rain outlook for ${t.name}, Pune`)}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition text-left ${
                    isCurrent
                      ? "bg-sky-500/20 border-sky-400/50 text-sky-200 shadow-sm"
                      : "bg-slate-950/70 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <MapPin size={11} className={isCurrent ? "text-sky-400" : "text-slate-500"} />
                  <div>
                    <div className="text-xs font-bold text-slate-100">{t.name}</div>
                    <div className="text-[9px] text-slate-400">{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 24-Hour Future Hourly Timeline */}
      <div className="glass-card p-5 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span>⏱️ 24-Hour Real-Time NWP Ensemble Timeline (Upcoming Hours)</span>
          </h3>
          <span className="text-[10px] text-sky-400 font-mono">0.125° IMD Ensemble Grid</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {weatherData.hourly.map((hr, idx) => {
            const isHighRain = hr.rain_prob >= 60;
            const isMidRain = hr.rain_prob >= 30;
            return (
              <div
                key={idx}
                className={`flex-shrink-0 flex flex-col items-center justify-between p-3 min-w-[100px] rounded-2xl border transition duration-200 ${
                  isHighRain
                    ? "bg-blue-950/40 border-sky-500/50 shadow-sm hover:bg-blue-900/40"
                    : "bg-slate-950/70 border-slate-800/90 hover:border-sky-500/50 hover:bg-slate-900"
                }`}
              >
                <span className="text-xs text-slate-300 font-mono font-bold">{hr.time}</span>
                <div className="my-2.5">
                  {getDynamicWeatherIcon(hr.condition, hr.icon, 24)}
                </div>
                <span className="text-sm font-extrabold text-white">{hr.temp}°</span>
                <span className={`text-[10px] mt-1 font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full border ${
                  isHighRain 
                    ? "bg-sky-500/25 text-sky-200 border-sky-400/50" 
                    : isMidRain 
                    ? "bg-sky-950/50 text-sky-300 border-sky-800/40" 
                    : "bg-slate-900 text-slate-400 border-slate-800"
                }`}>
                  💧 {hr.rain_prob}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7-Day Synoptic Matrix & Solar Astronomical Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-card p-5 border border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">
            📅 7-Day Synoptic Weather & Rainfall Outlook
          </h3>
          <div className="space-y-2.5">
            {weatherData.daily.map((day, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:bg-slate-900 transition"
              >
                <div className="w-20 font-bold text-xs text-slate-200">{day.day}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400 flex-1">
                  {getDynamicWeatherIcon(day.condition, day.icon, 18)}
                  <span className="font-medium text-slate-300">{day.condition}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className={`text-[11px] font-bold ${day.rain_sum > 2.0 ? "text-sky-300" : "text-slate-400"}`}>
                    💧 {day.rain_sum} mm
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-extrabold">{day.temp_max}°</span>
                    <span className="text-slate-500 font-medium">{day.temp_min}°</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Solar & Astro Details */}
        <div className="glass-card p-5 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            ☀️ Solar Cycle & Visibility
          </h3>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 text-amber-400">
                <Sunrise size={18} />
                <span className="text-xs text-slate-300 font-semibold">Sunrise</span>
              </div>
              <span className="text-xs font-bold text-white font-mono">{weatherData.sunrise} IST</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 text-orange-400">
                <Sunset size={18} />
                <span className="text-xs text-slate-300 font-semibold">Sunset</span>
              </div>
              <span className="text-xs font-bold text-white font-mono">{weatherData.sunset} IST</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 text-sky-400">
                <Eye size={18} />
                <span className="text-xs text-slate-300 font-semibold">Optical Visibility</span>
              </div>
              <span className="text-xs font-bold text-white">{weatherData.visibility} km</span>
            </div>
          </div>

          <div className="p-3 bg-sky-950/40 border border-sky-900/60 rounded-xl text-xs text-sky-200 leading-relaxed">
            💡 <strong>IMD Convective Warning:</strong> High spatial variance observed during monsoon convective showers across neighboring talukas. Always refer to Doppler radar for cloudburst cell tracking.
          </div>
        </div>
      </div>

      {/* Deterministic risk layer (ESTIMATED) */}
      <RiskPanel location={weatherData.location} />
    </div>
  );
}
