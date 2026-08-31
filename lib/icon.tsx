// A simple five-petal bloom glyph rendered via next/og's ImageResponse, so
// the app has real icons with no binary asset files to manage.
export function bloomGlyph(sizePx: number) {
  const petal = (rotate: number) => (
    <div
      key={rotate}
      style={{
        position: "absolute",
        width: sizePx * 0.34,
        height: sizePx * 0.46,
        borderRadius: "50% 50% 50% 50%",
        background: "#fffaf6",
        opacity: 0.92,
        transform: `rotate(${rotate}deg) translateY(-${sizePx * 0.22}px)`,
        transformOrigin: "50% 100%",
      }}
    />
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #7c5cf0 0%, #4fb0c6 100%)",
        borderRadius: sizePx * 0.22,
      }}
    >
      <div
        style={{
          position: "relative",
          width: sizePx * 0.5,
          height: sizePx * 0.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {[0, 72, 144, 216, 288].map((r) => petal(r))}
        <div
          style={{
            width: sizePx * 0.14,
            height: sizePx * 0.14,
            borderRadius: "50%",
            background: "#ffd76a",
          }}
        />
      </div>
    </div>
  );
}
