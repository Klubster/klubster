import { ImageResponse } from "next/og";

// Vignette de partage (Messenger, WhatsApp, LinkedIn, iMessage, Slack…).
// Sobre, fidèle à la DA : papier, encre, un seul accent vert sur le curseur.
export const runtime = "edge";
export const alt = "Klubster — Toute votre association, au même endroit.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FCFCFA",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#111111" }}>
          k<span style={{ color: "#279B65" }}>_</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#111111",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Toute votre association,</span>
            <span>au même endroit.</span>
          </div>
          <div style={{ marginTop: 32, fontSize: 30, color: "#6f6f6b", display: "flex" }}>
            Les associations méritent mieux qu’un tableur.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 22, letterSpacing: "0.18em", color: "#6f6f6b" }}>
          PRÊT EN MOINS DE 30 MINUTES<span style={{ color: "#279B65" }}>_</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
