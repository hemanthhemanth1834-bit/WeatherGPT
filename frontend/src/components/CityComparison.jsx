import React, { useState, useEffect } from "react";
import { 
  Scale, ArrowRightLeft, ShieldCheck, AlertTriangle, Wind, Droplets, 
  Sun, CloudRain, HeartPulse, Activity, Baby, Sparkles, Navigation, CheckCircle2, ChevronRight
} from "lucide-react";
import { fetchCityComparison } from "../services/api";

const PRESET_PAIRS = [
  { city1: "Mumbai", city2: "Delhi", label: "Mumbai vs Delhi (Financial vs National Capital)" },
  { city1: "Pune", city2: "Goa", label: "Pune vs Goa (Western Ghats to Coastal Corridor)" },
  { city1: "Bengaluru", city2: "Hyderabad", label: "Bengaluru vs Hyderabad (Tech Corridor)" },
  { city1: "Kolkata", city2: "Chennai", label: "Kolkata vs Chennai (East Coast vs Coromandel)" },
  { city1: "Shimla", city2: "Manali", label: "Shimla vs Manali (Himalayan Hill Stations)" }
];

export default function CityComparison({ onAskAI }) {
  const [city1, setCity1] = useState("Mumbai");
  const [city2, setCity2] = useState("Delhi");
  const [input1, setInput1] = useState("Mumbai");
  const [input2, setInput2] = useState("Delhi");
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activePersona, setActivePersona] = useState("athletes");

  const loadComparison = async (c1, c2) => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchCityComparison(c1, c2);
      setComparisonData(data);
      setCity1(c1);
      setCity2(c2);
      setInput1(c1);
      setInput2(c2);
    } catch (e) {
      console.error("Comparison load error:", e);
      setLoadError("Comparison unavailable — backend unreachable or request timed out. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComparison("Mumbai", "Delhi");
  }, []);

  const handleSwap = () => {
    const next1 = city2;
    const next2 = city1;
    loadComparison(next1, next2);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (input1.trim() && input2.trim()) {
      loadComparison(input1.trim(), input2.trim());
    }
  };

  const c1Data = comparisonData?.city1;
  const c2Data = comparisonData?.city2;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {loadError && (
        <div role="alert" className="p-3.5 rounded-2xl border border-red-500/40 bg-red-950/40 text-xs text-red-200">
          ⚠️ {loadError}
        </div>
      )}
      {/* Header Banner */}
      <div className="glass-card p-6 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-indigo-500/20 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Scale size={20} />
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-heading">
                City-vs-City Weather Intelligence & AQI Health Matrix
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Live dual-station telemetry comparison, inter-city travel safety index, and specialized vulnerability advisories for athletes, asthma patients, children, and elderly citizens.
            </p>
          </div>

          <button
            onClick={() => onAskAI(`Compare detailed meteorological telemetry and travel weather between ${city1} and ${city2}`)}
            className="btn-primary text-xs"
          >
            <Sparkles size={14} />
            <span>Ask AI Comparative Analysis</span>
          </button>
        </div>
      </div>

      {/* Preset Pairs Pills & Custom Selector Form */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Popular Comparisons:</span>
          {PRESET_PAIRS.map((pair, idx) => (
            <button
              key={idx}
              onClick={() => loadComparison(pair.city1, pair.city2)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                city1.toLowerCase() === pair.city1.toLowerCase() && city2.toLowerCase() === pair.city2.toLowerCase()
                  ? "bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              {pair.city1} ↔ {pair.city2}
            </button>
          ))}
        </div>

        {/* Custom Input Form */}
        <form onSubmit={handleCustomSubmit} className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">City 1 (Origin / Reference)</label>
            <input
              type="text"
              value={input1}
              onChange={(e) => setInput1(e.target.value)}
              placeholder="e.g. Mumbai, Pune, Nagpur..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={handleSwap}
            title="Swap Cities"
            className="p-2.5 mt-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700/80"
          >
            <ArrowRightLeft size={16} />
          </button>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">City 2 (Destination / Comparison)</label>
            <input
              type="text"
              value={input2}
              onChange={(e) => setInput2(e.target.value)}
              placeholder="e.g. Delhi, Goa, Bengaluru..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl mt-5 transition shadow-md disabled:opacity-50"
          >
            {isLoading ? "Comparing Telemetry..." : "Compare Live"}
          </button>
        </form>
      </div>

      {/* Comparison Overview Badges */}
      {comparisonData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Temperature Delta Card */}
          <div className="glass-card p-4 flex items-center gap-3.5 border-l-4 border-l-amber-500">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <Sun size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thermal Differential</span>
              <p className="text-sm font-bold text-white mt-0.5">
                {comparisonData.temp_warmer_city === "Equal" ? (
                  "Equal Ambient Temperature"
                ) : (
                  <span>
                    <strong className="text-amber-300">{comparisonData.temp_warmer_city}</strong> is{" "}
                    <span className="text-amber-400 font-black">+{Math.abs(comparisonData.temp_diff)}°C</span> warmer
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* AQI & Air Cleanliness Card */}
          <div className="glass-card p-4 flex items-center gap-3.5 border-l-4 border-l-emerald-500">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Air Quality Advantage</span>
              <p className="text-sm font-bold text-white mt-0.5">
                🌿 <strong className="text-emerald-300">{comparisonData.aqi_better_city}</strong> has cleaner air
              </p>
            </div>
          </div>

          {/* Travel & Highway Safety Card */}
          <div className="glass-card p-4 flex items-center gap-3.5 border-l-4 border-l-sky-500">
            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400">
              <Navigation size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Corridor Transit Score</span>
              <p className="text-sm font-bold text-white mt-0.5">
                <span className="text-sky-400 font-black">{comparisonData.travel_safety_score}/100</span> —{" "}
                <span className="text-slate-300">{comparisonData.travel_safety_score >= 80 ? "Optimal Drive" : "Caution Advised"}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dual Side-by-Side Weather Cards */}
      {c1Data && c2Data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* City 1 Card */}
          <div className="glass-card p-6 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-blue-950/40 border border-sky-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  Station 1 (Reference)
                </span>
                <h2 className="text-2xl font-black text-white mt-1.5 font-heading">
                  {c1Data.location}
                </h2>
                <p className="text-xs text-slate-400">{c1Data.state}, {c1Data.country}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black text-white font-heading tracking-tight">
                  {c1Data.current_temp}°C
                </div>
                <p className="text-xs text-slate-400">Feels like {c1Data.feels_like}°C</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Condition: {c1Data.condition}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                c1Data.aqi <= 50 ? "bg-emerald-500/20 text-emerald-300" :
                c1Data.aqi <= 100 ? "bg-green-500/20 text-green-300" :
                c1Data.aqi <= 200 ? "bg-yellow-500/20 text-yellow-300" :
                "bg-red-500/20 text-red-300"
              }`}>
                AQI {c1Data.aqi} ({c1Data.aqi_status})
              </span>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
                <span className="text-slate-400 block text-[10px]">💧 Humidity</span>
                <span className="font-bold text-white text-sm">{c1Data.humidity}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
                <span className="text-slate-400 block text-[10px]">💨 Wind</span>
                <span className="font-bold text-white text-sm">{c1Data.wind_speed} km/h</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
                <span className="text-slate-400 block text-[10px]">🌧️ Rain Sum</span>
                <span className="font-bold text-white text-sm">{c1Data.precipitation} mm</span>
              </div>
            </div>
          </div>

          {/* City 2 Card */}
          <div className="glass-card p-6 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/40 border border-indigo-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  Station 2 (Comparison)
                </span>
                <h2 className="text-2xl font-black text-white mt-1.5 font-heading">
                  {c2Data.location}
                </h2>
                <p className="text-xs text-slate-400">{c2Data.state}, {c2Data.country}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black text-white font-heading tracking-tight">
                  {c2Data.current_temp}°C
                </div>
                <p className="text-xs text-slate-400">Feels like {c2Data.feels_like}°C</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Condition: {c2Data.condition}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                c2Data.aqi <= 50 ? "bg-emerald-500/20 text-emerald-300" :
                c2Data.aqi <= 100 ? "bg-green-500/20 text-green-300" :
                c2Data.aqi <= 200 ? "bg-yellow-500/20 text-yellow-300" :
                "bg-red-500/20 text-red-300"
              }`}>
                AQI {c2Data.aqi} ({c2Data.aqi_status})
              </span>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
                <span className="text-slate-400 block text-[10px]">💧 Humidity</span>
                <span className="font-bold text-white text-sm">{c2Data.humidity}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
                <span className="text-slate-400 block text-[10px]">💨 Wind</span>
                <span className="font-bold text-white text-sm">{c2Data.wind_speed} km/h</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
                <span className="text-slate-400 block text-[10px]">🌧️ Rain Sum</span>
                <span className="font-bold text-white text-sm">{c2Data.precipitation} mm</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transit & Highway Route Advisory */}
      {comparisonData && (
        <div className="glass-card p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/60">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <Navigation size={16} />
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Inter-City Highway & Transit Route Advisory ({city1} ↔ {city2})
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {comparisonData.travel_advisory}
          </p>
        </div>
      )}

      {/* Health & Vulnerability Persona Recommendations */}
      {comparisonData?.health_advisory && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <HeartPulse size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-white font-heading">
                  Vulnerability & Health Impact Personas
                </h3>
                <p className="text-xs text-slate-400">Tailored meteorological health guidance for sensitive demographic groups</p>
              </div>
            </div>
          </div>

          {/* Persona Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {/* Athletes */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-amber-500/40 transition">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <Activity size={18} />
                <span className="text-xs font-bold uppercase">Athletes & Runners</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {comparisonData.health_advisory.athletes}
              </p>
            </div>

            {/* Asthma */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-rose-500/40 transition">
              <div className="flex items-center gap-2 text-rose-400 mb-2">
                <HeartPulse size={18} />
                <span className="text-xs font-bold uppercase">Asthma & Respiratory</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {comparisonData.health_advisory.asthma_patients}
              </p>
            </div>

            {/* Children & Schools */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-sky-500/40 transition">
              <div className="flex items-center gap-2 text-sky-400 mb-2">
                <Baby size={18} />
                <span className="text-xs font-bold uppercase">Children & Schools</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {comparisonData.health_advisory.children_schools}
              </p>
            </div>

            {/* Elderly */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-purple-500/40 transition">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <ShieldCheck size={18} />
                <span className="text-xs font-bold uppercase">Senior Citizens</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {comparisonData.health_advisory.elderly}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
