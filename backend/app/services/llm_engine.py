import re
import datetime
from typing import Dict, Any, Tuple, Optional, List
from .weather_service import geocode_location, fetch_weather_data, compare_locations, INDIAN_LOCATIONS
from .alert_service import get_active_alerts
from .agri_advisory import generate_crop_advisory
from .aviation_service import get_aviation_briefing
from .marine_service import get_marine_advisory
from .historical_service import get_climate_trend_data
from ..schemas.models import WeatherQueryRequest, ChatResponse, WeatherData, CityComparisonData

# Comprehensive Indic Multi-Script Transliteration mappings for all 8 Indian Languages
INDIC_LOCATION_TRANSLITERATIONS = {
    # 1. Hindi / Marathi / Sanskrit (Devanagari) - Cities, Talukas & Suburbs
    "पुणे": "Pune", "पुण्यात": "Pune", "पुण्याची": "Pune", "पुण्याचा": "Pune", "पुणेकर": "Pune",
    "वाघोली": "Wagholi", "वाघोलीत": "Wagholi", "वाघोलीमध्ये": "Wagholi",
    "हिंजवडी": "Hinjawadi", "हिंजेवाडी": "Hinjawadi", "हिंजवडीत": "Hinjawadi", "हिंजेवाडीत": "Hinjawadi",
    "कोथरूड": "Kothrud", "कोथरूडात": "Kothrud", "कोथरूडमध्ये": "Kothrud",
    "हडपसर": "Hadapsar", "हडपसरात": "Hadapsar", "हडपसरमध्ये": "Hadapsar",
    "बाणेर": "Baner", "बाणेरमध्ये": "Baner", "बाणेरात": "Baner",
    "वाकड": "Wakad", "वाकडमध्ये": "Wakad", "वाकडात": "Wakad",
    "औंध": "Aundh", "औंधमध्ये": "Aundh", "औंधात": "Aundh",
    "विमान नगर": "Viman Nagar", "विमाननगर": "Viman Nagar",
    "खराडी": "Kharadi", "खराडीत": "Kharadi", "खराडीमध्ये": "Kharadi",
    "कल्याणी नगर": "Kalyani Nagar", "कल्याणीनगर": "Kalyani Nagar",
    "शिवाजीनगर": "Shivaji Nagar", "शिवाजी नगर": "Shivaji Nagar",
    "स्वारगेट": "Swargate", "कात्रज": "Katraj", "कात्रजमध्ये": "Katraj",
    "बावधन": "Bavdhan", "पाषाण": "Pashan", "वारजे": "Warje",
    "धनकवडी": "Dhankawadi", "बिबवेवाडी": "Bibwewadi",
    "भोसरी": "Bhosari", "पिंपरी": "Pimpri", "चिंचवड": "Chinchwad", "निगडी": "Nigdi", "आकुर्डी": "Akurdi",
    "चाकण": "Chakan", "चाकणमध्ये": "Chakan",
    "लोणावळा": "Lonavala", "लोणावळ्यात": "Lonavala", "खंडाळा": "Khandala",
    "तळेगाव": "Talegaon", "आळंदी": "Alandi",
    "बारामती": "Baramati", "बारामतीत": "Baramati", "बारामतीमध्ये": "Baramati",
    "शिरूर": "Shirur", "शिरूरात": "Shirur",
    "जुन्नर": "Junnar", "जुन्नरात": "Junnar",
    "मुळशी": "Mulshi", "मुळशीत": "Mulshi", "पौड": "Paud",
    "मावळ": "Maval", "मावळात": "Maval",
    "भोर": "Bhor", "भोरात": "Bhor",
    "दौंड": "Daund", "दौंडात": "Daund",
    "इंदापूर": "Indapur", "इंदापुरात": "Indapur",
    "वेल्हे": "Velhe", "वेल्ह्यात": "Velhe",
    "सासवड": "Saswad", "जेजुरी": "Jejuri", "पुरंदर": "Purandar", "मंचर": "Manchar", "आंबेगाव": "Ambegaon", "खेड": "Khed", "राजगुरुनगर": "Khed",
    "मुंबई": "Mumbai", "मुंबईत": "Mumbai", "मुंबईचे": "Mumbai", "मुंबईची": "Mumbai", "बम्बई": "Mumbai",
    "अंधेरी": "Andheri", "अंधेरीत": "Andheri",
    "वांद्रे": "Bandra", "बांद्रा": "Bandra",
    "बोरिवली": "Borivali", "बोरिवलीत": "Borivali",
    "कांदिवली": "Kandivali", "मालाड": "Malad", "गोरेगाव": "Goregaon",
    "दादर": "Dadar", "कुर्ला": "Kurla", "घाटकोपर": "Ghatkopar", "मुलुंड": "Mulund", "पवई": "Powai", "चेंबर": "Chembur",
    "ठाणे": "Thane", "ठाण्यात": "Thane", "कल्याण": "Kalyan", "डोंबिवली": "Dombivli", "नवी मुंबई": "Navi Mumbai", "पनवेल": "Panvel",
    "वसई": "Vasai", "विरार": "Virar", "नालासोपारा": "Nalasopara", "पालघर": "Palghar",
    "अलिबाग": "Alibag", "कर्जत": "Karjat", "खोपोली": "Khopoli",
    "दिल्ली": "Delhi", "दिल्लीत": "Delhi", "दिल्लीचे": "Delhi", "नई दिल्ली": "New Delhi", "नवी दिल्ली": "New Delhi",
    "नोएडा": "Noida", "गुरुग्राम": "Gurugram", "गुडगाव": "Gurugram", "गाझियाबाद": "Ghaziabad", "फरीदाबाद": "Faridabad",
    "नागपूर": "Nagpur", "नागपुरात": "Nagpur", "नागपूरचे": "Nagpur", "नागपुर": "Nagpur",
    "नाशिक": "Nashik", "नाशकात": "Nashik", "नाशिकमध्ये": "Nashik", "नासिक": "Nashik",
    "सोलापूर": "Solapur", "सोलापुरात": "Solapur", "सोलापुर": "Solapur", "पंढरपूर": "Pandharpur",
    "कोल्हापूर": "Kolhapur", "कोल्हापुरात": "Kolhapur", "इचलकरंजी": "Ichalkaranji",
    "छत्रपती संभाजीनगर": "Aurangabad", "संभाजीनगर": "Aurangabad", "औरंगाबाद": "Aurangabad", "औरंगाबादेत": "Aurangabad",
    "जालना": "Jalna", "लातूर": "Latur", "लातुरात": "Latur", "लातुर": "Latur",
    "सांगली": "Sangli", "सांगलीत": "Sangli", "सातारा": "Satara", "साताऱ्यात": "Satara", "महाबळेश्वर": "Mahabaleshwar",
    "बीड": "Beed", "बीडमध्ये": "Beed",
    "अमरावती": "Amravati", "अकोला": "Akola", "अकोल्यात": "Akola",
    "जळगाव": "Jalgaon", "जळगावात": "Jalgaon", "परभणी": "Parbhani", "नांदेड": "Nanded", "नांदेडमध्ये": "Nanded",
    "चंद्रपूर": "Chandrapur", "रत्नागिरी": "Ratnagiri", "रत्नागिरीत": "Ratnagiri", "चिपळूण": "Chiplun",
    "सिंधुदुर्ग": "Sindhudurg", "शिर्डी": "Shirdi", "अहमदनगर": "Ahmednagar", "अहिल्यानगर": "Ahilyanagar",
    "चेन्नई": "Chennai", "चेन्नईत": "Chennai", "कोलकाता": "Kolkata",
    "कलकत्ता": "Kolkata", "बेंगळुरू": "Bengaluru", "बैंगलोर": "Bengaluru", "बेंगलुरु": "Bengaluru",
    "व्हाईटफील्ड": "Whitefield", "कोरामंगला": "Koramangala", "इंदिरानगर": "Indiranagar",
    "हैदराबाद": "Hyderabad", "हैदराबादेत": "Hyderabad", "गाचीबोवली": "Gachibowli", "माधापूर": "Madhapur",
    "जयपूर": "Jaipur", "जयपुर": "Jaipur",
    "जोधपूर": "Jodhpur", "उदयपूर": "Udaipur", "अलवर": "Alwar", "लखनौ": "Lucknow", "लखनऊ": "Lucknow",
    "पाटणा": "Patna", "पटना": "Patna", "भोपाळ": "Bhopal", "भोपाल": "Bhopal", "इंदौर": "Indore",
    "ग्वालियर": "Gwalior", "जबलपूर": "Jabalpur", "उज्जैन": "Ujjain", "चंदीगड": "Chandigarh", "चंडीगढ़": "Chandigarh",
    "लुधियाना": "Ludhiana", "अमृतसर": "Amritsar", "वाराणसी": "Varanasi", "बनारस": "Varanasi",
    "कानपूर": "Kanpur", "कानपुर": "Kanpur", "झांसी": "Jhansi", "झांशी": "Jhansi",
    "प्रयागराज": "Prayagraj", "इलाहाबाद": "Prayagraj", "अयोध्या": "Ayodhya",
    "अहमदाबाद": "Ahmedabad", "अहमदाबादेत": "Ahmedabad", "सूरत": "Surat", "वडोदरा": "Vadodara",
    "राजकोट": "Rajkot", "गुवाहाटी": "Guwahati", "कोची": "Kochi", "कोचीन": "Kochi",
    "कोझिकोड": "Kozhikode", "तिरुवनंतपुरम": "Thiruvananthapuram", "वायनाड": "Wayanad",
    "विशाखापट्टनम": "Visakhapatnam", "वाइजाग": "Visakhapatnam", "विजयवाडा": "Vijayawada",
    "तिरुपती": "Tirupati", "वारंगल": "Warangal", "पुरी": "Puri", "भुवनेश्वर": "Bhubaneswar", "कटक": "Cuttack",
    "राउरकेला": "Rourkela", "संबलपूर": "Sambalpur", "श्रीनगर": "Srinagar", "जम्मू": "Jammu", "शिमला": "Shimla",
    "मनाली": "Manali", "धर्मशाला": "Dharamshala", "देहरादून": "Dehradun", "ऋषिकेश": "Rishikesh",
    "हरिद्वार": "Haridwar", "नैनीताल": "Nainital", "रांची": "Ranchi", "जमशेदपूर": "Jamshedpur",
    "धनबाद": "Dhanbad", "रायपूर": "Raipur", "बिलासपुर": "Bilaspur", "गोवा": "Panaji", "पणजी": "Panaji", "लेह": "Leh",

    # 2. Tamil (தமிழ்)
    "சென்னை": "Chennai", "சென்னையில்": "Chennai", "மதுரை": "Madurai", "கோயம்புத்தூர்": "Coimbatore", "கோவை": "Coimbatore",
    "திருச்சி": "Tiruchirappalli", "திருச்சிராப்பள்ளி": "Tiruchirappalli", "சேலம்": "Salem",
    "திருநெல்வேலி": "Tirunelveli", "ஈரோடு": "Erode", "வேலூர்": "Vellore", "கன்னியாகுமரி": "Kanyakumari",
    "தஞ்சாவூர்": "Thanjavur", "திண்டுக்கல்": "Dindigul", "தூத்துக்குடி": "Thoothukudi", "திருப்பூர்": "Tiruppur",
    "ராமேஸ்வரம்": "Rameshwaram", "புதுச்சேரி": "Puducherry", "காஞ்சிபுரம்": "Kanchipuram", "நாகர்கோவில்": "Nagercoil",

    # 3. Telugu (తెలుగు)
    "హైదరాబాద్": "Hyderabad", "హైదరాబాద్‌లో": "Hyderabad", "విశాఖపట్నం": "Visakhapatnam", "వైజాగ్": "Visakhapatnam", "విజయవాడ": "Vijayawada",
    "తిరుపతి": "Tirupati", "వరంగల్": "Warangal", "గుంటూరు": "Guntur", "నెల్లూరు": "Nellore", "కర్నూలు": "Kurnool",
    "రాజమండ్రి": "Rajahmundry", "కడప": "Kadapa", "కాకినాడ": "Kakinada", "నిజామాబాద్": "Nizamabad",
    "కరీంనగర్": "Karimnagar", "అనంతపురం": "Anantapur", "ఖమ్మం": "Khammam",

    # 4. Bengali (বাংলা)
    "কলকাতা": "Kolkata", "কলকাতায়": "Kolkata", "হাওড়া": "Howrah", "শিলিগুড়ি": "Siliguri", "দুর্গাপুর": "Durgapur",
    "আসানসোল": "Asansol", "বর্ধমান": "Bardhaman", "মেদিনীপুর": "Midnapore", "দার্জিলিং": "Darjeeling",
    "মালদা": "Malda", "জলপাইগুড়ি": "Jalpaiguri", "খড়গপুর": "Kharagpur",

    # 5. Gujarati (ગુજરાતી)
    "અમદાવાદ": "Ahmedabad", "અમદાવાદમાં": "Ahmedabad", "સુરત": "Surat", "વડોદરા": "Vadodara", "રાજકોટ": "Rajkot", "ભાવનગર": "Bhavnagar",
    "જામનગર": "Jamnagar", "જુનાગઢ": "Junagadh", "ગાંધીનગર": "Gandhinagar", "આણંદ": "Anand",
    "નવસારી": "Navsari", "ભરૂચ": "Bharuch", "પોરબંદર": "Porbandar", "મોરબી": "Morbi", "ભુજ": "Bhuj",

    # 6. Punjabi (ਪੰਜਾਬੀ)
    "ਅੰਮ੍ਰਿਤਸਰ": "Amritsar", "ਲੁਧਿਆਣਾ": "Ludhiana", "ਜਲੰਧਰ": "Jalandhar", "ਪਟਿਆਲਾ": "Patiala",
    "ਬਠਿੰਡਾ": "Bathinda", "ਮੋਹਾਲੀ": "Mohali", "ਚੰਡੀਗੜ੍ਹ": "Chandigarh", "ਹੁਸ਼ਿਆਰਪੁਰ": "Hoshiarpur",
    "ਪਠਾਨਕੋਟ": "Pathankot", "ਫ਼ਿਰੋਜ਼ਪੁਰ": "Firozpur",

    # 7. Kannada (ಕನ್ನಡ)
    "ಬೆಂಗಳೂರು": "Bengaluru", "ಬೆಂಗಳೂರಿನಲ್ಲಿ": "Bengaluru", "ಮೈಸೂರು": "Mysuru", "ಮಂಗಳೂರು": "Mangaluru", "ಹುಬ್ಬಳ್ಳಿ": "Hubli",
    "ಧಾರವಾಡ": "Dharwad", "ಬೆಳಗಾವಿ": "Belagavi", "ಕಲಬುರಗಿ": "Kalaburagi", "ಬಳ್ಳಾರಿ": "Ballari",
    "ದಾವಣಗೆರೆ": "Davangere", "ಶಿವಮೊಗ್ಗ": "Shivamogga", "ವಿಜಯಪುರ": "Vijayapura", "ಉಡುಪಿ": "Udupi",
    "ಬೀದರ್": "Bidar", "ಹಾಸನ": "Hassan", "ತುಮಕೂರು": "Tumakuru", "ಕೊಡಗು": "Coorg",

    # 8. Malayalam (മലയാളം)
    "തിരുവനന്തപുരം": "Thiruvananthapuram", "തിരുവനന്തപുരത്ത്": "Thiruvananthapuram", "തിരുവനന്തപുരത്ത്": "Thiruvananthapuram",
    "കൊച്ചി": "Kochi", "കൊച്ചിയിൽ": "Kochi",
    "കോഴിക്കോട്": "Kozhikode", "കോഴിക്കോട്ട്": "Kozhikode",
    "തൃശ്ശൂർ": "Thrissur", "തൃശ്ശൂരിൽ": "Thrissur",
    "കൊല്ലം": "Kollam", "കൊല്ലത്ത്": "Kollam",
    "കണ്ണൂർ": "Kannur", "കണ്ണൂരിൽ": "Kannur",
    "ആലപ്പുഴ": "Alappuzha", "ആലപ്പുഴയിൽ": "Alappuzha",
    "പാലക്കാട്": "Palakkad", "പാലക്കാട്ട്": "Palakkad",
    "കോട്ടയം": "Kottayam", "കോട്ടയത്ത്": "Kottayam",
    "വയനാട്": "Wayanad", "വയനാട്ടിൽ": "Wayanad",
    "മൂന്നാർ": "Munnar", "മൂന്നാറിൽ": "Munnar",
    "മലപ്പുറം": "Malappuram", "ഇടുക്കി": "Idukki", "ഇടുക്കിയിൽ": "Idukki", "കാസർഗോഡ്": "Kasaragod",

    # 9. Odia (ଓଡ଼ିଆ)
    "ଭୁବନେଶ୍ୱର": "Bhubaneswar", "ଭୁବନେଶ୍ବର": "Bhubaneswar", "ଭୁବନେଶ୍ୱରରେ": "Bhubaneswar", "ଭୁବନେଶ୍ବରରେ": "Bhubaneswar",
    "କଟକ": "Cuttack", "କଟକରେ": "Cuttack",
    "ପୁରୀ": "Puri", "ପୁରୀରେ": "Puri",
    "ରାଉରକେଲା": "Rourkela", "ରାଉରକେଲାରେ": "Rourkela",
    "ସମ୍ବଲପୁର": "Sambalpur", "ସମ୍ବଲପୁରରେ": "Sambalpur",
    "ବାଲେଶ୍ୱର": "Balasore", "ବାଲେଶ୍ବର": "Balasore", "ବାଲେଶ୍ୱରରେ": "Balasore",
    "ବ୍ରହ୍ମପୁର": "Berhampur", "ବ୍ରହ୍ମପୁରରେ": "Berhampur",
    "ଭଦ୍ରକ": "Bhadrak", "ଭଦ୍ରକରେ": "Bhadrak",
    "ଅନୁଗୋଳ": "Angul", "ବାରିପଦା": "Baripada",
    "ଝାରସୁଗୁଡ଼ା": "Jharsuguda", "ପାରାଦ୍ୱୀପ": "Paradip", "ପାରାଦ୍ବୀପ": "Paradip", "ପାରାଦ୍ୱୀପରେ": "Paradip",
    "କେନ୍ଦୁଝର": "Keonjhar", "କୋରାପୁଟ": "Koraput"
}

