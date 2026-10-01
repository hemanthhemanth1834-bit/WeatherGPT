/* Text glyphs for compact timeline rows (hourly/daily strips).
   Hero and card artwork uses the Lucide WxIcon component instead, keeping
   the entry bundle lean. Original helper module. */
const GLYPH = {
  Sun: "☀️",
  SunMedium: "🌤️",
  CloudSun: "⛅",
  Cloud: "☁️",
  CloudFog: "🌫️",
  CloudDrizzle: "🌦️",
  CloudRain: "🌧️",
  CloudRainWind: "⛈️",
  CloudLightning: "🌩️",
  CloudHail: "🌨️",
  Snowflake: "❄️",
};

export function glyphFor(icon) {
  return GLYPH[icon] || "🌤️";
}
