"use client";

/**
 * Must not import globals.css or other app CSS — if those fail to compile,
 * Next would show “missing required error components” instead of this UI.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#f5f2eb",
          color: "#1a1a1a",
        }}
      >
        <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em", color: "#6b6560" }}>
          STLL Haus POS
        </p>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ fontSize: 14, color: "#6b6560", maxWidth: 320, textAlign: "center" }}>
          {error.message || "Please refresh the page."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            border: "none",
            borderRadius: 8,
            background: "#1a1a1a",
            color: "#f5f2eb",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
