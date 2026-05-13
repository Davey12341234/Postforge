export default function UnifiedLoading() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#07070f",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "3px solid transparent",
          borderTopColor: "#6366f1",
          borderRadius: "50%",
          animation: "ucs-spin 0.8s linear infinite",
        }}
      />
      <p style={{ color: "#8888aa", fontSize: 14, margin: 0 }}>
        Loading AI Content Studio…
      </p>
      <style>{`
        @keyframes ucs-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
