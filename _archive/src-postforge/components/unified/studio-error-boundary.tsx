"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { hasError: boolean; error: Error | null };

/**
 * Catches render/lifecycle errors in the Unified Studio tree so the rest of the app can keep running.
 */
export default class StudioErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Unified Studio]", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background:
              "radial-gradient(ellipse at top, #1e1b4b 0%, #0a0a0f 55%)",
            color: "#e4e4e7",
          }}
        >
          <div
            style={{
              maxWidth: 440,
              padding: 28,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(0,0,0,0.45)",
            }}
          >
            <h1 style={{ margin: "0 0 8px", fontSize: "1.25rem", fontWeight: 800 }}>
              Something went wrong
            </h1>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "#a1a1aa" }}>
              The studio hit an unexpected error. You can try again or return to
              the dashboard.
            </p>
            <pre
              style={{
                fontSize: 12,
                padding: 12,
                borderRadius: 8,
                background: "rgba(0,0,0,0.35)",
                overflow: "auto",
                maxHeight: 120,
                color: "#f87171",
              }}
            >
              {this.state.error.message}
            </pre>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "linear-gradient(90deg, #6366f1, #a855f7)",
                  color: "#fff",
                }}
              >
                Try again
              </button>
              <a
                href="/dashboard"
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)",
                  fontWeight: 600,
                  color: "#e4e4e7",
                  textDecoration: "none",
                  alignSelf: "center",
                }}
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
