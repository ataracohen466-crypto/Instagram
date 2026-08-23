// Renders a strum-pattern string like "D DU UDU" (D=down, U=up, .=rest, space=beat gap)
// as a row of directional arrows so beginners can read rhythm visually.
export default function StrumPattern({ pattern }: { pattern: string }) {
  const tokens = pattern.split("");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tokens.map((t, i) => {
        if (t === " ") return <div key={i} className="w-2" />;
        if (t === ".") return <span key={i} className="text-ink-500">·</span>;
        const isDown = t === "D";
        return (
          <span
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold ${
              isDown ? "bg-gold-500/20 text-gold-400" : "bg-teal-500/20 text-teal-400"
            }`}
            title={isDown ? "Down-strum" : "Up-strum"}
          >
            {isDown ? "↓" : "↑"}
          </span>
        );
      })}
    </div>
  );
}
