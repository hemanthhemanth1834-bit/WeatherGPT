import React, { useState, useEffect, Suspense, lazy } from "react";
import Navbar from "./components/Navbar";
import WeatherChat from "./components/WeatherChat";
// Heavy tab panels are code-split so the initial bundle stays lean; Leaflet
// (GISMap) and markdown/chart-heavy views load on demand.
const GISMap = lazy(() => import("./components/GISMap"));
const WeatherDashboard = lazy(() => import("./components/WeatherDashboard"));
const AgriAdvisor = lazy(() => import("./components/AgriAdvisor"));
const AviationMarine = lazy(() => import("./components/AviationMarine"));
const AlertCenter = lazy(() => import("./components/AlertCenter"));
const ClimateAnalytics = lazy(() => import("./components/ClimateAnalytics"));
const CityComparison = lazy(() => import("./components/CityComparison"));
const AboutDeveloper = lazy(() => import("./components/AboutDeveloper"));
const NwpSatellitePanel = lazy(() => import("./components/NwpSatellitePanel"));
const RiskPanel = lazy(() => import("./components/RiskPanel"));
import { sendChatQuery, fetchCurrentWeather, fetchActiveAlerts } from "./services/api";

function PanelFallback() {
  return (
    <div role="status" className="flex flex-col items-center justify-center h-[40vh] space-y-3">
      <div className="w-10 h-10 rounded-full border-4 border-sky-500 border-t-transparent animate-spin"></div>
      <p className="text-xs text-slate-400 font-medium">Loading panel...</p>
    </div>
  );
}

