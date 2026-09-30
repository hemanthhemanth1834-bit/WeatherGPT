from typing import Dict, Any, Optional
from ..schemas.models import AgriCropAdvisory

CROP_DATABASE: Dict[str, Dict[str, Any]] = {
    "paddy": {
        "name": "Paddy / Rice (धान / भात)",
        "ideal_temp": (22, 35),
        "water_req": "High",
        "stages": ["Transplanting", "Tillering", "Panicle Initiation", "Grain Filling", "Maturity"],
        "advisory": {
            "rain_forecast": "Maintain 3-5 cm stagnant water layer in fields. Ensure drainage outlets are clear if rainfall exceeds 50mm.",
            "dry_forecast": "Provide light irrigation at tillering stage. Check for leaf folder and blast infestation.",
            "pesticide": "Postpone foliar spray of Tricyclazole if rain probability exceeds 60%. Spray during clear morning hours."
        }
    },
    "cotton": {
        "name": "Cotton (कपास / कापूस)",
        "ideal_temp": (21, 32),
        "water_req": "Medium",
        "stages": ["Square Formation", "Flowering", "Boll Development", "Boll Bursting"],
        "advisory": {
            "rain_forecast": "Crucial: Drain out excess standing water within 24 hours to prevent root rot (wilt).",
            "dry_forecast": "Apply alternate furrow irrigation. Inspect under-surface of leaves for whitefly and pink bollworm.",
            "pesticide": "Install pheromone traps @ 5/acre for monitoring pink bollworm moths. Avoid insecticide spray during windy hours."
        }
    },
    "wheat": {
        "name": "Wheat (गेहूं / गहू)",
        "ideal_temp": (15, 25),
        "water_req": "Medium",
        "stages": ["Crown Root Initiation (CRI)", "Tillering", "Jointing", "Heading", "Milking"],
        "advisory": {
            "rain_forecast": "Hold off on scheduled CRI stage irrigation as incoming showers will meet soil moisture requirements.",
            "dry_forecast": "Ensure first irrigation at 21 days after sowing (CRI stage) for strong root network development.",
            "pesticide": "Inspect crop for yellow rust symptoms under foggy, humid conditions. Spray Propiconazole 25 EC if lesions appear."
        }
    },
    "sugarcane": {
        "name": "Sugarcane (गन्ना / ऊस)",
        "ideal_temp": (20, 38),
        "water_req": "High",
        "stages": ["Germination", "Formative", "Grand Growth", "Ripening"],
        "advisory": {
            "rain_forecast": "Tie canes in groups of 4-5 to prevent lodging under forecasted high convective wind gusts.",
            "dry_forecast": "Apply trash mulching to conserve root zone moisture during heatwave spikes.",
            "pesticide": "Watch for early shoot borer in young shoots. Apply Carbofuran 3G granules around root base with light irrigation."
        }
    },
    "soybean": {
        "name": "Soybean (सोयाबीन)",
        "ideal_temp": (20, 30),
        "water_req": "Medium",
        "stages": ["Vegetative", "Flowering", "Pod Formation", "Seed Development"],
        "advisory": {
            "rain_forecast": "Avoid waterlogging near pod development. Create broad-bed furrows (BBF) to shed excess runoff.",
            "dry_forecast": "Apply protective irrigation during pod filling to prevent seed shriveling.",
            "pesticide": "Monitor for Spodoptera litura (tobacco caterpillar). Use NPV bio-pesticide during early evening hours."
        }
    },
    "mustard": {
        "name": "Mustard (सरसों / मोहरी)",
        "ideal_temp": (15, 25),
        "water_req": "Low-Medium",
        "stages": ["Vegetative", "Flowering", "Siliquae Formation", "Maturity"],
        "advisory": {
            "rain_forecast": "Postpone harvesting if rain is anticipated in next 48 hours. Keep harvested bundles under tarpaulin.",
            "dry_forecast": "Provide second irrigation at 50-55 days after sowing at flowering stage.",
            "pesticide": "Cloudy and humid weather invites Aphids (चेपा). Spray Dimethoate 30 EC @ 1 ml/litre during clear daylight."
        }
    }
}

def generate_crop_advisory(crop_name: str, district: str, state: str, temp: float, rain_prob: int, humidity: int) -> AgriCropAdvisory:
    """Generates localized Agromet advisory for selected crop and weather conditions."""
    clean_crop = crop_name.lower().strip()
    crop_info = CROP_DATABASE.get("paddy")
    
    for key, val in CROP_DATABASE.items():
        if key in clean_crop or clean_crop in key:
            crop_info = val
            break

    is_rainy = rain_prob > 40
    adv = crop_info["advisory"]
    
    weather_sum = f"Current Temp: {temp}°C, Humidity: {humidity}%, Rain Probability: {rain_prob}%"
    irrigation = adv["rain_forecast"] if is_rainy else adv["dry_forecast"]
    pesticide = adv["pesticide"]
    harvest = "Do not harvest during wet spell; wait for 2 consecutive dry days." if is_rainy else "Optimal dry weather for harvesting and thrashing operations."
    
    lightning = rain_prob > 60 and humidity > 75
    suitability = 85 if not is_rainy else 60

    return AgriCropAdvisory(
        crop=crop_info["name"],
        district=district,
        state=state,
        growth_stage=crop_info["stages"][1],
        weather_summary=weather_sum,
        rainfall_risk="Elevated (Hold sprays & ensure field drainage)" if is_rainy else "Low Risk (Favorable for field operations)",
        irrigation_advice=irrigation,
        pesticide_advice=pesticide,
        harvest_recommendation=harvest,
        damini_lightning_alert=lightning,
        suitability_score=suitability
    )
