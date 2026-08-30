/** Shared glyph so the favicon, apple touch icon, and PWA install icons all match. */
export function inkwellGlyph(size: number) {
  const radius = Math.round(size * 0.22);
  const glyphSize = Math.round(size * 0.58);
  const barWidth = Math.round(size * 0.3);
  const barHeight = Math.max(2, Math.round(size * 0.045));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#b5602c",
        borderRadius: radius,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: glyphSize,
            color: "#fffaf3",
            lineHeight: 1,
          }}
        >
          I
        </div>
        <div
          style={{
            width: barWidth,
            height: barHeight,
            borderRadius: barHeight,
            background: "#fffaf3",
            marginTop: Math.max(1, Math.round(size * 0.02)),
          }}
        />
      </div>
    </div>
  );
}
