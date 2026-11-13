import React from "react";

/**
 * Route-level loading placeholder. It mirrors the rhythm of a module instead
 * of showing a lone spinner, so the page does not jump when the chunk lands.
 */
export default function ModuleSkeleton({ label = "Loading module" }) {
  return (
    <div className="wg-module-skeleton" role="status" aria-live="polite">
      <span className="wg-sr-only">{label}</span>
      <div className="wg-skel-line wg-skel-kicker" />
      <div className="wg-skel-line wg-skel-title" />
      <div className="wg-skel-line wg-skel-copy" />
      <div className="wg-skel-grid" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="wg-skel-card" key={index}>
            <div className="wg-skel-line wg-skel-card-label" />
            <div className="wg-skel-line wg-skel-card-value" />
            <div className="wg-skel-line wg-skel-card-copy" />
          </div>
        ))}
      </div>
      <div className="wg-skel-line wg-skel-block" aria-hidden="true" />
    </div>
  );
}
