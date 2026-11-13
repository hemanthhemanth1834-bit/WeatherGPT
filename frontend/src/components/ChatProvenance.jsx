import React from "react";

/*
 * Compact, truthful evidence block for one assistant reply. It only shows
 * fields the backend actually returned: source, data type, freshness,
 * limitations, tool trace, official warnings and computed risk factors.
 */
function SourceList({ sources }) {
  if (!sources.length) return null;
  return (
    <ul className="wg-chat-source-list">
      {sources.map((source, index) => {
        const name = typeof source === "string" ? source : source?.name;
        const url = typeof source === "object" ? source?.url : "";
        const type = typeof source === "object" ? source?.type : "";
        if (!name) return null;
        return (
          <li key={`${name}-${index}`}>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                {name}
              </a>
            ) : (
              <span>{name}</span>
            )}
            {type ? <span className="wg-chat-source-type"> · {type}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function TravelFactors({ rows }) {
  if (!rows.length) return null;
  return (
    <div className="wg-chat-risk" data-testid="chat-risk-breakdown">
      <div className="wg-chat-evidence-title">Computed travel / weather risk</div>
      {rows.map(([label, travel], index) => (
        <div className="wg-chat-risk-city" key={`${label}-${index}`}>
          <div className="wg-chat-risk-head">
            <strong>{label}</strong>
            <span>
              {travel?.score ?? "—"}/100 · {travel?.safety || "UNKNOWN"}
            </span>
          </div>
          {Array.isArray(travel?.factors) && travel.factors.length > 0 && (
            <table className="wg-chat-risk-table">
              <thead>
                <tr>
                  <th scope="col">Factor</th>
                  <th scope="col">Value</th>
                  <th scope="col">Threshold</th>
                  <th scope="col">Effect</th>
                </tr>
              </thead>
              <tbody>
                {travel.factors.map((factor, factorIndex) => (
                  <tr key={`${factor?.name || "factor"}-${factorIndex}`}>
                    <td>{factor?.name || "—"}</td>
                    <td>{factor?.value ?? "—"}</td>
                    <td>{factor?.threshold ?? "—"}</td>
                    <td>{factor?.deduction ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {Array.isArray(travel?.limitations) && travel.limitations.length > 0 && (
            <ul className="wg-chat-limitations">
              {travel.limitations.map((item, limitationIndex) => (
                <li key={`${item}-${limitationIndex}`}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <p className="wg-chat-risk-note">
        Weather risk is not a road-safety rating, traffic report or travel guarantee.
      </p>
    </div>
  );
}

export default function ChatProvenance({ message, onAsk, busy }) {
  const provenance = message.provenance || null;
  const sources = Array.isArray(message.sources) && message.sources.length
    ? message.sources
    : provenance?.sources || [];
  const limitations = Array.isArray(message.limitations) && message.limitations.length
    ? message.limitations
    : provenance?.limitations || [];
  const trace = Array.isArray(message.tool_trace) ? message.tool_trace : [];
  const officials = Array.isArray(message.official_alerts) ? message.official_alerts : [];
  const candidates = Array.isArray(message.location_candidates) ? message.location_candidates : [];
  const officialStatus = String(message.official_alert_status || "NOT_REQUESTED").toUpperCase();
  const travel = message.risk_breakdown?.travel;
  const travelRows = [];
  if (travel?.city1) travelRows.push([travel.city1.location || "City 1", travel.city1]);
  if (travel?.city2) travelRows.push([travel.city2.location || "City 2", travel.city2]);
  if (!travelRows.length && travel && Array.isArray(travel.factors)) {
    travelRows.push([travel.location || "Route", travel]);
  }

  const hasEvidence = Boolean(
    provenance || sources.length || limitations.length || trace.length
  );
  const hasOfficial = officialStatus !== "NOT_REQUESTED";
  const hasRisk = travelRows.length > 0;
  if (!hasEvidence && !hasOfficial && !hasRisk && !candidates.length) return null;

  const chip = (label, value) =>
    value ? (
      <span className="wg-chip static" key={label}>
        {label}: {value}
      </span>
    ) : null;

  return (
    <div className="wg-chat-provenance" data-testid="chat-provenance">
      {hasOfficial && (
        <section className="wg-chat-official" data-testid="official-alerts" aria-label="Official warnings">
          <div className="wg-chat-evidence-title">
            OFFICIAL · IMD · {officialStatus.replaceAll("_", " ")}
          </div>
          {officialStatus === "MATCHED" && officials.length > 0 && (
            <ul className="wg-chat-official-list">
              {officials.map((item, index) => (
                <li key={`${item?.title || "official"}-${index}`}>
                  <strong>{item?.title || "Official IMD item"}</strong>
                  {item?.published ? <span> · {item.published}</span> : null}
                  {item?.description ? <p>{item.description}</p> : null}
                  {item?.link ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      Read the official bulletin
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {officialStatus === "NO_MATCH" && (
            <p>
              No matching official IMD item was found. That is not proof that no warning
              exists; check the official source before acting.
            </p>
          )}
          {officialStatus === "UNAVAILABLE" && (
            <p>
              The official IMD feed is unavailable right now. No computed warning has been
              substituted.
            </p>
          )}
          <SourceList sources={sources.filter((source) => source?.type === "OFFICIAL")} />
        </section>
      )}

      {hasRisk && <TravelFactors rows={travelRows} />}

      {candidates.length > 0 && (
        <div className="wg-chat-candidates" data-testid="location-candidates">
          <div className="wg-chat-evidence-title">Confirm the location</div>
          <div className="wg-chat-candidate-buttons">
            {candidates.map((candidate, index) => {
              const label = [candidate?.name, candidate?.state].filter(Boolean).join(", ");
              if (!label) return null;
              return (
                <button
                  key={`${label}-${index}`}
                  type="button"
                  className="wg-btn-ghost"
                  disabled={busy}
                  onClick={() => onAsk?.(`Weather in ${label}`)}
                >
                  {label}
                  {candidate?.country ? ` · ${candidate.country}` : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasEvidence && (
        <details className="wg-chat-evidence">
          <summary>Evidence and limitations</summary>
          <div className="wg-chat-prov-chips">
            {chip("SOURCE", provenance?.source?.name || sources[0]?.name)}
            {chip("KIND", provenance?.data_kind || message.data_kind)}
            {chip("TYPE", message.data_type || provenance?.data_type)}
            {chip("FRESHNESS", message.freshness || provenance?.freshness)}
            {chip("MODEL", provenance?.model)}
            {chip("RETRIEVED", provenance?.retrieved_at)}
            {chip("VALID", provenance?.valid_time)}
          </div>
          <SourceList sources={sources} />
          {limitations.length > 0 && (
            <ul className="wg-chat-limitations">
              {limitations.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          )}
          {trace.length > 0 && (
            <div className="wg-chat-tools">
              <div className="wg-chat-evidence-title">Tool trace</div>
              <ul>
                {trace.map((tool, index) => (
                  <li key={`${tool?.tool || "tool"}-${index}`}>
                    <strong>{tool?.tool || "tool"}</strong>
                    {tool?.status ? ` · ${tool.status}` : ""}
                    {tool?.source ? ` · ${tool.source}` : ""}
                    {typeof tool?.duration_ms === "number" ? ` · ${tool.duration_ms} ms` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </details>
      )}
    </div>
  );
}
