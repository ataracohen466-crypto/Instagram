import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#b5602c",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 104,
              color: "#fffaf3",
              lineHeight: 1,
            }}
          >
            I
          </div>
          <div
            style={{
              width: 56,
              height: 8,
              borderRadius: 4,
              background: "#fffaf3",
              marginTop: 6,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
