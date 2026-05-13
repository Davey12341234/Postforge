"use client";

export default function UnifiedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "40px 20px",
        background: "#07070f",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }} aria-hidden>
        ⚠️
      </div>

      <h2
        style={{
          fontSize: 24,
          color: "#ef4444",
          marginBottom: 12,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Something went wrong
      </h2>

      <p
        style={{
          color: "#8888aa",
          fontSize: 14,
          marginBottom: 20,
          maxWidth: 400,
        }}
      >
        {error.message || "An unexpected error occurred in the studio."}
      </p>

      <button
        type="button"
        onClick={reset}
        style={{
          padding: "12px 24px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "white",
          border: "none",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Try again
      </button>

      <button
        type="button"
        onClick={() => {
          window.location.href = "/unified";
        }}
        style={{
          marginTop: 12,
          padding: "10px 20px",
          background: "transparent",
          color: "#8888aa",
          border: "1px solid #334155",
          borderRadius: 10,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Reload studio
      </button>
    </div>
  );
}