# Regional translations for weather conditions across Indian languages
WEATHER_CONDITION_TRANSLATIONS = {
    "mr": {
        "Clear Sky": "निरभ्र आकाश (Clear Sky)",
        "Mainly Clear": "स्वच्छ हवामान (Mainly Clear)",
        "Partly Cloudy": "अंशतः ढगाळ (Partly Cloudy)",
        "Overcast": "पूर्ण ढगाळ (Overcast)",
        "Fog": "धुके (Fog)",
        "Haze": "धुके व धुरकट वातावरण (Haze)",
        "Light Drizzle": "हलकी रिमझिम (Light Drizzle)",
        "Light Rain": "हलका पाऊस (Light Rain)",
        "Moderate Rain": "मध्यम पाऊस (Moderate Rain)",
        "Heavy Rain": "मुसळधार पाऊस (Heavy Rain)",
        "Thunderstorm": "मेघगर्जना व विजांसह पाऊस (Thunderstorm)",
        "Thunderstorm with Hail": "गारपिटीसह वादळी पाऊस (Hailstorm)"
    },
    "hi": {
        "Clear Sky": "साफ आसमान (Clear Sky)",
        "Mainly Clear": "मुख्यतः साफ (Mainly Clear)",
        "Partly Cloudy": "आंशिक रूप से बादल (Partly Cloudy)",
        "Overcast": "घने बादल (Overcast)",
        "Fog": "कोहरा (Fog)",
        "Haze": "धुंध (Haze)",
        "Light Drizzle": "हलकी बूंदाबांदी (Light Drizzle)",
        "Light Rain": "हल्की बारिश (Light Rain)",
        "Moderate Rain": "मध्यम बारिश (Moderate Rain)",
        "Heavy Rain": "भारी बारिश (Heavy Rain)",
        "Thunderstorm": "गरज के साथ बारिश (Thunderstorm)",
        "Thunderstorm with Hail": "ओलावृष्टि के साथ तूफान (Hailstorm)"
    },
    "ta": {
        "Clear Sky": "தெளிவான வானம் (Clear Sky)",
        "Mainly Clear": "பெரும்பாலும் தெளிவானது (Mainly Clear)",
        "Partly Cloudy": "பகுதி மேகமூட்டம் (Partly Cloudy)",
        "Overcast": "முழு மேகமூட்டம் (Overcast)",
        "Light Rain": "லேசான மழை (Light Rain)",
        "Heavy Rain": "கனமழை (Heavy Rain)",
        "Thunderstorm": "இடி மின்னலுடன் கூடிய மழை (Thunderstorm)"
    },
    "te": {
        "Clear Sky": "నిర్మలమైన ఆకాశం (Clear Sky)",
        "Mainly Clear": "ప్రధానంగా నిర్మలం (Mainly Clear)",
        "Partly Cloudy": "పాక్షికంగా మేఘావృతం (Partly Cloudy)",
        "Overcast": "పూర్తి మేఘావృతం (Overcast)",
        "Light Rain": "తేలికపాటి వర్షం (Light Rain)",
        "Heavy Rain": "భారీ వర్షం (Heavy Rain)",
        "Thunderstorm": "ఉరుములతో కూడిన వర్షం (Thunderstorm)"
    },
    "ml": {
        "Clear Sky": "തെളിഞ്ഞ ആകാശം (Clear Sky)",
        "Mainly Clear": "പ്രധാനമായും തെളിഞ്ഞത് (Mainly Clear)",
        "Partly Cloudy": "ഭാഗികമായി മേഘാവൃതം (Partly Cloudy)",
        "Overcast": "പൂർണ്ണമായി മേഘാവൃതം (Overcast)",
        "Light Rain": "നേരിയ മഴ (Light Rain)",
        "Moderate Rain": "മിതമായ മഴ (Moderate Rain)",
        "Heavy Rain": "കനത്ത മഴ (Heavy Rain)",
        "Thunderstorm": "ഇടിമിന്നലോട് കൂടിയ മഴ (Thunderstorm)"
    },
    "or": {
        "Clear Sky": "ପରିଷ୍କାର ଆକାଶ (Clear Sky)",
        "Mainly Clear": "ମୁଖ୍ୟତଃ ପରିଷ୍କାର (Mainly Clear)",
        "Partly Cloudy": "ଆଂଶିକ ମେଘୁଆ (Partly Cloudy)",
        "Overcast": "ପୂର୍ଣ୍ଣ ମେଘାଚ୍ଛନ୍ନ (Overcast)",
        "Light Rain": "ହାଲୁକା ବର୍ଷା (Light Rain)",
        "Moderate Rain": "ମଧ୍ୟମ ବର୍ଷା (Moderate Rain)",
        "Heavy Rain": "ପ୍ରବଳ ବର୍ଷା (Heavy Rain)",
        "Thunderstorm": "ବଜ୍ରପାତ ସହ ବର୍ଷା (Thunderstorm)"
    }
}