const WELCOME_GREETINGS = {
  hi: {
    text: "नमस्ते! 🙏 **WeatherGPT** में आपका स्वागत है — पृथ्वी विज्ञान मंत्रालय (MoES) और भारत मौसम विज्ञान विभाग (IMD) का AI मौसम सहायक।\n\nआप मुझसे किसी भी शहर का वास्तविक समय मौसम, वर्षा पूर्वानुमान, **मेघदूत कृषि सलाह**, **दामिनी बिजली अलर्ट**, या **आपदा चेतावनी** पूछ सकते हैं।",
    speech: "नमस्ते! वेदर जीपीटी में आपका स्वागत है। आप मुझसे मौसम पूर्वानुमान या आपदा अलर्ट पूछ सकते हैं।"
  },
  mr: {
    text: "नमस्कार! 🙏 **WeatherGPT** मध्ये आपले स्वागत आहे — पृथ्वी विज्ञान मंत्रालय (MoES) व भारतीय हवामान विभाग (IMD) चा AI हवामान सहाय्यक।\n\nतुम्ही मला कोणत्याही ठिकाणचा हवामान अंदाज, पाऊस, **शेतकरी मेघदूत कृषी सल्ला**, **दामिनी वीज इशारा** किंवा **आपत्ती इशारे** विचारू शकता।",
    speech: "नमस्कार! वेदर जीपीटी मध्ये आपले स्वागत आहे. आपण हवामान अंदाज किंवा आपत्ती इशारे विचारू शकता."
  },
  ta: {
    text: "வணக்கம்! 🙏 **WeatherGPT** க்கு வரவேற்கிறோம் — புவி அறிவியல் அமைச்சகம் (MoES) மற்றும் இந்திய வானிலை ஆய்வுத் துறையின் (IMD) AI வானிலை தளம்.\n\nவானிலை நிலவரம், மழை முன்னறிவிப்பு, **மேகதூத் விவசாய ஆலோசனை**, அல்லது **பேரிடர் எச்சரிக்கைகளை** இங்கே கேட்கலாம்.",
    speech: "வணக்கம்! வெதர் ஜிபிடிக்கு வரவேற்கிறோம். வானிலை தகவல்களை நீங்கள் கேட்கலாம்."
  },
  te: {
    text: "నమస్కారం! 🙏 **WeatherGPT** కి స్వాగతం — భూ విజ్ఞాన మంత్రిత్వ శాఖ (MoES) & భారత వాతావరణ శాఖ (IMD) AI ప్లాట్‌ఫామ్.\n\nమీరు ఏ నగర వాతావరణం, వర్ష సూచన, **మేఘదూత్ రైతు సలహాలు**, లేదా **విపత్తు హెచ్చరికలు** అడగవచ్చు.",
    speech: "నమస్కారం! వెదర్ జిపిటికి స్వాగతం. వాతావరణ సమాచారం కోసం అడగండి."
  },
  bn: {
    text: "নমস্কার! 🙏 **WeatherGPT** তে আপনাকে স্বাগতম — ভূবিজ্ঞান মন্ত্রক (MoES) এবং ভারতীয় আবহাওয়া অধিদপ্তরের (IMD) AI আবহাওয়া সহায়ক।\n\nআপনি যেকোনো শহরের আবহাওয়া, বৃষ্টির পূর্বাভাস, **মেঘদূত কৃষি পরামর্শ**, অথবা **দুর্যোগ সতর্কতা** জানতে পারেন।",
    speech: "নমস্কার! ওয়েদার জিপিটিতে আপনাকে স্বাগতম।"
  },
  gu: {
    text: "નમસ્તે! 🙏 **WeatherGPT** માં આપનું સ્વાગત છે — પૃથ્વી વિજ્ઞાન મંત્રાલય (MoES) અને ભારતીય હવામાન વિભાગ (IMD) નું AI પ્લેટફોર્મ.\n\nતમે કોઈપણ શહેરનું હવામાન, વરસાદની આગાહી, **મેઘદૂત કૃષિ સલાહ**, અથવા **આપત્તિ ચેતવણી** પૂછી શકો છો.",
    speech: "નમસ્તે! વેધર જીપીટીમાં આપનું સ્વાગત છે."
  },
  pa: {
    text: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! 🙏 **WeatherGPT** ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ — ਧਰਤੀ ਵਿਗਿਆਨ ਮੰਤਰਾਲਾ (MoES) ਅਤੇ ਭਾਰਤ ਮੌਸਮ ਵਿਭਾਗ (IMD) ਦਾ AI ਮੌਸਮ ਸਹਾਇਕ।\n\nਤੁਸੀਂ ਮੌਸਮ, ਮੀਂਹ ਦੀ ਭਵਿੱਖਬਾਣੀ, **ਮੇਘਦੂਤ ਖੇਤੀਬਾੜੀ ਸਲਾਹ**, ਜਾਂ **ਆਫ਼ਤ ਚੇਤਾਵਨੀਆਂ** ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ।",
    speech: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਵੈਦਰ ਜੀਪੀਟੀ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ।"
  },
  kn: {
    text: "ನಮಸ್ಕಾರ! 🙏 **WeatherGPT** ಗೆ ಸುಸ್ವಾಗತ — ಭೂ ವಿಜ್ಞಾನ ಸಚಿವಾಲಯ (MoES) ಮತ್ತು ಭಾರತೀಯ ಹವಾಮಾನ ಇಲಾಖೆಯ (IMD) AI ಹವಾಮಾನ ಸಹಾಯಕ.\n\nನೀವು ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ, ಮಳೆ, **ಮೇಘದೂತ್ ಕೃಷಿ ಸಲಹೆ**, ಅಥವಾ **ವಿಪತ್ತು ಎಚ್ಚರಿಕೆಗಳನ್ನು** ಕೇಳಬಹುದು.",
    speech: "ನಮಸ್ಕಾರ! ವೆದರ್ ಜಿಪಿಟಿಗೆ ಸುಸ್ವಾಗತ."
  },
  en: {
    text: "Namaste! 🙏 Welcome to **WeatherGPT** — the AI conversational intelligence platform built for the **Ministry of Earth Sciences (MoES)** and **India Meteorological Department (IMD)**.\n\nAsk me anything regarding real-time forecasts, GFS/WRF model outputs, **Agromet crop advisories (Meghdoot)**, **Damini lightning risks**, **aviation METAR/TAF**, **marine sea states**, or **ITU CAP disaster warnings** in 10+ Indian languages.",
    speech: "Namaste! Welcome to WeatherGPT. How can I assist you with weather forecasts or disaster alerts today?"
  }
};

