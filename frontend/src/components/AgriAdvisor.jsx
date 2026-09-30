import React, { useState, useEffect } from "react";
import { 
  Sprout, Droplets, Bug, AlertTriangle, ShieldCheck, 
  Volume2, CheckCircle, HelpCircle, ArrowRight, Zap, Leaf 
} from "lucide-react";
import { fetchCropAdvisory } from "../services/api";
import { speechEngine } from "../services/voice";

const CROPS = [
  { id: "paddy", name: "Paddy / Rice", local: "धान / भात", icon: "🌾", desc: "Kharif Staple" },
  { id: "cotton", name: "Cotton", local: "कपास / कापूस", icon: "🌱", desc: "Commercial Crop" },
  { id: "wheat", name: "Wheat", local: "गेहूं / गहू", icon: "🌾", desc: "Rabi Cereal" },
  { id: "sugarcane", name: "Sugarcane", local: "गन्ना / ऊस", icon: "🎋", desc: "Perennial Cash Crop" },
  { id: "soybean", name: "Soybean", local: "सोयाबीन", icon: "🌿", desc: "Oilseed Crop" },
  { id: "mustard", name: "Mustard", local: "सरसों / मोहरी", icon: "🌻", desc: "Rabi Oilseed" }
];

export default function AgriAdvisor({ currentDistrict = "Nagpur", currentState = "Maharashtra", onAskAI }) {
  const [selectedCrop, setSelectedCrop] = useState("cotton");
  const [district, setDistrict] = useState(currentDistrict);
  const [advisory, setAdvisory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const loadAdvisory = async (crop, dist) => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchCropAdvisory(crop, dist, currentState);
      setAdvisory(data);
    } catch (e) {
      console.error(e);
      setLoadError("Advisory unavailable — backend unreachable or request timed out. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdvisory(selectedCrop, district);
  }, [selectedCrop, district]);

  const handleVoiceAdvisory = () => {
    if (!advisory) return;
    if (isSpeaking) {
      speechEngine.stopSpeaking();
      setIsSpeaking(false);
    } else {
      const speech = `कृषि सलाह: ${advisory.crop} के लिए ${advisory.irrigation_advice}। ${advisory.pesticide_advice}`;
      speechEngine.speak(speech, "hi", () => setIsSpeaking(false));
      setIsSpeaking(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 space-y-5 animate-fadeIn">
      {/* Agri Hero Header */}
      <div className="glass-card p-6 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-900/90">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider mb-1">
              <Sprout size={16} /> Agromet Advisory (Meghdoot-style format)
            </div>
            <h2 className="text-2xl font-black text-white font-heading">
              Farmer Decision Support & Crop Protection
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Localized weather-smart advisories for pest management, irrigation scheduling & harvest windows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleVoiceAdvisory}
              className={`btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 ${
                isSpeaking ? "bg-emerald-600 text-white animate-pulse" : ""
              }`}
            >
              <Volume2 size={15} className="text-emerald-400" />
              <span>{isSpeaking ? "Speaking Hindi Advisory..." : "Audio Advisory (आवाज़ में सुनें)"}</span>
            </button>

            <button
              onClick={() => onAskAI(`What is the pest and irrigation advisory for ${selectedCrop} in ${district}?`)}
              className="btn-primary text-xs py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/30"
            >
              Ask AI Agronomist →
            </button>
          </div>
        </div>

        {/* Crop Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mt-6">
          {CROPS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCrop(c.id)}
              className={`p-3.5 rounded-2xl text-left font-medium text-xs transition border flex flex-col justify-between ${
                selectedCrop === c.id
                  ? "bg-emerald-500/20 border-emerald-500/60 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <span className="text-2xl mb-1.5">{c.icon}</span>
              <span className="font-extrabold text-sm text-slate-100">{c.name}</span>
              <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">{c.local}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advisory Content Cards */}
      {loadError && (
        <div role="alert" className="p-3.5 rounded-2xl border border-red-500/40 bg-red-950/40 text-xs text-red-200">
          ⚠️ {loadError}
        </div>
      )}
      {advisory && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Main Advisory Box */}
          <div className="md:col-span-2 space-y-4">
            {/* Irrigation Card */}
            <div className="glass-card p-5 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Droplets size={18} />
                <span>Irrigation & Soil Moisture Advisory</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                {advisory.irrigation_advice}
              </p>
            </div>

            {/* Pesticide Card */}
            <div className="glass-card p-5 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Bug size={18} />
                <span>Pest, Disease & Spray Timing Recommendation</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                {advisory.pesticide_advice}
              </p>
            </div>

            {/* Harvesting Card */}
            <div className="glass-card p-5 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle size={18} />
                <span>Harvesting & Mandi Storage Safety</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                {advisory.harvest_recommendation}
              </p>
            </div>
          </div>

          {/* Right Status & Damini Lightning Risk */}
          <div className="space-y-4">
            <div className="glass-card p-5 border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Field Safety & Risk Index</h3>

              {/* Damini Lightning Sensor Card */}
              <div className={`p-4 rounded-2xl border ${
                advisory.damini_lightning_alert
                  ? "bg-red-950/40 border-red-500/50 text-red-200"
                  : "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
              }`}>
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <Zap size={16} className={advisory.damini_lightning_alert ? "text-red-400 animate-bounce" : "text-emerald-400"} />
                  <span>Damini Lightning Sensor Network</span>
                </div>
                <div className="text-xs font-extrabold mt-1">
                  {advisory.damini_lightning_alert ? "⚡ HIGH RISK - Suspend all field work" : "✅ Safe from electrical thunderstorm activity"}
                </div>
              </div>

              {/* Suitability Score */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Field Operation Suitability Index</div>
                <div className="text-5xl font-black text-emerald-400 font-mono my-2">
                  {advisory.suitability_score}%
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Growth Stage: <span className="text-slate-200 font-semibold">{advisory.growth_stage}</span>
                </div>
              </div>

              <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800">
                <div>📍 <strong>District:</strong> {advisory.district}, {advisory.state}</div>
                <div>📡 <strong>Source:</strong> Rule-based advisory from live weather values (DEMO-grade)</div>
                <div className="text-slate-500">Informational only — not a substitute for professional agricultural advice.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
