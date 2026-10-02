/* Voice engine: browser STT + optional VibeVoice TTS.
   VibeVoice is preferred for English output when the WeatherGPT backend
   has VIBEVOICE_TTS_URL configured. Browser speech remains the fallback. */

const BCP47 = {
  auto: "en-IN",
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  ta: "ta-IN",
  te: "te-IN",
  bn: "bn-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  or: "or-IN",
};

export function voiceSupported() {
  if (typeof window === "undefined") return { stt: false, tts: false };
  return {
    stt: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    tts: Boolean(window.speechSynthesis),
  };
}

class VoiceEngine {
  constructor() {
    this.recognition = null;
    this.listening = false;
    this.audio = null;
    if (typeof window !== "undefined") {
      const Impl = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (Impl) {
        this.recognition = new Impl();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
      }
      this.synth = window.speechSynthesis || null;
    } else {
      this.synth = null;
    }
  }

  get available() {
    return Boolean(this.recognition);
  }

  listen(lang = "en", events = {}) {
    if (!this.recognition) {
      events.onError?.("unsupported");
      return;
    }
    if (this.listening) {
      try {
        this.recognition.stop();
      } catch {
        /* already stopped */
      }
    }
    this.recognition.lang = BCP47[lang] || "en-IN";
    this.recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += text;
        else interim += text;
      }
      events.onResult?.(final || interim, Boolean(final));
    };
    this.recognition.onerror = (event) => {
      this.listening = false;
      events.onError?.(event.error || "error");
    };
    this.recognition.onend = () => {
      this.listening = false;
      events.onEnd?.();
    };
    try {
      this.recognition.start();
      this.listening = true;
      events.onStart?.();
    } catch {
      events.onError?.("busy");
    }
  }

  stopListening() {
    if (this.recognition && this.listening) {
      try {
        this.recognition.stop();
      } catch {
        /* noop */
      }
      this.listening = false;
    }
  }

  async speak(text, lang = "en", onEnd) {
    if (!text) {
      onEnd?.();
      return;
    }

    if (lang === "en" || lang === "auto") {
      try {
        const base = import.meta.env.VITE_API_URL || "/api";
        const response = await fetch(`${base}/voice/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: String(text).slice(0, 4000),
            speaker: "Carter",
          }),
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          this.audio?.pause?.();
          this.audio = new Audio(url);
          this.audio.onended = () => {
            URL.revokeObjectURL(url);
            this.audio = null;
            onEnd?.();
          };
          this.audio.onerror = () => {
            URL.revokeObjectURL(url);
            this.audio = null;
            this.browserSpeak(text, lang, onEnd);
          };
          await this.audio.play();
          return;
        }
      } catch {
        // Optional VibeVoice unavailable; use browser TTS below.
      }
    }

    this.browserSpeak(text, lang, onEnd);
  }

  browserSpeak(text, lang = "en", onEnd) {
    if (!this.synth || !text) {
      onEnd?.();
      return;
    }
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const tag = BCP47[lang] || "en-IN";
    utterance.lang = tag;
    utterance.rate = 0.95;
    const voice = this.synth.getVoices().find((v) => v.lang.startsWith(tag.split("-")[0]));
    if (voice) utterance.voice = voice;
    if (onEnd) utterance.onend = onEnd;
    this.synth.speak(utterance);
  }

  stopSpeaking() {
    this.synth?.cancel();
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
  }
}

export const speechEngine = new VoiceEngine();
