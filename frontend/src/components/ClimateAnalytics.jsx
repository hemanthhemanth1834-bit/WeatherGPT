import React, { useState, useEffect } from "react";
import { TrendingUp, AlertCircle, Calendar, Sparkles, BarChart2, CloudRain, Flame } from "lucide-react";
import { fetchClimateTrends } from "../services/api";

export default function ClimateAnalytics({ onAskAI }) {
  const [climateData, setClimateData] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState("All India");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const data = await fetchClimateTrends(selectedRegion);
        setClimateData(data);
      } catch (e) {
        console.error(e);
        setLoadError("Climate data unavailable — backend unreachable or request timed out. Please retry.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [selectedRegion]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6 animate-fadeIn">
      {/* Climate Header Banner */}
      <div className="glass-card p-6 border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-gray-900/90 to-gray-900/90">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider mb-1">
              <TrendingUp size={16} /> IMD Multi-Decadal Climate & Monsoon Anomaly Analytics
            </div>
            <h2 className="text-2xl font-extrabold text-white">
              Historical Climate Trends & Anomaly Detection (1970 - 2026)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Evaluating long-period averages (LPA), temperature departures, and spatial shifts in Indian monsoon rainfall.
            </p>
            <p className="mt-1.5 inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/40">
              STATIC REFERENCE series — not live station observations.
            </p>
          </div>

          <button
            onClick={() => onAskAI("Explain the 50-year climate warming and monsoon rainfall shift trends in India")}
            className="btn-primary text-xs py-2 px-3.5 bg-gradient-to-r from-purple-600 to-indigo-600"
          >
            <Sparkles size={14} /> AI Climate Synthesis
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="p-3.5 rounded-2xl border border-red-500/40 bg-red-950/40 text-xs text-red-200">
          ⚠️ {loadError}
        </div>
      )}

      {climateData && (
        <div className="space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-5 border border-red-500/20 bg-red-950/10">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs mb-1">
                <Flame size={16} /> Decadal Surface Warming
              </div>
              <div className="text-3xl font-extrabold text-white font-mono mt-1">
                +1.34°C
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Temperature departure above 1961-1990 IMD baseline normal.
              </div>
            </div>

            <div className="glass-card p-5 border border-sky-500/20 bg-sky-950/10">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs mb-1">
                <CloudRain size={16} /> Southwest Monsoon LPA Baseline
              </div>
              <div className="text-3xl font-extrabold text-white font-mono mt-1">
                {climateData.lpa_monsoon_rainfall_mm} mm
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Long Period Average (1971–2020) national monsoon benchmark.
              </div>
            </div>

            <div className="glass-card p-5 border border-amber-500/20 bg-amber-950/10">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                <AlertCircle size={16} /> Extreme Weather Frequency
              </div>
              <div className="text-3xl font-extrabold text-white font-mono mt-1">
                +75% Rise
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Increase in high-intensity convective rainfall days (&gt;150mm).
              </div>
            </div>
          </div>

          {/* Decadal Historical Table & Chart Visualization */}
          <div className="glass-card p-6 border border-gray-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-purple-400" />
              Decadal Climate Departures & Anomaly Matrix
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Decade / Year</th>
                    <th className="py-2.5 px-3">Temp Anomaly (°C)</th>
                    <th className="py-2.5 px-3">Monsoon Departure (%)</th>
                    <th className="py-2.5 px-3">Extreme Weather Events Index</th>
                    <th className="py-2.5 px-3">IMD Climate Indicator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  {climateData.decadal_years.map((year, idx) => {
                    const temp = climateData.temperature_anomaly_celsius[idx];
                    const dep = climateData.monsoon_departure_pct[idx];
                    const ext = climateData.extreme_weather_event_count[idx];
                    return (
                      <tr key={year} className="hover:bg-gray-900/50 transition">
                        <td className="py-3 px-3 font-bold text-white font-mono">{year}</td>
                        <td className="py-3 px-3 font-mono">
                          <span className={`font-semibold ${temp > 0.5 ? "text-red-400" : (temp > 0 ? "text-amber-300" : "text-emerald-400")}`}>
                            {temp > 0 ? `+${temp}` : temp}°C
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className={`font-semibold ${dep >= 0 ? "text-sky-400" : "text-amber-400"}`}>
                            {dep >= 0 ? `+${dep}` : dep}%
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-200">
                          {ext} Days / Year
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            idx > 5 ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}>
                            {idx > 5 ? "Elevated Warming Regime" : "Stable Baseline Normals"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Regional Insights List */}
          <div className="glass-card p-5 border border-gray-800 space-y-3">
            <h4 className="text-sm font-bold text-gray-200">
              📌 Key Scientific Insights (MoES / IITM Climate Assessment):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {climateData.key_insights.map((ins, i) => (
                <div key={i} className="p-3.5 bg-gray-950/60 rounded-xl border border-gray-800 text-xs text-gray-300 leading-relaxed">
                  {ins}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