const WELCOME_ACTIONS_BY_LANG = {
  mr: [
    { label: "GIS रडार नकाशा पहा", action: "open_map" },
    { label: "7-दिवसीय सविस्तर अंदाज", action: "open_dashboard" },
    { label: "शेतकरी मेघदूत कृषी सल्ला", action: "open_agri" },
    { label: "आपत्ती इशारे केंद्र", action: "open_alerts" }
  ],
  hi: [
    { label: "डॉपलर रडार मैप देखें", action: "open_map" },
    { label: "7-दिवसीय पूर्वानुमान", action: "open_dashboard" },
    { label: "मेघदूत किसान सलाह", action: "open_agri" },
    { label: "आपदा अलर्ट केंद्र", action: "open_alerts" }
  ],
  ta: [
    { label: "ரேடார் வரைபடம்", action: "open_map" },
    { label: "7-நாள் அறிக்கை", action: "open_dashboard" },
    { label: "விவசாய ஆலோசனை", action: "open_agri" },
    { label: "பேரிடர் மையம்", action: "open_alerts" }
  ],
  te: [
    { label: "రాడార్ మ్యాప్", action: "open_map" },
    { label: "7 రోజుల సూచన", action: "open_dashboard" },
    { label: "రైతు సలహాలు", action: "open_agri" },
    { label: "హెచ్చరికల కేంద్రం", action: "open_alerts"}
  ],
  en: [
    { label: "View Doppler Radar Map", action: "open_map" },
    { label: "7-Day Forecast Matrix", action: "open_dashboard" },
    { label: "Farmers Agromet Advisory", action: "open_agri" },
    { label: "Active CAP Disaster Alerts", action: "open_alerts" }
  ]
};