AQI_STATUS_TRANSLATIONS = {
    "mr": {
        "Good": "उत्कृष्ट (Good)",
        "Satisfactory": "समाधानकारक (Satisfactory)",
        "Moderate": "मध्यम (Moderate)",
        "Poor": "खराब (Poor)",
        "Very Poor": "अत्यंत खराब (Very Poor)",
        "Severe": "धोकादायक / गंभीर (Severe)"
    },
    "hi": {
        "Good": "अच्छा (Good)",
        "Satisfactory": "संतोषजनक (Satisfactory)",
        "Moderate": "मध्यम (Moderate)",
        "Poor": "खराब (Poor)",
        "Very Poor": "बहुत खराब (Very Poor)",
        "Severe": "गंभीर (Severe)"
    },
    "ta": {
        "Good": "நன்று (Good)",
        "Satisfactory": "திருப்திகரமானது (Satisfactory)",
        "Moderate": "மிதமானது (Moderate)",
        "Poor": "மோசமானது (Poor)",
        "Very Poor": "மிகவும் மோசம் (Very Poor)",
        "Severe": "கடுமையானது (Severe)"
    },
    "te": {
        "Good": "మంచిది (Good)",
        "Satisfactory": "సంతృప్తికరం (Satisfactory)",
        "Moderate": "మధ్యస్థం (Moderate)",
        "Poor": "పేలవమైనది (Poor)",
        "Very Poor": "చాలా పేలవం (Very Poor)",
        "Severe": "తీవ్రమైనది (Severe)"
    },
    "ml": {
        "Good": "നല്ലത് (Good)",
        "Satisfactory": "തൃപ്തികരം (Satisfactory)",
        "Moderate": "മിതമായത് (Moderate)",
        "Poor": "മോശം (Poor)",
        "Very Poor": "വളരെ മോശം (Very Poor)",
        "Severe": "ഗുരുതരം (Severe)"
    },
    "or": {
        "Good": "ଉତ୍ତମ (Good)",
        "Satisfactory": "ସନ୍ତୋଷଜନକ (Satisfactory)",
        "Moderate": "ମଧ୍ୟମ (Moderate)",
        "Poor": "ଖରାପ (Poor)",
        "Very Poor": "ଅତି ଖରାପ (Very Poor)",
        "Severe": "ଗମ୍ଭୀର (Severe)"
    }
}

def translate_weather_condition(condition: str, lang: str) -> str:
    if lang in WEATHER_CONDITION_TRANSLATIONS and condition in WEATHER_CONDITION_TRANSLATIONS[lang]:
        return WEATHER_CONDITION_TRANSLATIONS[lang][condition]
    return condition

def translate_aqi_status(status: str, lang: str) -> str:
    if lang in AQI_STATUS_TRANSLATIONS and status in AQI_STATUS_TRANSLATIONS[lang]:
        return AQI_STATUS_TRANSLATIONS[lang][status]
    return status

MARATHI_DISTINCT_WORDS = [
    "हवामान", "पाऊस", "पडेल", "पडणार", "शेतकरी", "कापूस", "सोयाबीन", "ऊस", "गहू", "भात",
    "कसे", "कसा", "कशी", "आहे", "नाही", "आहेत", "नाहीत", "सांगा", "दाखवा", "द्या", "उद्या",
    "परवा", "मध्ये", "वार", "अंदाज", "माहिती", "थंडी", "ऊन", "वारा", "वादळ", "जास्त", "कमी",
    "होईल", "असेल", "इशारा", "सल्ला", "पुण्यात", "मुंबईत", "नागपुरात", "नाशकात", "तास",
    "दिवसांचा", "काय", "कधी", "कुठे", "करा"
]

HINDI_DISTINCT_WORDS = [
    "मौसम", "बारिश", "बरसात", "किसान", "फसल", "फसलें", "कपास", "गेहूं", "धान", "गन्ना",
    "कैसा", "कैसी", "कैसे", "है", "नहीं", "हैं", "बताओ", "बताइए", "दिखाइए", "दीजिए", "कल",
    "परसों", "में", "पूर्वानुमान", "जानकारी", "ठंड", "धूप", "गर्मी", "तूफान", "ज्यादा", "कम",
    "होगा", "होगी", "होंगे", "पड़ेगा", "पड़ेगी", "चेतावनी", "सलाह", "दिल्ली में", "घंटे",
    "दिनों", "क्या", "कब", "कहाँ", "करो"
]

INDIC_KEYWORDS_MAP = {
    "ta": ["வானிலை", "மழை", "வெப்பநிலை", "விவசாயம்", "காற்று", "புயல்", "இன்று", "நாளை", "பெய்யுமா", "எப்படி"],
    "te": ["వాతావరణం", "వర్షం", "ఉష్ణోగ్రత", "పంట", "రైతు", "గాలి", "హెచ్చరిక", "ఎలా", "రేపు", "ఈరోజు"],
    "bn": ["আবহাওয়া", "বৃষ্টি", "তাপমাত্রা", "ঘূর্ণিঝড়", "আজ", "কাল", "কেমন", "হবে", "কী"],
    "gu": ["હવામાન", "વરસાદ", "તાપમાન", "ખેડૂત", "પાક", "આગાહી", "પડશે", "આજે", "કાલે", "કેવું"],
    "pa": ["ਮੌਸਮ", "ਮੀਂਹ", "ਤਾਪਮਾਨ", "ਕਣਕ", "ਝੋਨਾ", "ਕੱਲ੍ਹ", "ਕਿਵੇਂ", "ਅੱਜ", "ਹੈ"],
    "kn": ["ಹವಾಮಾನ", "ಮಳೆ", "ತಾಪಮಾನ", "ಬೆಳೆ", "ರೈತ", "ಬರುತ್ತದೆಯೇ", "ಇಂದು", "ನಾಳೆ", "ಹೇಗಿದೆ"],
    "ml": ["കാലാവസ്ഥ", "മഴ", "താപനില", "കൃഷി", "കാറ്റ്", "ചുഴലിക്കാറ്റ്", "ഇന്ന്", "നാളെ", "പെയ്യുമോ", "എങ്ങനെ"],
    "or": ["ପାଣିପାଗ", "ବର୍ଷା", "ତାପମାତ୍ରା", "ଚାଷ", "କୃଷି", "ପବନ", "ବାତ୍ୟା", "ଆଜି", "କାଲି", "ହେବ", "କିପରି"]
}

def detect_language(text: str) -> str:
    """Accurately detects Indian regional language or English."""
    if not text or not text.strip():
        return "en"
    
    # 1. Check Non-Devanagari Indic Scripts first
    for lang, kws in INDIC_KEYWORDS_MAP.items():
        for kw in kws:
            if kw in text:
                return lang

    # 2. Check for Unique Marathi characters like 'ळ' (\u0933) or 'ऱ'
    if "ळ" in text or "\u0933" in text or "ऱ" in text:
        return "mr"

    # 3. Check specific Marathi vs Hindi keywords
    mr_score = sum(1 for w in MARATHI_DISTINCT_WORDS if w in text)
    hi_score = sum(1 for w in HINDI_DISTINCT_WORDS if w in text)

    if mr_score > 0 and mr_score >= hi_score:
        return "mr"
    if hi_score > 0 and hi_score > mr_score:
        return "hi"

    # 4. Check Unicode ranges for other scripts
    for char in text:
        code = ord(char)
        if 0x0B80 <= code <= 0x0BFF:
            return "ta"
        elif 0x0C00 <= code <= 0x0C7F:
            return "te"
        elif 0x0980 <= code <= 0x09FF:
            return "bn"
        elif 0x0A80 <= code <= 0x0AFF:
            return "gu"
        elif 0x0A00 <= code <= 0x0A7F:
            return "pa"
        elif 0x0C80 <= code <= 0x0CFF:
            return "kn"
        elif 0x0D00 <= code <= 0x0D7F:
            return "ml"
        elif 0x0B00 <= code <= 0x0B7F:
            return "or"
        elif 0x0900 <= code <= 0x097F:
            # General Devanagari fallback: check Marathi cities
            for m_city in ["पुणे", "नागपूर", "नाशिक", "सोलापूर", "कोल्हापूर", "संभाजीनगर", "ठाणे", "सांगली", "सातारा", "बारामती"]:
                if m_city in text:
                    return "mr"
            return "hi"
            
    return "en"

STOPWORDS = {
    "what", "is", "the", "weather", "forecast", "temperature", "rain", "rainfall", 
    "heavy", "how", "hot", "cold", "now", "right", "today", "tomorrow", "tonight", 
    "this", "week", "will", "it", "in", "at", "near", "for", "around", "over", "of", 
    "and", "to", "tell", "me", "show", "give", "update", "condition", "status", 
    "kaisa", "hai", "hoga", "kya", "padega", "aaj", "kal", "ka", "ki", "ke", "liye",
    "crop", "agri", "farming", "cotton", "paddy", "wheat", "sugarcane", "pesticide",
    "please", "can", "you", "check", "current", "live", "about", "details", "info",
    "हवामान", "अंदाज", "माहिती", "पाऊस", "पडेल", "पडणार", "कसे", "कसा", "कशी", "आहे", "नाही", "सांगा", "दाखवा", "द्या", "उद्या", "आज", "वार", "तापमान", "शेतकरी", "सल्ला",
    "मौसम", "पूर्वानुमान", "जानकारी", "बारिश", "बरसात", "कैसा", "कैसी", "कैसे", "है", "नहीं", "बताओ", "बताइए", "दिखाइए", "कल", "तापमान", "किसान", "सलाह",
    "மழை", "வானிலை", "பெய்யுமா", "இன்று", "நாளை",
    "వర్షం", "వాతావరణం", "ఎలా", "ఉంది", "రేపు",
    "বৃষ্টি", "আবহাওয়া", "হবে", "কি", "আজ", "কাল",
    "વરસાદ", "હવામાન", "પડશે", "આજે", "કાલે",
    "ਮੀਂਹ", "ਮੌਸਮ", "ਕਿਵੇਂ", "ਹੈ", "ਅੱਜ", "ਕੱਲ੍ਹ",
    "ಮಳೆ", "ಹವಾಮಾನ", "ಬರುತ್ತದೆಯೇ", "ಇಂದು", "ನಾಳೆ",
    "മഴ", "കാലാവസ്ഥ", "പെയ്യുമോ", "ഇന്ന്", "നാളെ", "താപനില", "കൃഷി",
    "ପାଣିପାଗ", "ବର୍ଷା", "ହେବ", "କି", "ଆଜି", "କାଲି", "ତାପମାତ୍ରା", "କୃଷି"
}

