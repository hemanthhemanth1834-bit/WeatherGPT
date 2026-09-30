from typing import Dict, Any, List

def get_climate_trend_data(region: str = "All India") -> Dict[str, Any]:
    """Provides historical climate analysis, decadal temperature anomalies, and monsoon rainfall departures."""
    years = [1970, 1980, 1990, 2000, 2010, 2020, 2024, 2025, 2026]
    
    # 50-year temperature anomalies (°C above 1961-1990 IMD baseline)
    temp_anomalies = [-0.15, -0.05, 0.12, 0.35, 0.62, 0.88, 1.12, 1.25, 1.34]
    
    # Southwest Monsoon Rainfall (mm vs 880mm LPA Long Period Average)
    monsoon_departures = [4.2, -8.1, 5.8, -7.5, 2.1, 9.4, 7.6, 2.5, 6.2]
    
    # Extreme Weather Events (Heatwaves + Extreme Heavy Rain days per decade)
    extreme_events = [32, 45, 62, 89, 134, 185, 210, 228, 240]

    return {
        "region": region,
        "baseline_period": "1961 - 1990 (IMD Normals)",
        "lpa_monsoon_rainfall_mm": 880.6,
        "summary": "India's mean surface temperature has increased by approx +0.7°C over the past century, with accelerated warming since 2000. Frequency of localized extreme heavy rainfall events (>150mm/day) has risen by 75%, while total seasonal monsoon quantity shows spatial shifts.",
        "decadal_years": years,
        "temperature_anomaly_celsius": temp_anomalies,
        "monsoon_departure_pct": monsoon_departures,
        "extreme_weather_event_count": extreme_events,
        "key_insights": [
            "Vidarbha & Marathwada show +1.8°C spike in consecutive May heatwave days.",
            "Konkan and Western Ghats exhibit higher intensity short-duration convective bursts.",
            "Northeast India shows a gradual -12% downward trend in seasonal monsoon totals over 30 years."
        ]
    }
