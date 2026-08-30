export default function ProgressRing({
  progress,
  size = 44,
  stroke = 4,
}: {
  progress: number; // 0..1
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
    </svg>
  );
}
