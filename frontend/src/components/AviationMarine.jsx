import React, { useState, useEffect } from "react";
import { Plane, Anchor, AlertTriangle, CheckCircle, Wind, Compass, Waves } from "lucide-react";
import { fetchAviationBriefing, fetchMarineAdvisory } from "../services/api";

const AIRPORT_LIST = [
  { icao: "VIDP", name: "Delhi (VIDP / DEL)", city: "Delhi" },
  { icao: "VABB", name: "Mumbai (VABB / BOM)", city: "Mumbai" },
  { icao: "VOBL", name: "Bengaluru (VOBL / BLR)", city: "Bengaluru" },
  { icao: "VECC", name: "Kolkata (VECC / CCU)", city: "Kolkata" }
];

const COASTAL_LIST = [
  { id: "mumbai", name: "Konkan Coast (Mumbai / Arabian Sea)" },
  { id: "odisha", name: "North Odisha Coast (Bay of Bengal)" },
  { id: "kerala", name: "Malabar Coast (Kochi / Kerala)" },
  { id: "chennai", name: "Coromandel Coast (Chennai / Tamil Nadu)" }
];

export default function AviationMarine({ onAskAI }) {
  const [selectedAirport, setSelectedAirport] = useState("VIDP");
  const [selectedCoast, setSelectedCoast] = useState("mumbai");
  const [aviation, setAviation] = useState(null);
  const [marine, setMarine] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const [avData, marData] = await Promise.all([
          fetchAviationBriefing(selectedAirport),
          fetchMarineAdvisory(selectedCoast)
        ]);
        setAviation(avData);
        setMarine(marData);
      } catch (e) {
        console.error(e);
        setLoadError("Aviation/marine data unavailable — backend unreachable or request timed out. Please retry.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [selectedAirport, selectedCoast]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6 animate-fadeIn">
      {loadError && (
        <div role="alert" className="p-3.5 rounded-2xl border border-red-500/40 bg-red-950/40 text-xs text-red-200">
          ⚠️ {loadError}
        </div>
      )}
      {/* Aviation Section */}
      <div className="glass-card p-6 border border-blue-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
              <Plane size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Aviation Weather Briefing & METAR / TAF</h2>
              <p className="text-xs text-gray-400">Decoded aerodrome reports for pilots and dispatchers.</p>
              <p className="mt-1.5 inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40">
                STATIC DEMO DATA — sample METAR/TAF, not live observations. Not for flight planning.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {AIRPORT_LIST.map((ap) => (
              <button
                key={ap.icao}
                onClick={() => setSelectedAirport(ap.icao)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                  selectedAirport === ap.icao
                    ? "bg-blue-600 text-white shadow"
                    : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
                }`}
              >
                {ap.icao}
              </button>
            ))}
          </div>
        </div>

        {aviation && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-gray-950/80 p-4 rounded-xl border border-gray-800 font-mono text-xs text-sky-300">
                <div className="text-gray-500 mb-1">// RAW METAR</div>
                {aviation.metar_raw}
              </div>

              <div className="bg-gray-950/80 p-4 rounded-xl border border-gray-800 font-mono text-xs text-indigo-300">
                <div className="text-gray-500 mb-1">// RAW 24-HOUR TAF</div>
                {aviation.taf_raw}
              </div>

              {/* Decoded Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400">Wind Direction & Speed</div>
                  <div className="text-xs font-bold text-white mt-1">{aviation.metar_decoded.wind}</div>
                </div>
                <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400">Prevailing Visibility</div>
                  <div className="text-xs font-bold text-white mt-1">{aviation.metar_decoded.visibility}</div>
                </div>
                <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400">Cloud Layers</div>
                  <div className="text-xs font-bold text-white mt-1">{aviation.metar_decoded.clouds}</div>
                </div>
                <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400">Altimeter (QNH)</div>
                  <div className="text-xs font-bold text-white mt-1">{aviation.metar_decoded.altimeter_qnh}</div>
                </div>
              </div>
            </div>

            {/* Flight Category & Hazards */}
            <div className="glass-card p-5 border border-gray-800 space-y-4">
              <div>
                <div className="text-xs text-gray-400">Flight Rules Category</div>
                <div className={`text-2xl font-black mt-1 ${
                  aviation.flight_category === "VFR" ? "text-emerald-400" : (aviation.flight_category === "MVFR" ? "text-amber-400" : "text-red-400")
                }`}>
                  {aviation.flight_category} (Visual / Instrument)
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-800">
                <div className="text-xs font-semibold text-gray-300">Observed Aerodrome Hazards:</div>
                {aviation.hazards.map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/30 p-2 rounded-lg border border-amber-900/50">
                    <AlertTriangle size={13} className="flex-shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Marine & INCOIS Section */}
      <div className="glass-card p-6 border border-cyan-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Waves size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Ocean State Forecast & High Wave Alerts</h2>
              <p className="text-xs text-gray-400">Swell surge, sea state, and deep sea fishing advisories for coastal communities.</p>
              <p className="mt-1.5 inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">
                MODEL-DEPENDENT estimate from live coastal wind — not an official INCOIS bulletin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {COASTAL_LIST.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCoast(c.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                  selectedCoast === c.id
                    ? "bg-cyan-600 text-white shadow"
                    : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
                }`}
              >
                {c.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {marine && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="md:col-span-2 space-y-4">
              <div className={`p-4 rounded-xl border ${
                marine.fisherman_warning
                  ? "bg-red-950/40 border-red-500/50 text-red-200"
                  : "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <AlertTriangle size={18} className={marine.fisherman_warning ? "text-red-400" : "text-emerald-400"} />
                  <span>Fishermen Advisory Notification</span>
                </div>
                <p className="text-xs leading-relaxed">{marine.warning_message}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-gray-950/60 rounded-xl border border-gray-800 text-center">
                  <div className="text-[10px] text-gray-400">Significant Wave Height</div>
                  <div className="text-xl font-extrabold text-cyan-400 font-mono mt-1">{marine.wave_height_m} m</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{marine.sea_condition}</div>
                </div>
                <div className="p-3.5 bg-gray-950/60 rounded-xl border border-gray-800 text-center">
                  <div className="text-[10px] text-gray-400">High Tide Timing</div>
                  <div className="text-xs font-bold text-white font-mono mt-2">{marine.high_tide_time}</div>
                </div>
                <div className="p-3.5 bg-gray-950/60 rounded-xl border border-gray-800 text-center">
                  <div className="text-[10px] text-gray-400">Low Tide Timing</div>
                  <div className="text-xs font-bold text-white font-mono mt-2">{marine.low_tide_time}</div>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 border border-gray-800 flex flex-col justify-between">
              <div>
                <div className="text-xs text-gray-400">Monitored Coastal Sector</div>
                <div className="text-sm font-bold text-white mt-1">{marine.coastal_zone}</div>
                <div className="text-xs text-gray-400 mt-3">
                  Wind Gusts: <span className="text-white font-semibold">{marine.wind_speed_knots} Knots</span>
                </div>
              </div>

              <button
                onClick={() => onAskAI(`What is the marine and wave condition for ${marine.coastal_zone}?`)}
                className="btn-primary w-full text-xs justify-center mt-4 bg-cyan-600 hover:bg-cyan-500"
              >
                Ask Marine Assistant →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
