import React from "react";

/* Real, public-domain USDA photograph used as a visual context panel.
   It is not a photo of the selected user's roof or a live measurement. */
const SOLAR_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Photovoltaic_Panels_Reap_Solar_Energy_on_Farms_%2820240809-USDA-RD-DCK-0327%29.jpg/960px-Photovoltaic_Panels_Reap_Solar_Energy_on_Farms_%2820240809-USDA-RD-DCK-0327%29.jpg";

export default function SolarPhotoPanel({ cloud = 40, uv = 5, ratedKw = 5, altitude = 45 }) {
  return (
    <div
      className="wg-solar-photo-panel"
      role="img"
      aria-label={`Archival aerial photograph of a photovoltaic solar farm. This is visual context only, not a photograph of the selected roof or a measured system. Current estimate inputs: ${cloud}% cloud cover, UV index ${uv}, ${ratedKw} kilowatts peak, solar altitude ${altitude} degrees.`}
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(5,12,26,.03) 0%, rgba(5,12,26,.08) 55%, rgba(5,12,26,.28) 100%), url("${SOLAR_IMAGE}")`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      <span className="wg-solar-photo-credit">USDA photo · public domain</span>
    </div>
  );
}