export default function App() {
  const [currentPersona, setPersona] = useState("general");
  const [currentLanguage, setLanguage] = useState("auto");
  const [activeTab, setActiveTab] = useState("chat");
  const [searchLocation, setSearchLocation] = useState("Pune");
  const [weatherData, setWeatherData] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Saved preferred locations (localStorage; no personal data leaves the browser)
  const [savedLocations, setSavedLocations] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("weathergpt_saved_locations") || "[]");
    } catch {
      return [];
    }
  });

  const handleSaveLocation = (name) => {
    const clean = (name || "").trim();
    if (!clean) return;
    setSavedLocations((prev) => {
      if (prev.includes(clean)) return prev;
      const next = [...prev, clean].slice(-8);
      try {
        localStorage.setItem("weathergpt_saved_locations", JSON.stringify(next));
      } catch { /* storage unavailable */ }
      return next;
    });
  };

  // Initial Welcome Messages
  const [messages, setMessages] = useState([
    {
      id: "init-1",
      sender: "bot",
      text: WELCOME_GREETINGS.en.text,
      speech_text: WELCOME_GREETINGS.en.speech,
      suggested_actions: WELCOME_ACTIONS_BY_LANG.en
    }
  ]);

  // When language is selected in Navbar, switch the greeting language
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const greeting = WELCOME_GREETINGS[newLang] || WELCOME_GREETINGS.en;
    const actions = WELCOME_ACTIONS_BY_LANG[newLang] || WELCOME_ACTIONS_BY_LANG.en;
    setMessages([
      {
        id: `lang-switch-${Date.now()}`,
        sender: "bot",
        text: greeting.text,
        speech_text: greeting.speech,
        suggested_actions: actions
      }
    ]);
  };

  // Initial Weather Load for default location
  useEffect(() => {
    const initData = async () => {
      try {
        const data = await fetchCurrentWeather("Pune");
        setWeatherData(data);
        const alerts = await fetchActiveAlerts();
        setActiveAlerts(alerts);
      } catch (e) {
        console.error("Initial data load error:", e);
      }
    };
    initData();
  }, []);

  // Handle User Message in Chat
  const handleSendMessage = async (text) => {
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: text
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const resp = await sendChatQuery(text, currentPersona, currentLanguage, searchLocation);
      
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: resp.markdown_response,
        speech_text: resp.speech_text,
        weather: resp.structured_weather,
        alerts: resp.alerts,
        agri_advisory: resp.agri_advisory,
        aviation_briefing: resp.aviation_briefing,
        marine_advisory: resp.marine_advisory,
        suggested_actions: resp.suggested_actions,
        quick_suggestions: resp.quick_suggestions
      };

      setMessages((prev) => [...prev, botMsg]);

      // If response contained structured weather, sync to active search state
      if (resp.structured_weather) {
        setWeatherData(resp.structured_weather);
        setSearchLocation(resp.structured_weather.location);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "bot",
          text: currentLanguage === "mr"
            ? "⚠️ **संपर्क त्रुटी**: हवामान प्रणालीशी संपर्क होऊ शकला नाही. कृपया सर्व्हर सुरू असल्याची खात्री करा."
            : "⚠️ **Communication Anomaly**: Could not connect to the WeatherGPT forecasting cluster. Please ensure the backend server is running and try again.",
          speech_text: currentLanguage === "mr" 
            ? "हवामान प्रणालीशी संपर्क होऊ शकला नाही. कृपया पुन्हा प्रयत्न करा."
            : "Could not connect to the weather forecasting cluster. Please try again."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Search Submit
  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchLocation.trim()) return;

    setIsLoading(true);
    try {
      const data = await fetchCurrentWeather(searchLocation.trim());
      setWeatherData(data);
      handleSaveLocation(data.location || searchLocation.trim());
      
      let promptText = `Give me a complete weather intelligence and hazard summary for ${searchLocation.trim()}`;
      if (currentLanguage === "mr") {
        promptText = `${searchLocation.trim()} चे हवामान आणि आपत्ती अंदाज द्या`;
      } else if (currentLanguage === "hi") {
        promptText = `${searchLocation.trim()} का मौसम पूर्वानुमान और आपदा अलर्ट बताएं`;
      }
      
      handleSendMessage(promptText);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // GPS Auto-detect
  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setIsLoading(true);
          try {
            const data = await fetchCurrentWeather("Your Location", latitude, longitude);
            setWeatherData(data);
            setSearchLocation(data.location);
            handleSendMessage(`Weather forecast for coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
          } catch (e) {
            console.error(e);
          } finally {
            setIsLoading(false);
          }
        },
        () => {
          handleSearchSubmit();
        }
      );
    } else {
      handleSearchSubmit();
    }
  };

  const handleAskAI = (prompt) => {
    setActiveTab("chat");
    handleSendMessage(prompt);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      {/* Top Navbar & Controls */}
      <Navbar
        currentPersona={currentPersona}
        setPersona={setPersona}
        currentLanguage={currentLanguage}
        setLanguage={handleLanguageChange}
        activeAlerts={activeAlerts}
        activeAlertCount={activeAlerts.length}
        searchLocation={searchLocation}
        setSearchLocation={setSearchLocation}
        onSearchSubmit={handleSearchSubmit}
        onDetectLocation={handleDetectLocation}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4">
        {activeTab === "chat" && (
          <WeatherChat
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            currentLanguage={currentLanguage}
            currentPersona={currentPersona}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "map" && (
          <Suspense fallback={<PanelFallback />}>
          <GISMap
            selectedLocation={searchLocation}
            onSelectLocation={(loc) => {
              setSearchLocation(loc);
              handleAskAI(`Detailed weather and hazard forecast for ${loc}`);
            }}
          />
          </Suspense>
        )}

        {activeTab === "dashboard" && (
          <Suspense fallback={<PanelFallback />}>
          <WeatherDashboard
            weatherData={weatherData}
            isLoading={isLoading}
            onAskAI={handleAskAI}
          />
          </Suspense>
        )}

        {activeTab === "agri" && (
          <Suspense fallback={<PanelFallback />}>
          <AgriAdvisor
            location={searchLocation}
            onAskAI={handleAskAI}
          />
          </Suspense>
        )}

        {activeTab === "aviation_marine" && (
          <Suspense fallback={<PanelFallback />}>
          <AviationMarine
            location={searchLocation}
            onAskAI={handleAskAI}
          />
          </Suspense>
        )}

        {activeTab === "alerts" && (
          <Suspense fallback={<PanelFallback />}>
          <AlertCenter
            onAskAI={handleAskAI}
          />
          </Suspense>
        )}

        {activeTab === "compare" && (
          <Suspense fallback={<PanelFallback />}>
          <CityComparison
            onAskAI={handleAskAI}
          />
          </Suspense>
        )}

        {activeTab === "climate" && (
          <Suspense fallback={<PanelFallback />}>
          <ClimateAnalytics onAskAI={handleAskAI} />
          </Suspense>
        )}

        {activeTab === "risk" && (
          <Suspense fallback={<PanelFallback />}>
          <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3">
            <RiskPanel location={searchLocation} />
          </div>
          </Suspense>
        )}

        {activeTab === "nwp" && (
          <Suspense fallback={<PanelFallback />}>
          <NwpSatellitePanel
            location={searchLocation}
            lat={weatherData?.lat ?? 20.0}
            lon={weatherData?.lon ?? 78.0}
          />
          </Suspense>
        )}

        {activeTab === "about" && (
          <Suspense fallback={<PanelFallback />}>
          <AboutDeveloper />
          </Suspense>
        )}
      </main>

      {/* Status Footer with developer identity */}
      <footer className="glass-panel border-t border-slate-800/80 py-2.5 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">WeatherGPT — AI Weather Intelligence</span>
            <span>•</span>
            <span>SIH 2026 · Muchakarla Hemanth Kumar · SRKIT CSE–AI/ML</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300">
            <span>ITU CAP v1.2</span>
            <span>•</span>
            <span>WMO WIS2.0</span>
            <span>•</span>
            <span>GFS LIVE · WRF NOT CONFIGURED</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
