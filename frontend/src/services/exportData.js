/* Client-side download helpers for honest data export. Original module.
   Exports contain only values already shown on screen, plus provenance. */
export function download(filename, text, mime = "application/json") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function toCSV(rows) {
  const cell = (value) => {
    const text = value == null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return rows.map((row) => row.map(cell).join(",")).join("\n");
}

export function provenanceFooter(obj) {
  return {
    exported_at_ist: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    source: obj?.data_source || obj?.source || "WeatherGPT",
    status: obj?.status || obj?.data_type || "",
  };
}
