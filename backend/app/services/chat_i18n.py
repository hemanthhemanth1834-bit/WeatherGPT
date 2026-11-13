"""Localized labels for the tomorrow forecast reply.

Values always come from the weather tool; this module only translates the
labels, units and surrounding sentence. Condition names fall back to the
provider's English wording when no translation is registered.
"""

TOMORROW_TEXT = {
    "en": {
        "title": "Tomorrow's forecast — {place}, {state} ({date})",
        "speech": (
            "Tomorrow's forecast for {place}: {cond}, high {tmax} degrees Celsius, "
            "low {tmin} degrees, {rain} millimetres of expected rainfall."
        ),
        "condition": "Condition",
        "high_low": "High / low",
        "rain": "Expected rainfall",
        "wind": "Maximum wind",
        "rain_yes": "rainfall is forecast",
        "rain_no": "no measurable rainfall is forecast",
        "source": "Source",
        "note": "Rainfall is a model forecast, not a guarantee or a measured observation.",
    },
    "hi": {
        "title": "कल का पूर्वानुमान — {place}, {state} ({date})",
        "speech": (
            "कल {place} में {cond}, अधिकतम {tmax} डिग्री सेल्सियस, न्यूनतम {tmin} डिग्री "
            "और {rain} मिलीमीटर वर्षा का अनुमान है।"
        ),
        "condition": "स्थिति",
        "high_low": "अधिकतम / न्यूनतम",
        "rain": "अनुमानित वर्षा",
        "wind": "अधिकतम हवा",
        "rain_yes": "वर्षा का अनुमान है",
        "rain_no": "मापने योग्य वर्षा का अनुमान नहीं है",
        "source": "स्रोत",
        "note": "वर्षा एक मॉडल पूर्वानुमान है, कोई गारंटी या मापा गया अवलोकन नहीं।",
    },
    "mr": {
        "title": "उद्याचा अंदाज — {place}, {state} ({date})",
        "speech": (
            "उद्या {place} मध्ये {cond}, कमाल {tmax} अंश सेल्सिअस, किमान {tmin} अंश "
            "आणि {rain} मिलिमीटर पावसाचा अंदाज आहे."
        ),
        "condition": "स्थिती",
        "high_low": "कमाल / किमान",
        "rain": "अपेक्षित पाऊस",
        "wind": "कमाल वारा",
        "rain_yes": "पावसाचा अंदाज आहे",
        "rain_no": "मोजण्यायोग्य पावसाचा अंदाज नाही",
        "source": "स्रोत",
        "note": "पाऊस हा मॉडेल अंदाज आहे, हमी किंवा मोजलेले निरीक्षण नाही.",
    },
    "ta": {
        "title": "நாளை முன்னறிவிப்பு — {place}, {state} ({date})",
        "speech": (
            "நாளை {place} இல் {cond}, அதிகபட்சம் {tmax} டிகிரி செல்சியஸ், "
            "குறைந்தபட்சம் {tmin} டிகிரி, {rain} மில்லிமீட்டர் மழை எதிர்பார்க்கப்படுகிறது."
        ),
        "condition": "நிலை",
        "high_low": "அதிகபட்சம் / குறைந்தபட்சம்",
        "rain": "எதிர்பார்க்கப்படும் மழை",
        "wind": "அதிகபட்ச காற்று",
        "rain_yes": "மழை எதிர்பார்க்கப்படுகிறது",
        "rain_no": "அளவிடக்கூடிய மழை எதிர்பார்க்கப்படவில்லை",
        "source": "மூலம்",
        "note": "மழை ஒரு மாதிரி முன்னறிவிப்பு; உத்தரவாதம் அல்லது அளவிடப்பட்ட தரவு அல்ல.",
    },
    "te": {
        "title": "రేపటి పూర్వానుమానం — {place}, {state} ({date})",
        "speech": (
            "రేపు {place}లో {cond}, గరిష్ఠ {tmax} డిగ్రీల సెల్సియస్, కనిష్ఠ {tmin} డిగ్రీలు, "
            "{rain} మిల్లీమీటర్ల వర్షం అంచనా."
        ),
        "condition": "పరిస్థితి",
        "high_low": "గరిష్ఠం / కనిష్ఠం",
        "rain": "అంచనా వర్షపాతం",
        "wind": "గరిష్ఠ గాలి",
        "rain_yes": "వర్షం అంచనా ఉంది",
        "rain_no": "కొలవదగిన వర్షం అంచనా లేదు",
        "source": "మూలం",
        "note": "వర్షపాతం మోడల్ పూర్వానుమానం; హామీ లేదా కొలిచిన పరిశీలన కాదు.",
    },
    "bn": {
        "title": "আগামীকালের পূর্বাভাস — {place}, {state} ({date})",
        "speech": (
            "আগামীকাল {place}-এ {cond}, সর্বোচ্চ {tmax} ডিগ্রি সেলসিয়াস, সর্বনিম্ন {tmin} ডিগ্রি "
            "এবং {rain} মিলিমিটার বৃষ্টির পূর্বাভাস।"
        ),
        "condition": "অবস্থা",
        "high_low": "সর্বোচ্চ / সর্বনিম্ন",
        "rain": "প্রত্যাশিত বৃষ্টি",
        "wind": "সর্বোচ্চ বাতাস",
        "rain_yes": "বৃষ্টির পূর্বাভাস আছে",
        "rain_no": "পরিমাপযোগ্য বৃষ্টির পূর্বাভাস নেই",
        "source": "উৎস",
        "note": "বৃষ্টি একটি মডেল পূর্বাভাস; নিশ্চয়তা বা মাপা পর্যবেক্ষণ নয়।",
    },
    "gu": {
        "title": "આવતીકાલની આગાહી — {place}, {state} ({date})",
        "speech": (
            "આવતીકાલે {place}માં {cond}, વધુમાં વધુ {tmax} ડિગ્રી સેલ્સિયસ, ઓછામાં ઓછું {tmin} ડિગ્રી "
            "અને {rain} મિલીમીટર વરસાદની આગાહી છે."
        ),
        "condition": "સ્થિતિ",
        "high_low": "વધુમાં વધુ / ઓછામાં ઓછું",
        "rain": "અપેક્ષિત વરસાદ",
        "wind": "વધુમાં વધુ પવન",
        "rain_yes": "વરસાદની આગાહી છે",
        "rain_no": "માપી શકાય તેવો વરસાદની આગાહી નથી",
        "source": "સ્રોત",
        "note": "વરસાદ મોડેલ આગાહી છે, બાંયધરી કે માપેલ અવલોકન નથી.",
    },
    "pa": {
        "title": "ਕੱਲ੍ਹ ਦੀ ਭਵਿੱਖਬਾਣੀ — {place}, {state} ({date})",
        "speech": (
            "ਕੱਲ੍ਹ {place} ਵਿੱਚ {cond}, ਵੱਧ ਤੋਂ ਵੱਧ {tmax} ਡਿਗਰੀ ਸੈਲਸੀਅਸ, ਘੱਟੋ-ਘੱਟ {tmin} ਡਿਗਰੀ "
            "ਅਤੇ {rain} ਮਿਲੀਮੀਟਰ ਮੀਂਹ ਦੀ ਭਵਿੱਖਬਾਣੀ ਹੈ।"
        ),
        "condition": "ਸਥਿਤੀ",
        "high_low": "ਵੱਧ ਤੋਂ ਵੱਧ / ਘੱਟੋ-ਘੱਟ",
        "rain": "ਉਮੀਦ ਕੀਤਾ ਮੀਂਹ",
        "wind": "ਵੱਧ ਤੋਂ ਵੱਧ ਹਵਾ",
        "rain_yes": "ਮੀਂਹ ਦੀ ਭਵਿੱਖਬਾਣੀ ਹੈ",
        "rain_no": "ਮਾਪਣਯੋਗ ਮੀਂਹ ਦੀ ਭਵਿੱਖਬਾਣੀ ਨਹੀਂ",
        "source": "ਸਰੋਤ",
        "note": "ਮੀਂਹ ਇੱਕ ਮਾਡਲ ਭਵਿੱਖਬਾਣੀ ਹੈ, ਗਾਰੰਟੀ ਜਾਂ ਮਾਪਿਆ ਨਿਰੀਖਣ ਨਹੀਂ।",
    },
    "kn": {
        "title": "ನಾಳೆಯ ಮುನ್ಸೂಚನೆ — {place}, {state} ({date})",
        "speech": (
            "ನಾಳೆ {place}ನಲ್ಲಿ {cond}, ಗರಿಷ್ಠ {tmax} ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್, ಕನಿಷ್ಠ {tmin} ಡಿಗ್ರಿ "
            "ಮತ್ತು {rain} ಮಿಲಿಮೀಟರ್ ಮಳೆಯ ಮುನ್ಸೂಚನೆ ಇದೆ."
        ),
        "condition": "ಸ್ಥಿತಿ",
        "high_low": "ಗರಿಷ್ಠ / ಕನಿಷ್ಠ",
        "rain": "ನಿರೀಕ್ಷಿತ ಮಳೆ",
        "wind": "ಗರಿಷ್ಠ ಗಾಳಿ",
        "rain_yes": "ಮಳೆಯ ಮುನ್ಸೂಚನೆ ಇದೆ",
        "rain_no": "ಅಳೆಯಬಹುದಾದ ಮಳೆಯ ಮುನ್ಸೂಚನೆ ಇಲ್ಲ",
        "source": "ಮೂಲ",
        "note": "ಮಳೆ ಒಂದು ಮಾದರಿ ಮುನ್ಸೂಚನೆ; ಖಾತರಿ ಅಥವಾ ಅಳೆದ ವೀಕ್ಷಣೆ ಅಲ್ಲ.",
    },
    "ml": {
        "title": "നാളത്തെ പ്രവചനം — {place}, {state} ({date})",
        "speech": (
            "നാളെ {place}-ൽ {cond}, കൂടിയത് {tmax} ഡിഗ്രി സെൽഷ്യസ്, കുറഞ്ഞത് {tmin} ഡിഗ്രി, "
            "{rain} മില്ലിമീറ്റർ മഴ പ്രതീക്ഷിക്കുന്നു."
        ),
        "condition": "അവസ്ഥ",
        "high_low": "കൂടിയത് / കുറഞ്ഞത്",
        "rain": "പ്രതീക്ഷിക്കുന്ന മഴ",
        "wind": "കൂടിയ കാറ്റ്",
        "rain_yes": "മഴ പ്രതീക്ഷിക്കുന്നു",
        "rain_no": "അളക്കാവുന്ന മഴ പ്രതീക്ഷിക്കുന്നില്ല",
        "source": "ഉറവിടം",
        "note": "മഴ ഒരു മോഡൽ പ്രവചനമാണ്; ഉറപ്പോ അളന്ന നിരീക്ഷണമോ അല്ല.",
    },
    "or": {
        "title": "ଆସନ୍ତାକାଲିର ପୂର୍ବାନୁମାନ — {place}, {state} ({date})",
        "speech": (
            "ଆସନ୍ତାକାଲି {place}ରେ {cond}, ସର୍ବାଧିକ {tmax} ଡିଗ୍ରୀ ସେଲସିୟସ, ସର୍ବନିମ୍ନ {tmin} ଡିଗ୍ରୀ "
            "ଏବଂ {rain} ମିଲିମିଟର ବର୍ଷାର ପୂର୍ବାନୁମାନ ଅଛି।"
        ),
        "condition": "ସ୍ଥିତି",
        "high_low": "ସର୍ବାଧିକ / ସର୍ବନିମ୍ନ",
        "rain": "ଆଶାକରାଯାଉଥିବା ବର୍ଷା",
        "wind": "ସର୍ବାଧିକ ପବନ",
        "rain_yes": "ବର୍ଷାର ପୂର୍ବାନୁମାନ ଅଛି",
        "rain_no": "ମାପଯୋଗ୍ୟ ବର୍ଷାର ପୂର୍ବାନୁମାନ ନାହିଁ",
        "source": "ଉତ୍ସ",
        "note": "ବର୍ଷା ଏକ ମଡେଲ ପୂର୍ବାନୁମାନ; ଗ୍ୟାରେଣ୍ଟି କିମ୍ବା ମାପାଯାଇଥିବା ପର୍ଯ୍ୟବେକ୍ଷଣ ନୁହେଁ।",
    },
}


def tomorrow_text(language: str) -> dict:
    return TOMORROW_TEXT.get(language, TOMORROW_TEXT["en"])
