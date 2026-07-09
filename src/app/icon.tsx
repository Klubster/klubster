import { ImageResponse } from "next/og";

// Favicon : le monogramme k_ blanc sur fond encre.
export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          color: "#FCFCFA",
          fontSize: 40,
          fontWeight: 700,
          fontFamily: "monospace",
        }}
      >
        k<span style={{ color: "#279B65" }}>_</span>
      </div>
    ),
    { ...size }
  );
}
