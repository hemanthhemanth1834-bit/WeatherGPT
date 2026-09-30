import React from "react";
import { Droplets, Wind, Eye, CloudRain, Sun, CloudSun, Cloud, CloudLightning, CloudFog, Radio } from "lucide-react";

export function getWeather3DIcon(conditionCode, conditionStr = "") {
  const cond = conditionStr.toLowerCase();
  if (cond.includes("thunder") || conditionCode === 95 || conditionCode === 96 || conditionCode === 99) {
    return (
      <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
        <div className="text-4xl sm:text-5xl filter drop-shadow-[0_8px_16px_rgba(234,179,8,0.4)] animate-pulse">
          ⛈️
        </div>
      </div>
    );
  }
  if (cond.includes("rain") || cond.includes("drizzle") || (conditionCode >= 51 && conditionCode <= 82)) {
    return (
      <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
        <div className="text-4xl sm:text-5xl filter drop-shadow-[0_8px_16px_rgba(56,189,248,0.4)] animate-bounce">
          🌧️
        </div>
      </div>
    );
  }
  if (cond.includes("partly") || conditionCode === 1 || conditionCode === 2) {
    return (
      <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
        <div className="text-4xl sm:text-5xl filter drop-shadow-[0_8px_16px_rgba(245,158,11,0.35)]">
          ⛅
        </div>
      </div>
    );
  }
  if (cond.includes("fog") || conditionCode === 45 || conditionCode === 48) {
    return (
      <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
        <div className="text-4xl sm:text-5xl filter drop-shadow-[0_8px_16px_rgba(148,163,184,0.3)]">
          🌫️
        </div>
      </div>
    );
  }
  if (cond.includes("overcast") || conditionCode === 3) {
    return (
      <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
        <div className="text-4xl sm:text-5xl filter drop-shadow-[0_8px_16px_rgba(148,163,184,0.4)]">
          ☁️
        </div>
      </div>
    );
  }
  // Default Sunny
  return (
    <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
      <div className="text-4xl sm:text-5xl filter drop-shadow-[0_8px_20px_rgba(251,191,36,0.5)] animate-spin-slow">
        ☀️
      </div>
    </div>
  );
}

export default function ModernWeatherCard({ weather }) {
  if (!weather) return null;

  const rainProb = weather.hourly && weather.hourly.length > 0 ? weather.hourly[0].rain_prob : (weather.precipitation > 0 ? 70 : 10);
  const visibilityKm = weather.visibility ? Math.round(weather.visibility) : 9;

  return (
    <div className="w-full max-w-lg mx-auto rounded-3xl p-6 sm:p-7 text-white relative overflow-hidden transition-all shadow-2xl border border-slate-700/60 bg-gradient-to-b from-[#152238] via-[#101b2f] to-[#0d1527]">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none -ml-12 -mb-12"></div>

      <div className="relative z-10">
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium tracking-wide">
              Current Weather
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5 font-heading">
              {weather.location}
            </h2>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              {weather.state || "India"} • Updated just now
            </p>
          </div>

          {/* Weather 3D Illustration */}
          <div>
            {getWeather3DIcon(weather.condition_code, weather.condition)}
          </div>
        </div>

        {/* Hero Temperature & Condition */}
        <div className="my-3">
          <div className="text-6xl sm:text-7xl font-extrabold text-white tracking-tight font-heading leading-none">
            {Math.round(weather.current_temp)}°
          </div>
          <div className="text-base sm:text-lg font-bold text-sky-400 mt-2">
            {weather.condition}
          </div>
          <div className="text-xs sm:text-sm text-slate-400 font-normal mt-0.5">
            Feels like {Math.round(weather.feels_like)}°C
          </div>
        </div>

        {/* 2x2 Metric Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-5">
          {/* Humidity */}
          <div className="bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 transition">
            <span className="text-xl">💧</span>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Humidity</div>
              <div className="text-sm font-bold text-white mt-0.5">{weather.humidity}%</div>
            </div>
          </div>

          {/* Wind */}
          <div className="bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 transition">
            <span className="text-xl">💨</span>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Wind</div>
              <div className="text-sm font-bold text-white mt-0.5">{Math.round(weather.wind_speed)} km/h</div>
            </div>
          </div>

          {/* Visibility */}
          <div className="bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 transition">
            <span className="text-xl">👁️</span>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Visibility</div>
              <div className="text-sm font-bold text-white mt-0.5">{visibilityKm} km</div>
            </div>
          </div>

          {/* Rain Prob */}
          <div className={`border backdrop-blur-md rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 transition ${
            rainProb >= 60 
              ? "bg-blue-900/40 border-sky-400/60 shadow-sm" 
              : "bg-slate-800/40 hover:bg-slate-800/60 border-slate-700/50"
          }`}>
            <span className="text-xl">🌧️</span>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">
                {weather.precipitation > 0 ? `Rain (${weather.precipitation} mm)` : "Rain Prob."}
              </div>
              <div className={`text-sm font-bold mt-0.5 ${rainProb >= 60 ? "text-sky-300" : "text-white"}`}>
                {rainProb}%
              </div>
            </div>
          </div>
        </div>

        {/* Footer Sub-bar */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400/80 mt-4 pt-2 border-t border-slate-800/60 font-medium">
          <Radio size={12} className="text-sky-400" />
          <span>IMD + OpenWeather GFS Model • 5 min refresh</span>
        </div>
      </div>
    </div>
  );
}
