// Web Speech API Voice Engine for Indian Languages (STT & TTS)

const LANG_VOICE_MAP = {
  "auto": "en-IN",
  "en": "en-IN",
  "hi": "hi-IN",
  "mr": "mr-IN",
  "ta": "ta-IN",
  "te": "te-IN",
  "bn": "bn-IN",
  "gu": "gu-IN",
  "kn": "kn-IN",
  "pa": "pa-IN",
  "ml": "ml-IN",
  "or": "or-IN"
};

export class SpeechEngine {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    
    // Check SpeechRecognition support
    const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
    }
  }

  startListening(langCode = "en-IN", onResult, onEnd, onError) {
    if (!this.recognition) {
      if (onError) onError("Speech Recognition not supported in this browser. Please use Chrome/Safari or type text.");
      return;
    }

    const bcpLang = LANG_VOICE_MAP[langCode] || langCode;
    this.recognition.lang = bcpLang;

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (onResult) {
        onResult(finalTranscript || interimTranscript, !!finalTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      if (onError) onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn("Recognition already started", e);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  speak(text, langCode = "en", onEnd) {
    if (!this.synth) return;
    
    // Cancel any pending speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const bcpLang = LANG_VOICE_MAP[langCode] || "en-IN";
    utterance.lang = bcpLang;
    utterance.rate = 0.95; // Slightly slower for clear regional pronunciation
    utterance.pitch = 1.0;

    // Pick matching voice if available
    const voices = this.synth.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(bcpLang.split("-")[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
    }

    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const speechEngine = new SpeechEngine();
