import React from "react";

const GLYPHS = {
  weather: "☁", rain: "≋", storm: "ϟ", flood: "≈", climate: "◉",
  life: "✦", farm: "✿", road: "⌁", tree: "♣", trip: "⌖", solar: "☼",
  alert: "!", map: "⌖", satellite: "◌", ai: "✦", settings: "⚙", live: "●"
};

export default function Live3DIcon({ kind = "weather", size = "sm", label }) {
  const glyph = GLYPHS[kind] || GLYPHS.weather;
  return (
    <span className={`wg-live3d wg-live3d-${size} wg-live3d-${kind}`} aria-label={label} title={label}>
      <span className="wg-live3d-orbit" />
      <span className="wg-live3d-core">{glyph}</span>
      <span className="wg-live3d-glow" />
      <span className="wg-live3d-live-dot" />
    </span>
  );
}
