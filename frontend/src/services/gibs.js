/* NASA GIBS helpers. Imagery is U.S. public domain; attribution retained in
   every view ("NASA GIBS", link to Worldview). True-color layers are DAILY
   products, so the latest safe date is yesterday (UTC) — never label them
   as same-day LIVE observations. Verified 2026-10-15: WMTS + WMS return
   image/jpeg for the previous day. */

export const GIBS_ATTRIBUTION = "NASA GIBS";
export const GIBS_VIEWER = "https://worldview.earthdata.nasa.gov/";
export const GIBS_LICENSE_NOTE = "U.S. public domain imagery via NASA GIBS";

/** YYYY-MM-DD for `daysAgo` days before today (UTC). Default 1 = yesterday. */
export function gibsDate(daysAgo = 1) {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toISOString().slice(0, 10);
}

export const GIBS_LAYERS = {
  viirs: {
    id: "viirs",
    label: "VIIRS SNPP true-color",
    layer: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    resolution: "375 m",
  },
  modis: {
    id: "modis",
    label: "MODIS Terra true-color",
    layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
    resolution: "250 m",
  },
};

export function gibsWmtsTile(layer, date, zxy = "{z}/{y}/{x}") {
  return (
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}` +
    `/default/${date}/GoogleMapsCompatible_Level9/${zxy}.jpg`
  );
}

/** India-region WMS GetMap (EPSG:4326 bbox 68,6 → 98,37). */
export function gibsIndiaWms(layer, date, width = 900, height = 520) {
  return (
    "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi" +
    "?service=WMS&request=GetMap" +
    `&layers=${encodeURIComponent(layer)}` +
    "&styles=&format=image/jpeg&transparent=false&version=1.1.1" +
    `&width=${width}&height=${height}&srs=EPSG:4326&bbox=68,6,98,37` +
    `&time=${date}`
  );
}
