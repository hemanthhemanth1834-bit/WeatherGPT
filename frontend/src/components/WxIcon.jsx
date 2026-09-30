import React from "react";
import {
  Cloud, CloudDrizzle, CloudFog, CloudHail, CloudLightning, CloudRain,
  CloudSun, Snowflake, Sun,
} from "lucide-react";

/* Topic-specific condition icons (Lucide, ISC-licensed).
   Used for hero and card artwork; tiny timeline rows keep text glyphs
   to protect the entry bundle. */
const MAP = {
  Sun, SunMedium: CloudSun, CloudSun, Cloud, CloudFog,
  CloudDrizzle, CloudRain, CloudRainWind: CloudLightning,
  CloudLightning, CloudHail, Snowflake,
};

const TINT = {
  Sun: "#fbbf24", SunMedium: "#fbbf24", CloudSun: "#fbbf24", Cloud: "#94a3b8",
  CloudFog: "#94a3b8", CloudDrizzle: "#38bdf8", CloudRain: "#38bdf8",
  CloudRainWind: "#38bdf8", CloudLightning: "#fbbf24", CloudHail: "#38bdf8",
  Snowflake: "#bae6fd",
};

export default function WxIcon({ icon, size = 40 }) {
  const Cmp = MAP[icon] || CloudSun;
  return <Cmp size={size} color={TINT[icon] || "#38bdf8"} aria-hidden="true" />;
}
