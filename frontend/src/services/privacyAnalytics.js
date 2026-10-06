const KEY = "weathergpt.localAnalytics";

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function recordEvent(name, details = {}) {
  if (typeof window === "undefined") return;
  try {
    const current = read();
    const events = Array.isArray(current.events) ? current.events : [];
    events.push({
      name: String(name).slice(0, 40),
      at: new Date().toISOString(),
      // Only coarse, non-identifying UI metadata is retained.
      target: typeof details.target === "string" ? details.target.slice(0, 40) : undefined,
    });
    const compact = {
      version: 1,
      firstSeen: current.firstSeen || new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      sessionCount: Number(current.sessionCount || 0) + (name === "app_loaded" ? 1 : 0),
      events: events.slice(-100),
    };
    localStorage.setItem(KEY, JSON.stringify(compact));
  } catch {
    // Privacy analytics must never affect the weather experience.
  }
}
