import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

class RouteBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface in console; don't swallow into telemetry yet — that's a bigger job.
    console.error("[route]", this.props.routeKey, error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="route-error-shell">
          <div className="route-error-card">
            <div className="route-error-icon">!</div>
            <h2 className="route-error-title">This page hit an error</h2>
            <p className="route-error-message">
              {this.state.error?.message || "Unknown error"}
            </p>
            <div className="route-error-actions">
              <button
                type="button"
                className="route-error-btn primary"
                onClick={() => {
                  this.setState({ error: null });
                  this.props.onRetry && this.props.onRetry();
                }}
              >
                Try again
              </button>
              <button
                type="button"
                className="route-error-btn"
                onClick={() => this.props.onHome && this.props.onHome()}
              >
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Re-mount when the path changes so a broken page doesn't poison the next one.
  return (
    <RouteBoundary
      key={location.pathname}
      routeKey={location.pathname}
      onRetry={() => navigate(0)}
      onHome={() => navigate("/dashboard")}
    >
      {children}
    </RouteBoundary>
  );
}
