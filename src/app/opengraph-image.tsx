import { ImageResponse } from "next/og";

export const alt = "Mega System — Sistema de gestão da Nova Mega Cadeiras";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAEBklEQVRYw+XXXajlUxjH8c/z32c4M3PQHkM4XrYtF2IkihShiLggFyipwRwvceFGIcmIFBnykjEjucHFDDfkLaZojCYRoQzNcTLIS+zhzIuZM/v/uDh/nDP22XvPCTee+rf/7f961vquZz3Pb63F/91iNk6br2yIgRjMMBRiW8n2+orR/E8AxkeaUZYOVRjBafhEeLxgwz4rRst/FWB8pFkkxya34CLMww68FtydZX5QtrNdf3ps9gCtq49SK8p5KY7GXCR+zjI3FUUcn9yJszFnitsuvCctzcw1WeREfeXYbAGaUYSzhEdxYAXwKVbjMpyCgQ59lfgYd2V4tca2fVaM9gQo/vZPlpHyUByG/bEQp2Jp9TvQpa/j8UCkxRj69ZrmLAA6215Y0Ef7QAO3Zbo+Mw9oLW78IwB7asPJrcStxUAx3BppzJjsM4Wztlt+lFW2b63edfGbi0HUMSLMLxTLxq9pftGpTKeR/TrSLDI1haW4pALciXUpnyc+rzK+G0AjuBBnYj5+wxvBHfho35XTIWJKjdeSE5LbcV41i114Lbk/OLyqgKEuANvwofC+dCMur8p1Am+b1Ip12c6df2jFAIwvaRbJyck9OP3PpYn4Acsjc5HJGSzoIV6JzZEeSZ7FGTiygjgTC6OI2yO8gvafSZhhfnLDlMF34BsR60XxdaV6C6sQF12eGhYk52dpXFqDTVVkaliEazPsPy0Js3KsGn2HZ5J3o2z/OJl4saoSpeP6iMCmZLXIFp5KXiJOCK7GMOrS4HSAtFVYHRyMF7E+uJQ4AuNYhWW4Dwd0AdiaPB5sFHEPDgy+r/wfxhVYJXy/ewQmIj2nsDZTGZOqd1kV1sTh5M3EWA+Ab6RPhRtwTuVfYj/cJLyYfJ17545pAPUnR2F767rG5yZiOIo4aIpIBQ4mSmzpIUBbMxURDpniX+CQlJnz8jOoPzTWWYjqy8e0rmoEETPoRfa5wUUHfSimDvxvS3HftqcA2fP7Hp6xBvYAdC6+wNEzgCc2xKR0D/7TAEO4mHxGer1a006z/ykizqvqfXe47A8g7KyUa6rNmdycYpHirxrugLAAx1TRmrZH5GRkegNEEZurI9i5u32fixNl1zyIjke1orZRWf7UVxImE8nLGJ0hbNHl6WQ/Ci9EFL/0VwW1zEzrk3uxodpKZ2NtbBIeU7ZfSe2y73tBa0lTRA6GOAk3mTxgfNslKlP7G8ZRWJssU1iTUW6pLx/rvwoqaf6tteTI94uIjdiePBg83eNIFrgAj+Ar8q1s55b6k2OzLMMQaOEdrCmL/KX+xJczNm8tbijmxDriTWxGdhu859WsdV0jIqMuYyjTt/WVo7t6LXxrpFGLiIOIdvJDvcd98XeTjHOaiJzkrQAAAABJRU5ErkJggg==";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "76px 92px",
          background: "linear-gradient(135deg, #111827 0%, #202938 100%)",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", right: -110, top: -180, width: 620, height: 620, borderRadius: 310, background: "rgba(249, 115, 22, 0.10)", display: "flex" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ width: 104, height: 104, borderRadius: 24, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
            <img src={logo} width="80" height="80" style={{ objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <div style={{ fontSize: 68, fontWeight: 800, letterSpacing: -2 }}>MEGA</div>
            <div style={{ fontSize: 42, fontWeight: 600, color: "#fb923c", letterSpacing: 8, marginTop: 8 }}>SYSTEM</div>
          </div>
        </div>
        <div style={{ width: 112, height: 8, background: "#f97316", borderRadius: 8, marginTop: 58, display: "flex" }} />
        <div style={{ fontSize: 34, fontWeight: 500, marginTop: 30, color: "#e5e7eb" }}>Gestão integrada. Operação inteligente.</div>
        <div style={{ fontSize: 23, marginTop: 18, color: "#9ca3af" }}>Nova Mega Cadeiras</div>
        <div style={{ position: "absolute", bottom: 48, right: 92, fontSize: 20, color: "#9ca3af" }}>mega-system-gamma.vercel.app</div>
      </div>
    ),
    { ...size }
  );
}
