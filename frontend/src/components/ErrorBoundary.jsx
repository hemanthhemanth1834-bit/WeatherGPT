import React from "react";

/**
 * Keeps one failing module from taking down the whole application.
 * The fallback deliberately avoids showing raw exception text, which can
 * contain implementation details and is not useful to a visitor.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    if (state.resetKey !== props.resetKey) {
      return { error: null, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error, info) {
    // Development diagnostics only; the visitor sees a safe, actionable state.
    console.error("WeatherGPT module render failed", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <section className="wg-module-error" role="alert" aria-labelledby="wg-module-error-title">
        <span className="wg-module-error-kicker">MODULE UNAVAILABLE</span>
        <h2 id="wg-module-error-title">This section could not be displayed</h2>
        <p>
          The rest of WeatherGPT is still available. Retry this section, or open
          Platform Status to check the data services before trying again.
        </p>
        <div className="wg-module-error-actions">
          <button type="button" className="wg-btn" onClick={() => this.setState({ error: null })}>
            Retry section
          </button>
          {this.props.onOpenStatus && (
            <button type="button" className="wg-btn-ghost" onClick={() => this.props.onOpenStatus()}>
              Open Platform Status →
            </button>
          )}
        </div>
      </section>
    );
  }
}