def extract_location_from_query(text: str, fallback_loc: Optional[str] = None) -> str:
    """Extracts location with multi-stage entity resolution across all Indian language scripts."""
    lowered = text.lower()
    
    # 1. Match against known 250+ Indian cities and districts (English)
    sorted_cities = sorted(INDIAN_LOCATIONS.keys(), key=len, reverse=True)
    for city_key in sorted_cities:
        pattern = r'\b' + re.escape(city_key) + r'\b'
        if re.search(pattern, lowered):
            return city_key.title()

    # 2. Check Indic Multi-Script Dictionary (Tamil, Telugu, Bengali, Gujarati, Punjabi, Kannada, Marathi, Hindi)
    sorted_indic = sorted(INDIC_LOCATION_TRANSLITERATIONS.keys(), key=len, reverse=True)
    for indic_name in sorted_indic:
        if indic_name in text:
            return INDIC_LOCATION_TRANSLITERATIONS[indic_name]

    # 3. Regex extraction: 'in <City>', 'at <City>', 'near <City>', 'for <City>'
    match = re.search(r'\b(?:in|at|near|for|around|over|of)\s+([A-Za-z]+)', text, re.IGNORECASE)
    if match:
        cand = match.group(1).strip()
        if cand.lower() not in STOPWORDS and len(cand) >= 3:
            return cand.title()

    # 4. Tokenize Unicode words (including all Indic regional scripts)
    unicode_tokens = re.findall(r'[\w\u0900-\u0DFF]{3,}', text)
    candidate_tokens = [w for w in unicode_tokens if w.lower() not in STOPWORDS]
    if candidate_tokens:
        # Check if first candidate token is a known regional city
        for tok in candidate_tokens:
            for indic_name in sorted_indic:
                if indic_name in tok:
                    return INDIC_LOCATION_TRANSLITERATIONS[indic_name]
        return candidate_tokens[0]

    # 5. Fallback context
    if fallback_loc and fallback_loc.strip() and fallback_loc.lower() not in ["your location", "auto", ""]:
        return fallback_loc.strip().title()

    return "New Delhi"

def analyze_rain_outlook(weather: WeatherData) -> Dict[str, Any]:
    """Extracts peak rain probability, timeline window, and daily precipitation amount from 24h predictions."""
    hourly = weather.hourly or []
    curr_prob = hourly[0].rain_prob if hourly else 10
    
    # Check peak in next 12-24 hours
    next_12 = hourly[:12] if len(hourly) >= 12 else hourly
    peak_prob = max([h.rain_prob for h in next_12], default=curr_prob)
    peak_hours = [h.time for h in next_12 if h.rain_prob == peak_prob]
    peak_time_str = f"around {peak_hours[0]}" if peak_hours else "in upcoming hours"
    
    today_rain = weather.daily[0].rain_sum if weather.daily else weather.precipitation
    tomorrow_rain = weather.daily[1].rain_sum if weather.daily and len(weather.daily) > 1 else 0.0
    
    is_rain_active = weather.precipitation > 0.0 or (weather.condition_code >= 51 and weather.condition_code <= 99)
    is_rain_predicted = peak_prob >= 40 or today_rain > 1.0 or tomorrow_rain > 1.0
    
    return {
        "current_prob": curr_prob,
        "peak_prob": peak_prob,
        "peak_time": peak_time_str,
        "today_rain": today_rain,
        "tomorrow_rain": tomorrow_rain,
        "is_active": is_rain_active,
        "is_predicted": is_rain_predicted
    }

def format_human_weather_story(weather: WeatherData, proper_name: str, state_name: str) -> str:
    """Generates an articulate, executive intelligence summary with 24-hour rain timeline."""
    today = weather.daily[0] if weather.daily else None
    max_t = today.temp_max if today else weather.current_temp + 4
    min_t = today.temp_min if today else weather.current_temp - 4
    
    rain_info = analyze_rain_outlook(weather)
    
    if rain_info["is_active"] or weather.precipitation > 5.0 or rain_info["current_prob"] > 60:
        rain_desc = (
            f"🌧️ **Active/Heavy Rain Warning**: Current rain probability is **{rain_info['current_prob']}%** with active precipitation ({weather.precipitation} mm). "
            f"Peak convective rain spells expected **{rain_info['peak_time']}** (up to **{rain_info['peak_prob']}% probability**, today's total: **{rain_info['today_rain']} mm**)."
        )
    elif rain_info["is_predicted"]:
        rain_desc = (
            f"🌦️ **Rain Ahead**: While current rain probability is **{rain_info['current_prob']}%**, rain chances increase significantly **{rain_info['peak_time']}** "
            f"reaching **{rain_info['peak_prob']}%** (predicted accumulation: **{rain_info['today_rain']} mm**)."
        )
    elif weather.precipitation > 0.1 or rain_info["current_prob"] > 25:
        rain_desc = f"Passing light showers possible (**{rain_info['current_prob']}% probability**) with minor {weather.precipitation} mm precipitation."
    else:
        rain_desc = f"Dry conditions are expected to prevail (**{rain_info['current_prob']}% rain probability**) with negligible rainfall."

    if weather.current_temp > 38.0:
        comfort = f"⚠️ **High thermal discomfort**: Ambient temperature is elevated at **{weather.current_temp}°C** (feels like **{weather.feels_like}°C**). Sun protection and hydration are recommended."
    elif weather.current_temp < 15.0:
        comfort = f"❄️ **Cool and pleasant weather**: Morning temperatures dip to **{min_t}°C**."
    else:
        comfort = f"Current conditions are **{weather.condition}** with a temperature of **{weather.current_temp}°C** (feels like **{weather.feels_like}°C**)."

    wind_desc = f"Surface winds are blowing from the **{weather.wind_direction}** at **{weather.wind_speed} km/h**. Relative humidity is at **{weather.humidity}%** with atmospheric pressure of **{weather.pressure} hPa**."
    aqi_desc = f"Air Quality Index (AQI) is **{weather.aqi}**, categorized as **{weather.aqi_status}**."

    return (
        f"### 🌤️ Weather Intelligence: **{proper_name}, {state_name}**\n\n"
        f"{comfort}\n\n"
        f"**Key Forecast Highlights:**\n"
        f"- 🌡️ **Temperature Range:** Low of **{min_t}°C** to a High of **{max_t}°C**\n"
        f"- 🌧️ **Precipitation & Rain Forecast:** {rain_desc}\n"
        f"- 💨 **Wind & Atmosphere:** {wind_desc}\n"
        f"- 🍃 **Air Quality:** {aqi_desc}\n"
        f"- ☀️ **Solar UV:** UV Index is **{weather.uv_index}** ({'Very High' if weather.uv_index > 7 else 'Moderate'}) with Sunrise at **{weather.sunrise} IST** and Sunset at **{weather.sunset} IST**.\n"
    )

