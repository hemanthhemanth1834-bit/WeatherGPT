import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Send, Mic, MicOff, Volume2, VolumeX, Sparkles, 
  MapPin, CheckCircle2, ChevronRight, User, Bot, Radio
} from "lucide-react";
import { speechEngine } from "../services/voice";
import ModernWeatherCard from "./ModernWeatherCard";

const PROMPT_CHIPS_BY_LANG = {
  mr: [
    { text: "🌧️ मुंबईमध्ये उद्या मुसळधार पाऊस पडेल का?", category: "हवामान" },
    { text: "🌾 नागपूर जिल्ह्यासाठी कापूस पीक फवारणी सल्ला", category: "मेघदूत" },
    { text: "🚨 ओडिशासाठी सक्रिय चक्रीवादळ मार्ग व अंदाज", category: "आपत्ती" },
    { text: "✈️ दिल्ली VIDP विमानतळ METAR हवामान माहिती", category: "विमानन" },
    { text: "⚓ कोचीसाठी सागरी लाटांची उंची आणि मच्छीमार इशारा", category: "सागरी" },
    { text: "📈 यंदाचा मान्सून आणि 30 वर्षांची IMD सरासरी तुलना", category: "हवामान बदल" }
  ],
  hi: [
    { text: "🌧️ क्या कल मुंबई में भारी बारिश होगी?", category: "पूर्वानुमान" },
    { text: "🌾 नागपुर जिले के लिए कपास फसल कीटनाशक सलाह", category: "कृषि" },
    { text: "🚨 ओडिशा के लिए सक्रिय चक्रवात ट्रैक और लैंडफॉल पूर्वानुमान", category: "आपदा" },
    { text: "✈️ दिल्ली VIDP हवाई अड्डे के लिए METAR और TAF मौसम ब्रीफिंग", category: "विमानन" },
    { text: "⚓ कोच्चि के लिए समुद्री लहरों की ऊंचाई और मछुआरों के लिए चेतावनी", category: "समुद्री" },
    { text: "📈 इस साल के मानसून की 30 साल के औसत से तुलना", category: "जलवायु" }
  ],
  ta: [
    { text: "🌧️ நாளை சென்னையில் கனமழை பெய்யுமா?", category: "முன்னறிவிப்பு" },
    { text: "🌾 பருத்தி பயிர் பூச்சிக்கொல்லி ஆலோசனை", category: "விவசாயம்" },
    { text: "🚨 ஒடிசா தீவிர புயல் பாதை மற்றும் எச்சரிக்கை", category: "பேரிடர்" },
    { text: "✈️ டெல்லி விமான நிலைய METAR வானிலை அறிக்கை", category: "விமானம்" },
    { text: "⚓ கொச்சி கடல் அலை உயரம் மற்றும் மீனவர் எச்சரிக்கை", category: "கடல்" }
  ],
  te: [
    { text: "🌧️ రేపు ముంబైలో భారీ వర్షం పడుతుందా?", category: "సూచన" },
    { text: "🌾 పత్తి పంట పురుగుమందుల సలహా", category: "వ్యవసాయం" },
    { text: "🚨 ఒడిశా తీవ్ర తుఫాను హెచ్చరిక", category: "విపత్తు" },
    { text: "✈️ ఢిల్లీ విమానాశ్రయం METAR వాతావరణం", category: "విమానయానం" }
  ],
  ml: [
    { text: "🌧️ നാളെ തിരുവനന്തപുരത്ത് കനത്ത മഴ പെയ്യുമോ?", category: "പ്രവചനം" },
    { text: "🌾 നെൽകൃഷിക്ക് വളപ്രയോഗവും കീടനാശിനി ഉപദേശവും", category: "കൃഷി" },
    { text: "🚨 സജീവ ചുഴലിക്കാറ്റ് പാതയും മുന്നറിയിപ്പുകളും", category: "ദുരന്തം" },
    { text: "⚓ കൊച്ചിയിലെ സമുദ്ര തരംഗ ഉയരവും മത്സ്യത്തൊഴിലാളി മുന്നറിയിപ്പും", category: "സമുദ്രം" }
  ],
  or: [
    { text: "🌧️ କାଲି ଭୁବନେଶ୍ୱରରେ ପ୍ରବଳ ବର୍ଷା ହେବ କି?", category: "ପୂର୍ବାନୁମାନ" },
    { text: "🌾 ଧାନ ଫସଲ ପାଇଁ କୃଷି ପରାମର୍ଶ ଓ କୀଟନାଶକ ସୂଚନା", category: "କୃଷି" },
    { text: "🚨 ଓଡ଼ିଶା ପାଇଁ ସକ୍ରିୟ ବାତ୍ୟା ଟ୍ରାକ୍ ଓ ଚେତାବନୀ", category: "ବିପର୍ଯ୍ୟୟ" },
    { text: "⚓ ପାରାଦ୍ୱୀପ ସମୁଦ୍ର ତରଙ୍ଗ ଉଚ୍ଚତା ଓ ମତ୍ସ୍ୟଜୀବୀ ଚେତାବନୀ", category: "ସାମୁଦ୍ରିକ" }
  ],
  en: [
    { text: "🌧️ Will it rain heavily in Mumbai tomorrow?", category: "Forecast" },
    { text: "🌾 Cotton crop spray advisory for Nagpur district", category: "Agromet" },
    { text: "🚨 Active cyclone track & landfall forecast for Odisha", category: "Disaster" },
    { text: "✈️ METAR & TAF weather briefing for Delhi VIDP", category: "Aviation" },
    { text: "⚓ Ocean wave height & fisherman warning for Kochi", category: "Marine" },
    { text: "📈 Compare this year's monsoon vs 30-year IMD average", category: "Climate" }
  ]
};

