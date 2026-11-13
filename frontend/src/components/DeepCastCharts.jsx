import React from "react";

function finite(values) {
  return (values || []).filter((value) => Number.isFinite(value));
}

function linePath(values, width, height, min, max) {
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  let started = false;
  return values.map((value, index) => {
    if (!Number.isFinite(value)) { started = false; return ""; }
    const x = index * step;
    const y = height - ((value - min) / span) * height;
    const command = started ? "L" : "M";
    started = true;
    return `${command}${x.toFixed(1)},${y.toFixed(1)}`;
  }).filter(Boolean).join(" ");
}

export function TrendChart({ title, labels = [], series = [], height = 132, yUnit = "", digits = 0 }) {
  const all = finite(series.flatMap((item) => item.values || []));
  if (!all.length) return <div className="wg-dc-empty-chart">No values returned for this chart.</div>;
  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const pad = (rawMax - rawMin || 1) * 0.12;
  const min = rawMin - pad;
  const max = rawMax + pad;
  const width = 640;
  const labelAt = (index) => labels[index] || "";
  const summary = series.map((item) => {
    const values = finite(item.values);
    return values.length ? `${item.label}: ${values[0]?.toFixed(digits)} to ${values[values.length - 1]?.toFixed(digits)} ${item.unit || yUnit}` : "";
  }).filter(Boolean).join("; ");
  return (
    <figure className="wg-dc-chart">
      <figcaption>
        <span>{title}</span>
        <span>{yUnit}</span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height + 18}`} role="img" aria-label={`${title}. ${summary}`} preserveAspectRatio="none">
        <title>{title}</title>
        {[0.25, 0.5, 0.75].map((part) => <line key={part} x1="0" x2={width} y1={height * part} y2={height * part} className="wg-dc-grid" />)}
        {series.map((item) => {
          const values = item.values || [];
          return (
            <path
              key={item.label}
              d={linePath(values, width, height, min, max)}
              fill="none"
              stroke={item.color || "var(--wg-accent)"}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <text x="2" y={height + 14} className="wg-dc-axis">{labelAt(0)}</text>
        <text x={width / 2} y={height + 14} textAnchor="middle" className="wg-dc-axis">{labelAt(Math.floor(labels.length / 2))}</text>
        <text x={width - 2} y={height + 14} textAnchor="end" className="wg-dc-axis">{labelAt(labels.length - 1)}</text>
      </svg>
      <div className="wg-dc-legend">
        {series.map((item) => <span key={item.label}><i style={{ background: item.color || "var(--wg-accent)" }} />{item.label}</span>)}
        <span className="wg-dc-range">{rawMin.toFixed(digits)}–{rawMax.toFixed(digits)} {yUnit}</span>
      </div>
    </figure>
  );
}

export function BarChart({ title, labels = [], values = [], unit = "mm", color = "var(--wg-accent)" }) {
  const valid = finite(values);
  if (!valid.length) return <div className="wg-dc-empty-chart">No values returned for this chart.</div>;
  const width = 640;
  const height = 96;
  const max = Math.max(...valid, 0.1);
  const step = width / values.length;
  return (
    <figure className="wg-dc-chart">
      <figcaption><span>{title}</span><span>{unit}</span></figcaption>
      <svg viewBox={`0 0 ${width} ${height + 18}`} role="img" aria-label={`${title}: ${valid.map((value) => value.toFixed(1)).join(", ")} ${unit}`} preserveAspectRatio="none">
        <title>{title}</title>
        {values.map((value, index) => {
          const bar = Number.isFinite(value) ? Math.max(2, (value / max) * height) : 0;
          return <rect key={index} x={index * step + step * 0.18} y={height - bar} width={Math.max(1, step * 0.64)} height={bar} rx="1.5" fill={color} opacity="0.88" />;
        })}
        <line x1="0" x2={width} y1={height} y2={height} className="wg-dc-grid" />
        <text x="2" y={height + 14} className="wg-dc-axis">{labels[0]}</text>
        <text x={width - 2} y={height + 14} textAnchor="end" className="wg-dc-axis">{labels[labels.length - 1]}</text>
      </svg>
    </figure>
  );
}

export function VerticalProfile({ levels = [], title = "Forecast vertical profile" }) {
  const valid = levels.filter((level) => Number.isFinite(level.temperature));
  if (!valid.length) return <div className="wg-dc-empty-chart">No upper-air values returned.</div>;
  const width = 300;
  const height = 220;
  const temps = valid.map((level) => level.temperature);
  const min = Math.min(...temps) - 2;
  const max = Math.max(...temps) + 2;
  const span = max - min || 1;
  return (
    <figure className="wg-dc-profile">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: ${valid.map((level) => `${level.label} ${level.temperature.toFixed(0)} C`).join(", ")}`}>
        <title>{title}</title>
        {[0, 1, 2, 3].map((part) => <line key={part} x1="0" x2={width} y1={part * height / 3} y2={part * height / 3} className="wg-dc-grid" />)}
        <polyline
          points={valid.map((level, index) => {
            const x = 24 + ((level.temperature - min) / span) * (width - 48);
            const y = 16 + index * ((height - 32) / Math.max(1, valid.length - 1));
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(" ")}
          fill="none"
          stroke="var(--wg-warning)"
          strokeWidth="3"
        />
        {valid.map((level, index) => {
          const x = 24 + ((level.temperature - min) / span) * (width - 48);
          const y = 16 + index * ((height - 32) / Math.max(1, valid.length - 1));
          return <g key={level.label}><circle cx={x} cy={y} r="4" fill="var(--wg-warning)" /><text x={width - 4} y={y + 3} textAnchor="end" className="wg-dc-axis">{level.label}</text></g>;
        })}
      </svg>
      <div className="wg-dc-profile-list">
        {valid.map((level) => <span key={level.label}><b>{level.label}</b> {level.temperature.toFixed(1)}°C{Number.isFinite(level.humidity) ? ` · RH ${level.humidity.toFixed(0)}%` : ""}</span>)}
      </div>
    </figure>
  );
}

export function Metric({ label, value, unit, sub, tone = "" }) {
  return (
    <div className={`wg-dc-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}{unit ? <small>{unit}</small> : null}</strong>
      {sub ? <em>{sub}</em> : null}
    </div>
  );
}

export function TopicSection({ number, title, status, source, sourceUrl, timestamp, note, children, className = "" }) {
  return (
    <section className={`wg-dc-topic ${className}`} id={`deepcast-topic-${number}`} aria-labelledby={`deepcast-title-${number}`}>
      <header className="wg-dc-topic-head">
        <span className="wg-dc-topic-number">{number}</span>
        <div>
          <h2 id={`deepcast-title-${number}`}>{title}</h2>
          {(source || timestamp) && <p>{source}{timestamp ? ` · ${timestamp}` : ""}{sourceUrl ? <> · <a href={sourceUrl} target="_blank" rel="noreferrer">source</a></> : null}</p>}
        </div>
        {status ? <span className={`wg-dc-status ${String(status).toLowerCase().replace(/[^a-z]+/g, "-")}`}>{status}</span> : null}
      </header>
      {note ? <p className="wg-dc-note">{note}</p> : null}
      {children}
    </section>
  );
}

export function Unavailable({ title, children }) {
  return <div className="wg-dc-unavailable"><b>{title}</b><p>{children}</p></div>;
}
