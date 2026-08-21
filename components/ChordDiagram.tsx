import { CHORDS } from "@/lib/chords";

export default function ChordDiagram({ chordId, size = 120 }: { chordId: string; size?: number }) {
  const chord = CHORDS[chordId];
  if (!chord) {
    return (
      <div
        style={{ width: size, height: size * 1.15 }}
        className="flex items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-xs text-ink-400"
      >
        {chordId}
      </div>
    );
  }

  const strings = 6;
  const frets = 4;
  const padX = size * 0.12;
  const padTop = size * 0.22;
  const gridW = size - padX * 2;
  const gridH = size * 1.15 - padTop - size * 0.08;
  const stringGap = gridW / (strings - 1);
  const fretGap = gridH / frets;

  const usedFrets = chord.frets.filter((f): f is number => f !== null && f > 0);
  const minFret = usedFrets.length ? Math.min(...usedFrets) : 1;
  const baseFret = minFret > 2 ? minFret : 1;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size * 1.15} viewBox={`0 0 ${size} ${size * 1.15}`}>
        {/* Open/muted markers */}
        {chord.frets.map((f, i) => {
          const x = padX + i * stringGap;
          if (f === null) {
            return (
              <text key={i} x={x} y={padTop - 8} textAnchor="middle" fontSize={size * 0.09} fill="#88909c">
                ×
              </text>
            );
          }
          if (f === 0) {
            return (
              <circle key={i} cx={x} cy={padTop - 10} r={size * 0.035} fill="none" stroke="#5fd9c4" strokeWidth={1.5} />
            );
          }
          return null;
        })}

        {/* Nut or base-fret label */}
        {baseFret === 1 ? (
          <rect x={padX - 1} y={padTop} width={gridW + 2} height={3} fill="#e4e7ec" />
        ) : (
          <text x={padX - size * 0.1} y={padTop + fretGap * 0.7} fontSize={size * 0.09} fill="#e4e7ec">
            {baseFret}fr
          </text>
        )}

        {/* Strings */}
        {Array.from({ length: strings }).map((_, i) => (
          <line
            key={i}
            x1={padX + i * stringGap}
            y1={padTop}
            x2={padX + i * stringGap}
            y2={padTop + gridH}
            stroke="#3a414d"
            strokeWidth={1}
          />
        ))}

        {/* Frets */}
        {Array.from({ length: frets + 1 }).map((_, i) => (
          <line
            key={i}
            x1={padX}
            y1={padTop + i * fretGap}
            x2={padX + gridW}
            y2={padTop + i * fretGap}
            stroke="#3a414d"
            strokeWidth={i === 0 && baseFret === 1 ? 0 : 1}
          />
        ))}

        {/* Barre */}
        {chord.barre && (
          <rect
            x={padX + chord.barre.fromString * stringGap - 6}
            y={padTop + (chord.barre.fret - baseFret + 0.5) * fretGap - 6}
            width={(chord.barre.toString - chord.barre.fromString) * stringGap + 12}
            height={12}
            rx={6}
            fill="#e8a93d"
            opacity={0.9}
          />
        )}

        {/* Finger dots */}
        {chord.frets.map((f, i) => {
          if (f === null || f === 0) return null;
          const x = padX + i * stringGap;
          const y = padTop + (f - baseFret + 0.5) * fretGap;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={size * 0.065} fill="#e8a93d" />
              {chord.fingers[i] && (
                <text x={x} y={y + size * 0.03} textAnchor="middle" fontSize={size * 0.075} fill="#0a0b0d" fontWeight={700}>
                  {chord.fingers[i]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <span className="text-sm font-medium text-ink-100">{chord.id}</span>
    </div>
  );
}