def extract_two_locations(text: str) -> Tuple[str, str]:
    """Extracts two city names for comparison queries."""
    patterns = [
        r'(?:compare|between)\s+([A-Za-z]+)\s+(?:and|vs|with|to)\s+([A-Za-z]+)',
        r'([A-Za-z]+)\s+(?:vs|versus)\s+([A-Za-z]+)',
        r'([A-Za-z]+)\s+(?:or|and)\s+([A-Za-z]+)\s+weather',
        r'([A-Za-z]+)\s+(?:hotter|colder|better|warmer)\s+than\s+([A-Za-z]+)'
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            c1, c2 = m.group(1).strip().title(), m.group(2).strip().title()
            if c1.lower() not in STOPWORDS and c2.lower() not in STOPWORDS:
                return c1, c2
    return "Mumbai", "Delhi"

def process_conversational_query(req: WeatherQueryRequest) -> ChatResponse:
    """Main LLM Tool Calling and Query Processing Engine with Multilingual Generation."""
    query = req.query.strip()
    
    # Priority: If user explicitly selected a language in the dropdown, use it.
    # Otherwise, detect from query text.
    if req.language and req.language.strip() and req.language.strip().lower() != "auto":
        lang = req.language.strip().lower()
    else:
        lang = detect_language(query)
        
    persona = req.persona or "general"
    q_low = query.lower()

    # Comparison Intent
    is_compare = any(k in q_low for k in ["compare", " vs ", "versus", "hotter than", "colder than", "warmer than", "better than", "तुलना", "तुलना करा", "ஒப்பீடு", "పోలిక"])
    if is_compare:
        c1, c2 = extract_two_locations(query)
        comp_data = compare_locations(c1, c2)
        
        if lang == "mr":
            speech_text = f"{comp_data.city1.location} आणि {comp_data.city2.location} हवामान तुलना: {comp_data.temp_warmer_city} चे तापमान {abs(comp_data.temp_diff)}°C ने जास्त आहे. प्रवास सुरक्षा गुण {comp_data.travel_safety_score}/100 आहे."
            markdown_resp = (
                f"### ⚖️ **तुलनात्मक हवामान विश्लेषण: {comp_data.city1.location} वि {comp_data.city2.location}**\n\n"
                f"| घटक | 📍 **{comp_data.city1.location}** ({comp_data.city1.state}) | 📍 **{comp_data.city2.location}** ({comp_data.city2.state}) | 📊 **फरक / निष्कर्ष** |\n"
                f"| :--- | :--- | :--- | :--- |\n"
                f"| 🌡️ **सध्याचे तापमान** | **{comp_data.city1.current_temp}°C** (अनुभव: {comp_data.city1.feels_like}°C) | **{comp_data.city2.current_temp}°C** (अनुभव: {comp_data.city2.feels_like}°C) | **{comp_data.temp_warmer_city}** +{abs(comp_data.temp_diff)}°C जास्त उष्ण |\n"
                f"| 💧 **आर्द्रता** | **{comp_data.city1.humidity}%** | **{comp_data.city2.humidity}%** | फरक {abs(comp_data.humidity_diff)}% |\n"
                f"| 💨 **वाऱ्याचा वेग** | **{comp_data.city1.wind_speed} km/h** ({comp_data.city1.wind_direction}) | **{comp_data.city2.wind_speed} km/h** ({comp_data.city2.wind_direction}) | — |\n"
                f"| 🍃 **हवेचा दर्जा (AQI)** | **{comp_data.city1.aqi}** ({translate_aqi_status(comp_data.city1.aqi_status, 'mr')}) | **{comp_data.city2.aqi}** ({translate_aqi_status(comp_data.city2.aqi_status, 'mr')}) | 🌿 **{comp_data.aqi_better_city}** ची हवा अधिक शुद्ध |\n"
                f"| 🌧️ **पाऊस / स्थिती** | **{comp_data.city1.precipitation} mm** ({translate_weather_condition(comp_data.city1.condition, 'mr')}) | **{comp_data.city2.precipitation} mm** ({translate_weather_condition(comp_data.city2.condition, 'mr')}) | 🌧️ **{comp_data.rain_risk_city}** मध्ये पावसाची शक्यता जास्त |\n\n"
                f"#### 🚗 **महामार्ग व प्रवास सुरक्षा (गुण: {comp_data.travel_safety_score}/100)**\n"
                f"{comp_data.travel_advisory}\n\n"
                f"#### 🏃 **आरोग्य व नागरिक सल्ला**\n"
                f"- 🏃 **खेळाडू व धावपटू:** {comp_data.health_advisory.athletes}\n"
                f"- 🫁 **दमा व श्वसन विकार:** {comp_data.health_advisory.asthma_patients}\n"
                f"- 👶 **लहान मुले व शाळा:** {comp_data.health_advisory.children_schools}\n"
                f"- 👴 **ज्येष्ठ नागरिक:** {comp_data.health_advisory.elderly}\n"
            )
            quick_suggestions = [
                "पुणे वि गोवा तुलना करा",
                "मुंबई वि दिल्ली तुलना करा",
                "नाशिक वि नागपूर हवामान",
                f"{comp_data.city1.location} चा 7 दिवसांचा अंदाज"
            ]
            suggested_actions = [
                {"label": "तुलना मॅट्रिक्स उघडा", "action": "open_compare"},
                {"label": "डॉप्लर रडार नकाशा", "action": "open_map"},
                {"label": "सक्रिय आपत्ती इशारे", "action": "open_alerts"}
            ]
        elif lang == "hi":
            speech_text = f"{comp_data.city1.location} और {comp_data.city2.location} के मौसम की तुलना: {comp_data.temp_warmer_city} का तापमान {abs(comp_data.temp_diff)}°C अधिक है। यात्रा सुरक्षा स्कोर {comp_data.travel_safety_score}/100 है।"
            markdown_resp = (
                f"### ⚖️ **तुलनात्मक मौसम विश्लेषण: {comp_data.city1.location} बनाम {comp_data.city2.location}**\n\n"
                f"| पैरामीटर | 📍 **{comp_data.city1.location}** ({comp_data.city1.state}) | 📍 **{comp_data.city2.location}** ({comp_data.city2.state}) | 📊 **अंतर / बढ़त** |\n"
                f"| :--- | :--- | :--- | :--- |\n"
                f"| 🌡️ **वर्तमान तापमान** | **{comp_data.city1.current_temp}°C** (महसूस: {comp_data.city1.feels_like}°C) | **{comp_data.city2.current_temp}°C** (महसूस: {comp_data.city2.feels_like}°C) | **{comp_data.temp_warmer_city}** +{abs(comp_data.temp_diff)}°C अधिक गर्म |\n"
                f"| 💧 **आर्द्रता** | **{comp_data.city1.humidity}%** | **{comp_data.city2.humidity}%** | अंतर {abs(comp_data.humidity_diff)}% |\n"
                f"| 💨 **हवा की गति** | **{comp_data.city1.wind_speed} km/h** ({comp_data.city1.wind_direction}) | **{comp_data.city2.wind_speed} km/h** ({comp_data.city2.wind_direction}) | — |\n"
                f"| 🍃 **वायु गुणवत्ता (AQI)** | **{comp_data.city1.aqi}** ({translate_aqi_status(comp_data.city1.aqi_status, 'hi')}) | **{comp_data.city2.aqi}** ({translate_aqi_status(comp_data.city2.aqi_status, 'hi')}) | 🌿 **{comp_data.aqi_better_city}** की हवा अधिक स्वच्छ |\n"
                f"| 🌧️ **वर्षा / स्थिति** | **{comp_data.city1.precipitation} mm** ({translate_weather_condition(comp_data.city1.condition, 'hi')}) | **{comp_data.city2.precipitation} mm** ({translate_weather_condition(comp_data.city2.condition, 'hi')}) | 🌧️ **{comp_data.rain_risk_city}** में बारिश का जोखिम अधिक |\n\n"
                f"#### 🚗 **हाईवे व यात्रा सुरक्षा (स्कोर: {comp_data.travel_safety_score}/100)**\n"
                f"{comp_data.travel_advisory}\n\n"
                f"#### 🏃 **स्वास्थ्य व संवेदनशीलता परामर्श**\n"
                f"- 🏃 **एथलीट और धावक:** {comp_data.health_advisory.athletes}\n"
                f"- 🫁 **अस्थमा व श्वसन रोगी:** {comp_data.health_advisory.asthma_patients}\n"
                f"- 👶 **बच्चे और स्कूल:** {comp_data.health_advisory.children_schools}\n"
                f"- 👴 **वरिष्ठ नागरिक:** {comp_data.health_advisory.elderly}\n"
            )
            quick_suggestions = [
                "पुणे बनाम गोवा तुलना करें",
                "मुंबई बनाम दिल्ली तुलना करें",
                "शिमला बनाम मनाली मौसम",
                f"{comp_data.city1.location} 7 दिनों का पूर्वानुमान"
            ]
            suggested_actions = [
                {"label": "तुलना मैट्रिक्स खोलें", "action": "open_compare"},
                {"label": "डॉपलर रडार मैप", "action": "open_map"},
                {"label": "सक्रिय आपदा चेतावनी", "action": "open_alerts"}
            ]
        else:
            speech_text = f"Comparing {comp_data.city1.location} and {comp_data.city2.location}. {comp_data.temp_warmer_city} is warmer by {abs(comp_data.temp_diff)} degrees Celsius. Travel safety score is {comp_data.travel_safety_score} out of 100."
            markdown_resp = (
                f"### ⚖️ **Comparative Weather Intelligence: {comp_data.city1.location} vs {comp_data.city2.location}**\n\n"
                f"| Metric | 📍 **{comp_data.city1.location}** ({comp_data.city1.state}) | 📍 **{comp_data.city2.location}** ({comp_data.city2.state}) | 📊 **Variance / Advantage** |\n"
                f"| :--- | :--- | :--- | :--- |\n"
                f"| 🌡️ **Current Temp** | **{comp_data.city1.current_temp}°C** (Feels {comp_data.city1.feels_like}°C) | **{comp_data.city2.current_temp}°C** (Feels {comp_data.city2.feels_like}°C) | **{comp_data.temp_warmer_city}** is +{abs(comp_data.temp_diff)}°C warmer |\n"
                f"| 💧 **Humidity** | **{comp_data.city1.humidity}%** | **{comp_data.city2.humidity}%** | $\\Delta$ {abs(comp_data.humidity_diff)}% |\n"
                f"| 💨 **Wind Speed** | **{comp_data.city1.wind_speed} km/h** ({comp_data.city1.wind_direction}) | **{comp_data.city2.wind_speed} km/h** ({comp_data.city2.wind_direction}) | — |\n"
                f"| 🍃 **Air Quality (AQI)** | **{comp_data.city1.aqi}** ({comp_data.city1.aqi_status}) | **{comp_data.city2.aqi}** ({comp_data.city2.aqi_status}) | 🌿 **{comp_data.aqi_better_city}** has cleaner air |\n"
                f"| 🌧️ **Precipitation** | **{comp_data.city1.precipitation} mm** ({comp_data.city1.condition}) | **{comp_data.city2.precipitation} mm** ({comp_data.city2.condition}) | 🌧️ Higher rain risk in **{comp_data.rain_risk_city}** |\n\n"
                f"#### 🚗 **Highway & Transit Route Safety (Score: {comp_data.travel_safety_score}/100)**\n"
                f"{comp_data.travel_advisory}\n\n"
                f"#### 🏃 **Health & Vulnerability Personas**\n"
                f"- 🏃 **Athletes & Runners:** {comp_data.health_advisory.athletes}\n"
                f"- 🫁 **Asthma & Respiratory:** {comp_data.health_advisory.asthma_patients}\n"
                f"- 👶 **Children & Schools:** {comp_data.health_advisory.children_schools}\n"
                f"- 👴 **Senior Citizens:** {comp_data.health_advisory.elderly}\n"
            )
            quick_suggestions = [
                "Compare Pune vs Goa",
                "Compare Bengaluru vs Hyderabad",
                "Compare Shimla vs Manali",
                f"7-day forecast for {comp_data.city1.location}"
            ]
            suggested_actions = [
                {"label": "Open Comparison Matrix", "action": "open_compare"},
                {"label": "View Doppler Radar Map", "action": "open_map"},
                {"label": "Active CAP Warnings", "action": "open_alerts"}
            ]

        return ChatResponse(
            query=query,
            detected_language=lang,
            persona=persona,
            speech_text=speech_text,
            markdown_response=markdown_resp,
            structured_weather=comp_data.city1,
            comparison_data=comp_data,
            alerts=None,
            agri_advisory=None,
            aviation_briefing=None,
            marine_advisory=None,
            quick_suggestions=quick_suggestions,
            suggested_actions=suggested_actions
        )
    
    # Extract location
    loc_name = extract_location_from_query(query, req.location_name)
    lat, lon, proper_name, state_name = geocode_location(loc_name)
    
    # Fetch live weather telemetry and NWP grids
    weather = fetch_weather_data(lat, lon, proper_name, state_name)
    
    # Identify Intent
    is_cyclone = any(k in q_low for k in ["cyclone", "storm", "vaayu", "flood", "warning", "alert", "danger", "disaster", "अलर्ट", "चेतावनी", "वादळ", "आपत्ती", "इशारा"])
    is_agri = persona == "farmer" or any(k in q_low for k in ["crop", "farmer", "paddy", "cotton", "wheat", "sugarcane", "irrigation", "spray", "pesticide", "harvest", "फसल", "धान", "गेहूं", "कापूस", "शेती", "शेतकरी", "पीक"])
    is_aviation = persona == "aviation" or any(k in q_low for k in ["flight", "aviation", "metar", "taf", "airport", "pilot", "runway", "ifr", "vfr", "विमान"])
    is_marine = persona == "marine" or any(k in q_low for k in ["sea", "marine", "ocean", "wave", "tide", "fisherman", "fishing", "coastal", "समुद्र", "लाटा", "मच्छीमार"])

    alerts = None
    agri_adv = None
    av_brief = None
    marine_adv = None
    
    if is_agri:
        crop = "paddy"
        for c in ["cotton", "wheat", "sugarcane", "soybean", "mustard"]:
            if c in q_low or ("कापूस" in query and c == "cotton") or ("सोयाबीन" in query and c == "soybean") or ("गहू" in query and c == "wheat") or ("ऊस" in query and c == "sugarcane"):
                crop = c
                break
        rain_prob = weather.hourly[0].rain_prob if weather.hourly else 20
        agri_adv = generate_crop_advisory(crop, proper_name, state_name, weather.current_temp, rain_prob, weather.humidity)

    if is_aviation:
        av_brief = get_aviation_briefing(proper_name)

    if is_marine:
        marine_adv = get_marine_advisory(proper_name)

    if is_cyclone or weather.current_temp > 42.0 or weather.precipitation > 25.0:
        alerts = get_active_alerts(state=state_name, district=proper_name)

    today = weather.daily[0] if weather.daily else None
    min_t = today.temp_min if today else weather.current_temp - 3
    max_t = today.temp_max if today else weather.current_temp + 4
    rain_info = analyze_rain_outlook(weather)
    rain_p = rain_info["current_prob"]

    # 1. MARATHI (mr)
    if lang == "mr":
        cond_mr = translate_weather_condition(weather.condition, "mr")
        aqi_mr = translate_aqi_status(weather.aqi_status, "mr")
        speech_text = f"{proper_name} मध्ये सध्याचे तापमान {weather.current_temp}°C असून हवामान {cond_mr} आहे. पावसाची शक्यता {rain_info['current_prob']}% आहे."
        
        if rain_info["is_active"] or weather.precipitation > 2.0:
            rain_mr = f"🌧️ **पाऊस इशारा / सक्रिय पाऊस**: सध्या **{rain_info['current_prob']}%** शक्यता असून **{weather.precipitation} mm** पाऊस नोंदवला आहे. पुढील काही तासांत (अंदाजे **{rain_info['peak_time']}**) पावसाचा जोर वाढून **{rain_info['peak_prob']}%** पर्यंत पोहोचू शकतो (आजचा एकूण पाऊस: **{rain_info['today_rain']} mm**)."
        elif rain_info["is_predicted"]:
            rain_mr = f"🌦️ **पावसाचा अंदाज**: सध्या **{rain_info['current_prob']}%** शक्यता असली तरी **{rain_info['peak_time']}** दरम्यान पाऊस पडण्याची **{rain_info['peak_prob']}% शक्यता** आहे (अपेक्षित पाऊस: **{rain_info['today_rain']} mm**)."
        else:
            rain_mr = f"निरभ्र / कोरडे वातावरण राहण्याची शक्यता (**{rain_info['current_prob']}%** पाऊस शक्यता)."

        markdown_resp = (
            f"### 🌤️ **{proper_name}, {state_name} हवामान अंदाज**\n\n"
            f"{proper_name} मध्ये सध्या **{cond_mr}** वातावरण असून तापमान **{weather.current_temp}°C** (अनुभव: **{weather.feels_like}°C**) नोंदवले गेले आहे.\n\n"
            f"**प्रमुख हवामान मुद्दे:**\n"
            f"- 🌡️ **तापमान कक्षा:** किमान **{min_t}°C** ते कमाल **{max_t}°C**\n"
            f"- 🌧️ **पाऊस व पर्जन्यमान अंदाज:** {rain_mr}\n"
            f"- 💨 **वाऱ्याचा वेग व दिशा:** **{weather.wind_speed} km/h {weather.wind_direction}**, हवेतील आर्द्रता **{weather.humidity}%**\n"
            f"- 🍃 **हवेचा दर्जा (AQI):** **{weather.aqi}** ({aqi_mr})\n"
            f"- ☀️ **सूर्यप्रकाश व UV निर्देशांक:** UV इंडेक्स **{weather.uv_index}**, सूर्योदय **{weather.sunrise} IST** व सूर्यास्त **{weather.sunset} IST**.\n"
        )
        if agri_adv:
            speech_text += f" शेतकरी बांधवांसाठी कृषी सल्ला: {agri_adv.irrigation_advice}"
            markdown_resp += (
                f"\n#### 🌾 **शेतकरी मेघदूत कृषी सल्ला ({agri_adv.crop})**\n"
                f"- **पाणी व्यवस्थापन / सिंचन:** {agri_adv.irrigation_advice}\n"
                f"- **कीटकनाशक व फवारणी:** {agri_adv.pesticide_advice}\n"
                f"- **कापणी व साठवणूक:** {agri_adv.harvest_recommendation}\n"
            )
        if av_brief:
            markdown_resp += f"\n#### ✈️ **विमान वाहतूक माहिती ({av_brief.station_icao})**: {av_brief.flight_category} - {av_brief.metar_raw}\n"
        if marine_adv:
            markdown_resp += f"\n#### ⚓ **सागरी हवामान इशारा (INCOIS)**: लाटा {marine_adv.wave_height_m}m ({marine_adv.sea_condition}). {marine_adv.warning_message}\n"
        if alerts:
            markdown_resp += f"\n#### 🚨 **सक्रिय आपत्ती इशारे (CAP Alerts)**\n"
            for alt in alerts:
                markdown_resp += f"- **[{alt.severity.upper()} इशारा] {alt.headline}**\n"

        quick_suggestions = [
            f"{proper_name} मध्ये उद्या पाऊस पडेल का?",
            f"{proper_name} साठी शेतकरी कृषी सल्ला",
            f"{proper_name} चा 7 दिवसांचा सविस्तर अंदाज",
            f"{state_name} चे आपत्ती इशारे दाखवा"
        ]
        suggested_actions = [
            {"label": "GIS रडार नकाशा पहा", "action": "open_map"},
            {"label": "7-दिवसीय सविस्तर अंदाज", "action": "open_dashboard"},
            {"label": "शेतकरी मेघदूत कृषी सल्ला", "action": "open_agri"},
            {"label": "आपत्ती इशारे केंद्र", "action": "open_alerts"}
        ]

    # 2. HINDI (hi)
    elif lang == "hi":
        cond_hi = translate_weather_condition(weather.condition, "hi")
        aqi_hi = translate_aqi_status(weather.aqi_status, "hi")
        speech_text = f"{proper_name} में वर्तमान तापमान {weather.current_temp}°C है और मौसम {cond_hi} है। बारिश की संभावना {rain_info['current_prob']}% है।"
        
        if rain_info["is_active"] or weather.precipitation > 2.0:
            rain_hi = f"🌧️ **बारिश चेतावनी / सक्रिय वर्षा**: वर्तमान में **{rain_info['current_prob']}%** संभावना के साथ **{weather.precipitation} mm** वर्षा दर्ज है। अगले कुछ घंटों में (अनुमानित **{rain_info['peak_time']}**) वर्षा की संभावना बढ़कर **{rain_info['peak_prob']}%** हो सकती है (आज की कुल वर्षा: **{rain_info['today_rain']} mm**)।"
        elif rain_info["is_predicted"]:
            rain_hi = f"🌦️ **वर्षा पूर्वानुमान**: वर्तमान में **{rain_info['current_prob']}%** संभावना है, लेकिन **{rain_info['peak_time']}** के आसपास **{rain_info['peak_prob']}% संभावना** के साथ बारिश का अनुमान है (संभावित कुल वर्षा: **{rain_info['today_rain']} mm**)।"
        else:
            rain_hi = f"मौसम मुख्य रूप से साफ / शुष्क रहने का अनुमान (**{rain_info['current_prob']}%** संभावना)।"

        markdown_resp = (
            f"### 🌤️ **{proper_name}, {state_name} का मौसम पूर्वानुमान**\n\n"
            f"वर्तमान में {proper_name} में **{cond_hi}** मौसम है और तापमान **{weather.current_temp}°C** (महसूस: **{weather.feels_like}°C**) दर्ज किया गया है।\n\n"
            f"**प्रमुख मौसम बिंदु:**\n"
            f"- 🌡️ **तापमान सीमा:** न्यूनतम **{min_t}°C** से अधिकतम **{max_t}°C**\n"
            f"- 🌧️ **बारिश व वर्षा पूर्वानुमान:** {rain_hi}\n"
            f"- 💨 **हवा की गति व दिशा:** **{weather.wind_speed} km/h {weather.wind_direction}**, आर्द्रता **{weather.humidity}%**\n"
            f"- 🍃 **वायु गुणवत्ता (AQI):** **{weather.aqi}** ({aqi_hi})\n"
            f"- ☀️ **सूर्य व पराबैंगनी सूचकांक:** UV इंडेक्स **{weather.uv_index}**, सूर्योदय **{weather.sunrise} IST**, सूर्यास्त **{weather.sunset} IST**.\n"
        )
        if agri_adv:
            speech_text += f" किसान भाइयों के लिए सलाह: {agri_adv.irrigation_advice}"
            markdown_resp += (
                f"\n#### 🌾 **मेघदूत कृषि सलाह ({agri_adv.crop})**\n"
                f"- **सिंचाई प्रबंधन:** {agri_adv.irrigation_advice}\n"
                f"- **कीटनाशक छिड़काव:** {agri_adv.pesticide_advice}\n"
                f"- **कटाई व भंडारण:** {agri_adv.harvest_recommendation}\n"
            )
        if av_brief:
            markdown_resp += f"\n#### ✈️ **विमानन मौसम ब्रीफिंग ({av_brief.station_icao})**: {av_brief.flight_category} - {av_brief.metar_raw}\n"
        if marine_adv:
            markdown_resp += f"\n#### ⚓ **समुद्री मौसम चेतावनी (INCOIS)**: लहरें {marine_adv.wave_height_m}m ({marine_adv.sea_condition}). {marine_adv.warning_message}\n"
        if alerts:
            markdown_resp += f"\n#### 🚨 **सक्रिय आपदा अलर्ट (CAP Alerts)**\n"
            for alt in alerts:
                markdown_resp += f"- **[{alt.severity.upper()} अलर्ट] {alt.headline}**\n"

        quick_suggestions = [
            f"कल {proper_name} में बारिश होगी क्या?",
            f"{proper_name} के लिए मेघदूत कृषि सलाह",
            f"{proper_name} 7 दिनों का मौसम पूर्वानुमान",
            f"{state_name} के लिए सक्रिय अलर्ट"
        ]
        suggested_actions = [
            {"label": "डॉपलर रडार मैप देखें", "action": "open_map"},
            {"label": "7-दिवसीय पूर्वानुमान", "action": "open_dashboard"},
            {"label": "मेघदूत किसान सलाह", "action": "open_agri"},
            {"label": "आपदा अलर्ट केंद्र", "action": "open_alerts"}
        ]

    # 3. TAMIL (ta)
    elif lang == "ta":
        cond_ta = translate_weather_condition(weather.condition, "ta")
        aqi_ta = translate_aqi_status(weather.aqi_status, "ta")
        speech_text = f"{proper_name} இல் தற்போதைய வெப்பநிலை {weather.current_temp}°C. வானிலை {cond_ta} ஆக உள்ளது."
        markdown_resp = (
            f"### 🌤️ **{proper_name}, {state_name} வானிலை நிலவரம்**\n\n"
            f"தற்போது {proper_name} இல் வானிலை **{cond_ta}** ஆக உள்ளது. வெப்பநிலை **{weather.current_temp}°C** (உணர்வது: **{weather.feels_like}°C**).\n\n"
            f"**முக்கிய வானிலை விவரங்கள்:**\n"
            f"- 🌡️ **வெப்பநிலை அளவு:** குறைந்தபட்சம் **{min_t}°C** முதல் அதிகபட்சம் **{max_t}°C** வரை\n"
            f"- 🌧️ **மழை வாய்ப்பு:** **{rain_p}%** வாய்ப்பு (மழைப்பொழிவு: {weather.precipitation} mm)\n"
            f"- 💨 **காற்று & ஈரப்பதம்:** காற்று வேகம் **{weather.wind_speed} km/h {weather.wind_direction}**, ஈரப்பதம் **{weather.humidity}%**\n"
            f"- 🍃 **காற்று தரம் (AQI):** **{weather.aqi}** ({aqi_ta})\n"
        )
        if agri_adv:
            markdown_resp += f"\n#### 🌾 **விவசாய ஆலோசனை ({agri_adv.crop})**\n- **பாசனம்:** {agri_adv.irrigation_advice}\n- **பூச்சிக்கொல்லி:** {agri_adv.pesticide_advice}\n"
        if alerts:
            markdown_resp += f"\n#### 🚨 **பேரிடர் எச்சரிக்கைகள்**\n"
            for alt in alerts:
                markdown_resp += f"- **[{alt.severity.upper()}] {alt.headline}**\n"
        quick_suggestions = [f"நாளை {proper_name} மழை பெய்யுமா?", f"{proper_name} விவசாய ஆலோசனை", f"{proper_name} 7 நாள் வானிலை"]
        suggested_actions = [
            {"label": "ரேடார் வரைபடம்", "action": "open_map"},
            {"label": "7-நாள் அறிக்கை", "action": "open_dashboard"},
            {"label": "விவசாய ஆலோசனை", "action": "open_agri"},
            {"label": "பேரிடர் மையம்", "action": "open_alerts"}
        ]

    # 4. TELUGU (te)
    elif lang == "te":
        cond_te = translate_weather_condition(weather.condition, "te")
        aqi_te = translate_aqi_status(weather.aqi_status, "te")
        speech_text = f"{proper_name} లో ప్రస్తుత ఉష్ణోగ్రత {weather.current_temp}°C. వాతావరణం {cond_te} గా ఉంది."
        markdown_resp = (
            f"### 🌤️ **{proper_name}, {state_name} వాతావరణ సమాచారం**\n\n"
            f"ప్రస్తుతం {proper_name} లో వాతావరణం **{cond_te}** గా ఉంది. ఉష్ణోగ్రత **{weather.current_temp}°C** (అనిపించేది: **{weather.feels_like}°C**).\n\n"
            f"**ముఖ్య వాతావరణ వివరాలు:**\n"
            f"- 🌡️ **ఉష్ణోగ్రత శ్రేణి:** కనిష్ట ఉష్ణోగ్రత **{min_t}°C** నుండి గరిష్ట ఉష్ణోగ్రత **{max_t}°C**\n"
            f"- 🌧️ **వర్ష సూచన:** **{rain_p}%** అవకాశం (వర్షపాతం: {weather.precipitation} mm)\n"
            f"- 💨 **గాలి వేగం & తేమ:** గాలి వేగం **{weather.wind_speed} km/h**, గాలిలో తేమ **{weather.humidity}%**\n"
            f"- 🍃 **గాలి నాణ్యత (AQI):** **{weather.aqi}** ({aqi_te})\n"
        )
        if agri_adv:
            markdown_resp += f"\n#### 🌾 **రైతు సలహాలు ({agri_adv.crop})**\n- **నీటి యాజమాన్యం:** {agri_adv.irrigation_advice}\n- **సస్యరక్షణ:** {agri_adv.pesticide_advice}\n"
        if alerts:
            markdown_resp += f"\n#### 🚨 **విపత్తు హెచ్చరికలు**\n"
            for alt in alerts:
                markdown_resp += f"- **[{alt.severity.upper()}] {alt.headline}**\n"
        quick_suggestions = [f"రేపు {proper_name} లో వర్షం పడుతుందా?", f"{proper_name} రైతు సలహాలు", f"{proper_name} 7 రోజుల వాతావరణం"]
        suggested_actions = [
            {"label": "రాడార్ మ్యాప్", "action": "open_map"},
            {"label": "7 రోజుల సూచన", "action": "open_dashboard"},
            {"label": "రైతు సలహాలు", "action": "open_agri"},
            {"label": "హెచ్చరికల కేంద్రం", "action": "open_alerts"}
        ]

    # 5. BENGALI (bn)
    elif lang == "bn":
        speech_text = f"{proper_name} এ বর্তমান তাপমাত্রা {weather.current_temp}°C এবং আবহাওয়া {weather.condition}।"
        markdown_resp = (
            f"### 🌤️ **{proper_name}, {state_name} আবহাওয়ার পূর্বাভাস**\n\n"
            f"বর্তমানে {proper_name} এ আবহাওয়া **{weather.condition}** এবং তাপমাত্রা **{weather.current_temp}°C** (অনুভূত: **{weather.feels_like}°C**)।\n\n"
            f"**প্রধান আবহাওয়া তথ্য:**\n"
            f"- 🌡️ **তাপমাত্রার বিস্তার:** সর্বনিম্ন **{min_t}°C** থেকে সর্বোচ্চ **{max_t}°C**\n"
            f"- 🌧️ **বৃষ্টিপাতের সম্ভাবনা:** **{rain_p}%** সম্ভাবনা (বৃষ্টিপাত: {weather.precipitation} mm)\n"
            f"- 💨 **বাতাসের গতিবেগ ও আর্দ্রতা:** বাতাসের গতি **{weather.wind_speed} km/h**, আর্দ্রতা **{weather.humidity}%**\n"
            f"- 🍃 **বায়ুর গুণমান সূচক (AQI):** **{weather.aqi}** ({weather.aqi_status})\n"
        )
        quick_suggestions = [f"কাল {proper_name} এ বৃষ্টি হবে কি?", f"{proper_name} এর কৃষি পরামর্শ", f"{proper_name} ৭ দিনের পূর্বাভাস"]
        suggested_actions = [
            {"label": "রাডার মানচিত্র", "action": "open_map"},
            {"label": "৭ দিনের পূর্বাভাস", "action": "open_dashboard"},
            {"label": "কৃষি পরামর্শ", "action": "open_agri"},
            {"label": "সতর্কতা কেন্দ্র", "action": "open_alerts"}
        ]

    # 6. GUJARATI (gu)
    elif lang == "gu":
        speech_text = f"{proper_name} માં હાલનું તાપમાન {weather.current_temp}°C છે અને હવામાન {weather.condition} છે."
        markdown_resp = (
            f"### 🌤️ **{proper_name}, {state_name} હવામાન આગાહી**\n\n"
            f"હાલમાં {proper_name} માં **{weather.condition}** વાતાવરણ છે અને તાપમાન **{weather.current_temp}°C** (અનુભવ: **{weather.feels_like}°C**) છે.\n\n"
            f"**મુખ્ય હવામાન મુદ્દા:**\n"
            f"- 🌡️ **તાપમાન શ્રેણી:** લઘુત્તમ **{min_t}°C** થી મહત્તમ **{max_t}°C**\n"
            f"- 🌧️ **વરસાદની શક્યતા:** **{rain_p}%** સંભાવના (વરસાદ: {weather.precipitation} mm)\n"
            f"- 💨 **પવનની ગતિ અને ભેજ:** પવનની ગતિ **{weather.wind_speed} km/h**, ભેજ **{weather.humidity}%**\n"
            f"- 🍃 **હવાની ગુણવત્તા (AQI):** **{weather.aqi}** ({weather.aqi_status})\n"
        )
        quick_suggestions = [f"કાલે {proper_name} માં વરસાદ પડશે?", f"{proper_name} માટે કૃષિ સલાહ", f"{proper_name} 7 દિવસનું હવામાન"]
        suggested_actions = [
            {"label": "રડાર નકશો", "action": "open_map"},
            {"label": "7 દિવસની આગાહી", "action": "open_dashboard"},
            {"label": "કૃષિ સલાહ", "action": "open_agri"},
            {"label": "ચેતવણી કેન્દ્ર", "action": "open_alerts"}
        ]

    # 7. PUNJABI (pa)
    elif lang == "pa":
        speech_text = f"{proper_name} ਵਿੱਚ ਮੌਜੂਦਾ ਤਾਪਮਾਨ {weather.current_temp}°C ਹੈ ਅਤੇ ਮੌਸਮ {weather.condition} ਹੈ।"
        markdown_resp = (
            f"### 🌤️ **{proper_name}, {state_name} ਮੌਸਮ ਦੀ ਜਾਣਕਾਰੀ**\n\n"
            f"ਇਸ ਸਮੇਂ {proper_name} ਵਿੱਚ **{weather.condition}** ਮੌਸਮ ਹੈ ਅਤੇ ਤਾਪਮਾਨ **{weather.current_temp}°C** (ਮਹਿਸੂਸ: **{weather.feels_like}°C**) ਹੈ।\n\n"
            f"**ਮੁੱਖ ਮੌਸਮ ਜਾਣਕਾਰੀ:**\n"
            f"- 🌡️ **ਤਾਪਮਾਨ ਸੀਮਾ:** ਘੱਟੋ-ਘੱਟ **{min_t}°C** ਤੋਂ ਵੱਧ ਤੋਂ ਵੱਧ **{max_t}°C**\n"
            f"- 🌧️ **ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ:** **{rain_p}%** ਸੰਭਾਵਨਾ (ਵਰਖਾ: {weather.precipitation} mm)\n"
            f"- 💨 **ਹਵਾ ਦੀ ਰਫ਼ਤਾਰ:** **{weather.wind_speed} km/h**, ਨਮੀ **{weather.humidity}%**\n"
            f"- 🍃 **ਹਵਾ ਦੀ ਗੁਣਵੱਤਾ (AQI):** **{weather.aqi}** ({weather.aqi_status})\n"
        )
        quick_suggestions = [f"ਕੱਲ੍ਹ {proper_name} ਵਿੱਚ ਮੀਂਹ ਪਵੇਗਾ?", f"{proper_name} ਲਈ ਖੇਤੀ ਸਲਾਹ", f"{proper_name} 7 ਦਿਨਾਂ ਦਾ ਮੌਸਮ"]
        suggested_actions = [
            {"label": "ਰਾਡਾਰ ਨਕਸ਼ਾ", "action": "open_map"},
            {"label": "7 ਦਿਨਾਂ ਦਾ ਪੂਰਵ-ਅਨੁਮਾਨ", "action": "open_dashboard"},
            {"label": "ਖੇਤੀ ਸਲਾਹ", "action": "open_agri"},
            {"label": "ਚੇਤਾਵਨੀ ਕੇਂਦਰ", "action": "open_alerts"}
        ]

    # 8. KANNADA (kn)
    elif lang == "kn":
        speech_text = f"{proper_name} ನಲ್ಲಿ ಪ್ರಸ್ತುತ ತಾಪಮಾನ {weather.current_temp}°C ಮತ್ತು ಹವಾಮಾನ {weather.condition} ಆಗಿದೆ."
        markdown_resp = (
            f"### 🌤️ **{proper_name}, {state_name} ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ**\n\n"
            f"ಪ್ರಸ್ತುತ {proper_name} ನಲ್ಲಿ **{weather.condition}** ವಾತಾವರಣವಿದ್ದು, ತಾಪಮಾನ **{weather.current_temp}°C** (ಅನುಭವ: **{weather.feels_like}°C**) ಆಗಿದೆ.\n\n"
            f"**ಪ್ರಮುಖ ಹವಾಮಾನ ವಿವರಗಳು:**\n"
            f"- 🌡️ **ತಾಪಮಾನ ಶ್ರೇಣಿ:** ಕನಿಷ್ಠ **{min_t}°C** ರಿಂದ ಗರಿಷ್ಠ **{max_t}°C** ವರೆಗೆ\n"
            f"- 🌧️ **ಮಳೆಯ ಸಾಧ್ಯತೆ:** **{rain_p}%** ಸಂಭವನೀಯತೆ (ಮಳೆ: {weather.precipitation} mm)\n"
            f"- 💨 **ಗಾಳಿಯ ವೇಗ ಮತ್ತು ತೇವಾಂಶ:** ಗಾಳಿಯ ವೇಗ **{weather.wind_speed} km/h**, ತೇವಾಂಶ **{weather.humidity}%**\n"
            f"- 🍃 **ವಾಯು ಗುಣಮಟ್ಟ (AQI):** **{weather.aqi}** ({weather.aqi_status})\n"
        )
        quick_suggestions = [f"ನಾಳೆ {proper_name} ನಲ್ಲಿ ಮಳೆ ಬರುತ್ತದೆಯೇ?", f"{proper_name} ಕೃಷಿ ಸಲಹೆ", f"{proper_name} 7 ದಿನಗಳ ಹವಾಮಾನ"]
        suggested_actions = [
            {"label": "ರಾಡಾರ್ ನಕ್ಷೆ", "action": "open_map"},
            {"label": "7 ದಿನಗಳ ಮುನ್ಸೂಚನೆ", "action": "open_dashboard"},
            {"label": "ಕೃಷಿ ಸಲಹೆ", "action": "open_agri"},
            {"label": "ಎಚ್ಚರಿಕೆ ಕೇಂದ್ರ", "action": "open_alerts"}
        ]

    # 9. MALAYALAM (ml)
    elif lang == "ml":
        cond_ml = translate_weather_condition(weather.condition, "ml")
        aqi_ml = translate_aqi_status(weather.aqi_status, "ml")
        speech_text = f"{proper_name} ൽ നിലവിലെ താപനില {weather.current_temp}°C ആണ്. കാലാവസ്ഥ {cond_ml} ആണ്."
        markdown_resp = (
            f"### 🌤️ **{proper_name}, {state_name} കാലാവസ്ഥ വിവരങ്ങൾ**\n\n"
            f"നിലവിൽ {proper_name} ൽ കാലാവസ്ഥ **{cond_ml}** ആണ്. താപനില **{weather.current_temp}°C** (അനുഭവപ്പെടുന്നത്: **{weather.feels_like}°C**).\n\n"
            f"**പ്രധാന കാലാവസ്ഥ വിവരങ്ങൾ:**\n"
            f"- 🌡️ **താപനില പരിധി:** കുറഞ്ഞത് **{min_t}°C** മുതൽ കൂടിയത് **{max_t}°C** വരെ\n"
            f"- 🌧️ **മഴ സാധ്യത:** **{rain_p}%** സാധ്യത (മഴയുടെ അളവ്: {weather.precipitation} mm)\n"
            f"- 💨 **കാറ്റിന്റെ വേഗതയും ഈർപ്പവും:** കാറ്റ് **{weather.wind_speed} km/h**, ഈർപ്പം **{weather.humidity}%**\n"
            f"- 🍃 **വായു ഗുണനിലവാരം (AQI):** **{weather.aqi}** ({aqi_ml})\n"
        )
        if agri_adv:
            markdown_resp += f"\n#### 🌾 **കർഷക ഉപദേശം ({agri_adv.crop})**\n- **ജലസേചനം:** {agri_adv.irrigation_advice}\n- **കീടനാശിനി പ്രയോഗം:** {agri_adv.pesticide_advice}\n"
        if alerts:
            markdown_resp += f"\n#### 🚨 **ദുരന്ത നിവാരണ മുന്നറിയിപ്പുകൾ**\n"
            for alt in alerts:
                markdown_resp += f"- **[{alt.severity.upper()}] {alt.headline}**\n"
        quick_suggestions = [f"നാളെ {proper_name} ൽ മഴ പെയ്യുമോ?", f"{proper_name} കർഷക ഉപദേശം", f"{proper_name} 7 ദിവസത്തെ കാലാവസ്ഥ"]
        suggested_actions = [
            {"label": "റഡാർ മാപ്പ്", "action": "open_map"},
            {"label": "7 ദിവസത്തെ പ്രവചനം", "action": "open_dashboard"},
            {"label": "കർഷക ഉപദേശം", "action": "open_agri"},
            {"label": "മുന്നറിയിപ്പ് കേന്ദ്രം", "action": "open_alerts"}
        ]

    # 10. ODIA (or)
    elif lang == "or":
        cond_or = translate_weather_condition(weather.condition, "or")
        aqi_or = translate_aqi_status(weather.aqi_status, "or")
        speech_text = f"{proper_name} ରେ ବର୍ତ୍ତମାନର ତାପମାତ୍ରା {weather.current_temp}°C ଏବଂ ପାଣିପାଗ {cond_or} ଅଟେ।"
        markdown_resp = (
            f"### 🌤️ **{proper_name}, {state_name} ପାଣିପାଗ ପୂର୍ବାନୁମାନ**\n\n"
            f"ବର୍ତ୍ତମାନ {proper_name} ରେ ପାଣିପାଗ **{cond_or}** ରହିଛି ଏବଂ ତାପମାତ୍ରା **{weather.current_temp}°C** (ଅନୁଭୂତ: **{weather.feels_like}°C**) ଅଟେ।\n\n"
            f"**ମୁଖ୍ୟ ପାଣିପାଗ ବିବରଣୀ:**\n"
            f"- 🌡️ **ତାପମାତ୍ରା ସୀମା:** ସର୍ବନିମ୍ନ **{min_t}°C** ରୁ ସର୍ବାଧିକ **{max_t}°C**\n"
            f"- 🌧️ **ବର୍ଷା ସମ୍ଭାବନା:** **{rain_p}%** ସମ୍ଭାବନା (ବର୍ଷା ପରିମାଣ: {weather.precipitation} mm)\n"
            f"- 💨 **ପବନର ଗତି ଓ ଆର୍ଦ୍ରତା:** ପବନର ବେଗ **{weather.wind_speed} km/h**, ବାୟୁମଣ୍ଡଳୀୟ ଆର୍ଦ୍ରତା **{weather.humidity}%**\n"
            f"- 🍃 **ବାୟୁ ଗୁଣବତ୍ତା (AQI):** **{weather.aqi}** ({aqi_or})\n"
        )
        if agri_adv:
            markdown_resp += f"\n#### 🌾 **କୃଷକ ପରାମର୍ଶ ({agri_adv.crop})**\n- **ଜଳସେଚନ:** {agri_adv.irrigation_advice}\n- **କୀଟନାଶକ ପ୍ରୟୋଗ:** {agri_adv.pesticide_advice}\n"
        if alerts:
            markdown_resp += f"\n#### 🚨 **ସକ୍ରିୟ ବିପର୍ଯ୍ୟୟ ଚେତାବନୀ (CAP Alerts)**\n"
            for alt in alerts:
                markdown_resp += f"- **[{alt.severity.upper()}] {alt.headline}**\n"
        quick_suggestions = [f"କାଲି {proper_name} ରେ ବର୍ଷା ହେବ କି?", f"{proper_name} ପାଇଁ କୃଷି ପରାମର୍ଶ", f"{proper_name} ୭ ଦିନର ପାଣିପାଗ"]
        suggested_actions = [
            {"label": "ରାଡାର ମାନଚିତ୍ର", "action": "open_map"},
            {"label": "୭ ଦିନର ପୂର୍ବାନୁମାନ", "action": "open_dashboard"},
            {"label": "କୃଷି ପରାମର୍ଶ", "action": "open_agri"},
            {"label": "ଚେତାବନୀ କେନ୍ଦ୍ର", "action": "open_alerts"}
        ]

    # 11. ENGLISH (en - Default)
    else:
        speech_text = f"In {proper_name}, it is currently {weather.current_temp} degrees Celsius with {weather.condition}. Wind speed is {weather.wind_speed} kilometers per hour."
        markdown_resp = format_human_weather_story(weather, proper_name, state_name)

        if agri_adv:
            speech_text += f" Agromet Advisory: {agri_adv.irrigation_advice}"
            markdown_resp += (
                f"\n#### 🌾 **Agromet Advisory ({agri_adv.crop})**\n"
                f"- **Irrigation Recommendation:** {agri_adv.irrigation_advice}\n"
                f"- **Pesticide & Spraying:** {agri_adv.pesticide_advice}\n"
                f"- **Harvesting Guidance:** {agri_adv.harvest_recommendation}\n"
            )

        if av_brief:
            markdown_resp += f"\n#### ✈️ **Aviation Briefing ({av_brief.station_icao})**: {av_brief.flight_category} - {av_brief.metar_raw}\n"

        if marine_adv:
            markdown_resp += f"\n#### ⚓ **INCOIS Marine Advisory**: Waves {marine_adv.wave_height_m}m ({marine_adv.sea_condition}). {marine_adv.warning_message}\n"

        if alerts:
            markdown_resp += f"\n#### 🚨 **Active CAP Warnings**\n"
            for alt in alerts:
                markdown_resp += f"- **[{alt.severity.upper()} ALERT] {alt.headline}**\n"

        quick_suggestions = [
            f"Will it rain heavily in {proper_name} tomorrow?",
            f"Agromet crop advisory for {proper_name}",
            f"Show active alerts for {state_name}",
            f"7-day hourly NWP forecast for {proper_name}"
        ]

        suggested_actions = [
            {"label": "View GIS Radar Map", "action": "open_map"},
            {"label": "Detailed 7-Day Forecast", "action": "open_dashboard"},
            {"label": "Farmer Agromet Advisories", "action": "open_agri"},
            {"label": "Disaster Alerts Feed", "action": "open_alerts"}
        ]

    return ChatResponse(
        query=query,
        detected_language=lang,
        persona=persona,
        speech_text=speech_text,
        markdown_response=markdown_resp,
        structured_weather=weather,
        alerts=alerts,
        agri_advisory=agri_adv,
        aviation_briefing=av_brief,
        marine_advisory=marine_adv,
        quick_suggestions=quick_suggestions,
        suggested_actions=suggested_actions
    )
