import React, { useState } from "react";

/* Shared live-imagery figure. Every instance carries an honest status:
   LIVE (streaming now), DELAYED (recent-past/daily products with their
   observation time), HISTORICAL / STATIC (reference), or UNAVAILABLE
   (provider unreachable — retryable fallback, never a fabricated image). */

const TONE = {
  LIVE: "live",
  DELAYED: "estimated",
  HISTORICAL: "static",
  STATIC: "static",
  UNAVAILABLE: "off",
};

export default function LiveImagery({
  title,
  description,
  src,
  alt,
  sourceName,
  sourceUrl,
  observedAt,
  status = "STATIC",
  layers,
  activeLayer,
  onLayer,
  legend,
  aspectRatio = "16 / 9",
  eager = false,
  linkHref,
  minHeight = "12rem",
  loading = false,
  error = false,
  onRetry,
}) {
  const [attempt, setAttempt] = useState(0);
  // img outcome, set only from load/error events and the retry click —
  // the visible phase is derived during render so no effect is needed.
  const [done, setDone] = useState({ ok: null, src: null });
  const phase = error
    ? "error"
    : loading
      ? "loading"
      : !src
        ? "empty"
        : done.src === src && done.ok !== null
          ? (done.ok ? "ready" : "error")
          : "loading";
  const retry = () => {
    setDone({ ok: null, src: null });
    setAttempt((a) => a + 1);
    onRetry?.();
  };

  const statusLabel = TONE[status] ? status : "STATIC";
  // A failed tile downgrades any optimistic status: the figure visibly
  // reports UNAVAILABLE instead of keeping a stale DELAYED/LIVE chip.
  const shown = phase === "error" ? "UNAVAILABLE" : statusLabel;
  const body = (
    <div style={{ position: "relative", aspectRatio, minHeight, background: "rgba(2,6,23,.55)", overflow: "hidden" }}>
      {phase === "loading" && (
        <div
          className="wg-skel"
          role="status"
          aria-label={`Loading ${title}`}
          style={{ position: "absolute", inset: 0, minHeight: "100%" }}
        />
      )}
      {phase === "empty" && (
        <div className="wg-empty" role="status" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", margin: 0, border: "none" }}>
          No imagery available for this layer.
        </div>
      )}
      {phase === "empty" && (
        <div className="wg-empty" role="status" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", margin: 0, border: "none" }}>
          No imagery available for this layer.
        </div>
      )}
      {phase === "error" && (
        <div className="wg-empty" role="alert" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center", justifyContent: "center", margin: 0, border: "none" }}>
          <span>Imagery unavailable — the provider did not respond. The rest of the page still works.</span>
          <button className="wg-btn-ghost" style={{ fontSize: "0.72rem" }} onClick={retry}>
            ↻ Retry imagery
          </button>
        </div>
      )}
      {phase !== "empty" && phase !== "error" && (
        <img
          key={`${src}-${attempt}`}
          src={src}
          alt={alt}
          data-testid="live-imagery-img"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setDone({ ok: true, src })}
          onError={() => setDone({ ok: false, src })}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            // Hide the broken-image glyph while loading/error text shows.
            visibility: phase === "ready" ? "visible" : "hidden",
          }}
        />
      )}
    </div>
  );

  return (
    <figure data-testid="live-imagery" className="wg-card" style={{ margin: 0, overflow: "hidden" }} aria-label={title}>
      <figcaption style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", justifyContent: "space-between", padding: "0.7rem 0.9rem 0.2rem" }}>
        <strong style={{ fontSize: "0.82rem" }}>{title}</strong>
        <span data-testid="live-imagery-status" className={`wg-chip ${TONE[shown]}`}>
          {shown}
        </span>
      </figcaption>
      {description && (
        <p style={{ margin: 0, padding: "0.15rem 0.9rem 0", fontSize: "0.74rem", color: "var(--wg-muted)", lineHeight: 1.55 }}>
          {description}
        </p>
      )}
      {layers?.length > 1 && (
        <div role="group" aria-label={`${title} layers`} style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", padding: "0.45rem 0.9rem 0" }}>
          {layers.map((l) => (
            <button
              key={l.id}
              className="wg-tab"
              aria-pressed={l.id === activeLayer}
              onClick={() => onLayer?.(l.id)}
              style={{ fontSize: "0.68rem", padding: "0.3rem 0.6rem" }}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
      <div style={{ padding: "0.55rem 0.9rem 0" }}>
        {linkHref ? (
          <a href={linkHref} target="_blank" rel="noreferrer" aria-label={`Open larger ${title} view`} style={{ display: "block", borderRadius: "0.6rem", overflow: "hidden" }}>
            {body}
          </a>
        ) : (
          body
        )}
      </div>
      {legend && (
        <div style={{ padding: "0.4rem 0.9rem 0", fontSize: "0.68rem", color: "var(--wg-muted)" }}>{legend}</div>
      )}
      <figcaption
        className="wg-mono"
        style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem 0.8rem", padding: "0.5rem 0.9rem 0.75rem", fontSize: "0.64rem", color: "var(--wg-muted)" }}
      >
        <span>
          Source:{" "}
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noreferrer" data-testid="live-imagery-source">
              {sourceName}
            </a>
          ) : (
            sourceName
          )}
        </span>
        {observedAt && <span>Observed: {observedAt}</span>}
      </figcaption>
    </figure>
  );
}
