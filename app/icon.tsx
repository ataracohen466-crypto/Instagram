import { ImageResponse } from "next/og";

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
          background: "#b5602c",
          borderRadius: 14,
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
              fontSize: 38,
              color: "#fffaf3",
              lineHeight: 1,
            }}
          >
            I
          </div>
          <div
            style={{
              width: 20,
              height: 3,
              borderRadius: 2,
              background: "#fffaf3",
              marginTop: 2,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