const PLACEHOLDERS_BY_LANG = {
  mr: "हवामान अंदाज, शेतकरी पीक सल्ला किंवा आपत्ती इशारे विचारा (मराठी, हिन्दी, English...)...",
  hi: "मौसम पूर्वानुमान, फसल सलाह या आपदा अलर्ट पूछें (हिन्दी, मराठी, English...)...",
  ta: "வானிலை முன்னறிவிப்பு, விவசாய ஆலோசனை அல்லது பேரிடர் எச்சரிக்கைகளைக் கேளுங்கள்...",
  te: "వాతావరణ సూచనలు, పంట సలహాలు లేదా విపత్తు హెచ్చరికలను అడగండి...",
  bn: "আবহাওয়ার পূর্বাভাস, ফসলের পরামর্শ বা দুর্যোগ সতর্কতা জিজ্ঞাসা করুন...",
  gu: "હવામાન આગાહી, પાક સલાહ અથવા આપત્તિ ચેતવણી પૂછો...",
  pa: "ਮੌਸਮ ਦੀ ਭਵਿੱਖਬਾਣੀ, ਖੇਤੀ ਸਲਾਹ ਜਾਂ ਆਫ਼ਤ ਚੇਤਾਵਨੀਆਂ ਬਾਰੇ ਪੁੱਛੋ...",
  kn: "ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ, ಬೆಳೆ ಸಲಹೆ ಅಥವಾ ವಿಪತ್ತು ಎಚ್ಚರಿಕೆಗಳನ್ನು ಕೇಳಿ...",
  ml: "കാലാവസ്ഥാ പ്രവചനം, കർഷക ഉപദേശം അല്ലെങ്കിൽ ദുരന്ത മുന്നറിയിപ്പുകൾ ചോദിക്കുക...",
  or: "ପାଣିପାଗ ପୂର୍ବାନୁମାନ, କୃଷି ପରାମର୍ଶ କିମ୍ବା ବିପର୍ଯ୍ୟୟ ଚେତାବନୀ ପଚାରନ୍ତୁ...",
  en: "Ask weather forecasts, crop advisories, or disaster alerts in Hindi, Marathi, Tamil, English..."
};

export default function WeatherChat({
  messages,
  onSendMessage,
  isLoading,
  currentLanguage,
  currentPersona,
  onNavigateTab
}) {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [activeSpeechId, setActiveSpeechId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleToggleVoice = () => {
    if (isRecording) {
      speechEngine.stopListening();
      setIsRecording(false);
    } else {
      setVoiceError("");
      speechEngine.startListening(
        currentLanguage,
        (transcript, isFinal) => {
          setInputText(transcript);
          if (isFinal) {
            setIsRecording(false);
          }
        },
        () => setIsRecording(false),
        (err) => {
          console.warn("Speech error:", err);
          setIsRecording(false);
          setVoiceError(
            "Voice input unavailable in this browser/session. Please use Chrome/Edge with microphone permission, or type your query."
          );
        }
      );
      setIsRecording(true);
    }
  };

  const handleSpeak = (msgId, text) => {
    if (activeSpeechId === msgId) {
      speechEngine.stopSpeaking();
      setActiveSpeechId(null);
    } else {
      speechEngine.speak(text, currentLanguage, () => {
        setActiveSpeechId(null);
      });
      setActiveSpeechId(msgId);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto px-2 sm:px-4 py-2">
      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {messages.map((msg, index) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id || index}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fadeIn`}
            >
              {/* Avatar Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-md ${
                isUser 
                  ? "bg-gradient-to-tr from-sky-600 to-blue-500 text-white shadow-sky-500/20" 
                  : "bg-gradient-to-tr from-indigo-600 via-sky-600 to-teal-500 text-white shadow-indigo-500/20"
              }`}>
                {isUser ? <User size={15} /> : <Bot size={15} />}
              </div>

              {/* Chat Bubble */}
              <div
                className={`max-w-[88%] rounded-2xl p-4 transition-all ${
                  isUser
                    ? "bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 text-white rounded-tr-none shadow-lg shadow-sky-600/20 border border-sky-400/30"
                    : "glass-card text-slate-100 rounded-tl-none border border-slate-700/80 bg-slate-900/80 shadow-xl"
                }`}
              >
                {/* Header with Title & Audio button */}
                <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-white/10 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    {isUser ? (
                      <span className="text-sky-100">You</span>
                    ) : (
                      <span className="flex items-center gap-1.5 gradient-text-sky font-extrabold tracking-wide">
                        <Sparkles size={13} className="text-sky-400" /> WeatherGPT Intelligence
                      </span>
                    )}
                  </div>
                  {!isUser && msg.speech_text && (
                    <button
                      onClick={() => handleSpeak(msg.id || index, msg.speech_text)}
                      title="Listen with Indic Voice Synthesizer"
                      className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
                        activeSpeechId === (msg.id || index)
                          ? "bg-sky-500 text-white animate-pulse"
                          : "text-slate-400 hover:text-sky-300 hover:bg-white/10"
                      }`}
                    >
                      {activeSpeechId === (msg.id || index) ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      <span className="text-[10px] hidden sm:inline">{activeSpeechId === (msg.id || index) ? "Mute" : "Listen"}</span>
                    </button>
                  )}
                </div>

                {/* Rich Formatted Markdown Content */}
                <div className="text-xs sm:text-sm leading-relaxed text-slate-200 prose prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>

                {/* Modern Weather Card (Matching the Reference UI) */}
                {msg.weather && (
                  <div className="mt-4">
                    <ModernWeatherCard weather={msg.weather} />
                  </div>
                )}

                {/* Suggested Action Buttons */}
                {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                  <div className="mt-3.5 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                    {msg.suggested_actions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => onNavigateTab(act.action.replace("open_", ""))}
                        className="text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 transition shadow-sm"
                      >
                        <span>{act.label}</span>
                        <ChevronRight size={11} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Pulse */}
        {isLoading && (
          <div role="status" className="flex items-center gap-2 text-sky-400 text-xs font-semibold py-2.5 px-4 glass-card max-w-fit rounded-xl animate-pulse">
            <Sparkles size={15} className="animate-spin" />
            <span>Formulating weather intelligence from live NWP data...</span>
          </div>
        )}
        {voiceError && (
          <div role="alert" className="text-xs text-amber-200 bg-amber-950/40 border border-amber-500/40 rounded-xl px-4 py-2.5 max-w-fit">
            🎙️ {voiceError}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="py-2 overflow-x-auto no-scrollbar flex gap-2">
        {(PROMPT_CHIPS_BY_LANG[currentLanguage] || PROMPT_CHIPS_BY_LANG.en).map((chip, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(chip.text)}
            className="flex-shrink-0 text-xs font-medium bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 hover:border-sky-500/50 px-3 py-1.5 rounded-full transition shadow-sm hover:shadow-sky-500/10"
          >
            {chip.text}
          </button>
        ))}
      </div>

      {/* Modern Input Bar with Voice Mic */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2 mt-1">
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            value={inputText}
            aria-label="Weather query input"
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isRecording
                ? (currentLanguage === "mr" ? "🎙️ मराठी व्हॉइस मोड सुरू आहे... बोला" : "🎙️ Listening in Indic voice mode... Speak clearly now")
                : (PLACEHOLDERS_BY_LANG[currentLanguage] || PLACEHOLDERS_BY_LANG.en)
            }
            className={`w-full bg-slate-900/95 border ${
              isRecording 
                ? "border-red-500 ring-4 ring-red-500/20 text-white" 
                : "border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            } rounded-2xl py-3 pl-4 pr-12 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition shadow-2xl`}
          />
          <button
            type="button"
            onClick={handleToggleVoice}
            title={isRecording ? "Stop Recording" : "Voice Input (Web Speech API)"}
            aria-label={isRecording ? "Stop voice recording" : "Start voice input"}
            className={`absolute right-2.5 p-2 rounded-xl transition ${
              isRecording
                ? "mic-active"
                : "bg-slate-800/90 text-slate-400 hover:text-sky-400 hover:bg-slate-700"
            }`}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </div>

        <button
          type="submit"
          aria-label="Send weather query"
          disabled={!inputText.trim() || isLoading}
          className="btn-primary p-3 rounded-2xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
