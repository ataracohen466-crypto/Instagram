import { midiToStaffNote, noteAtFret, STRING_NAMES } from "@/lib/notation";

export interface NoteStaffEntry {
  stringIndex?: number;
  fret?: number;
  midi?: number; // used instead of stringIndex/fret when there's no fretboard position (rare)
}

/** Renders guitar notes (in standard written pitch) on a treble staff with ledger lines. */
export default function NoteStaff({
  notes,
  activeIndex,
  size = "md",
}: {
  notes: NoteStaffEntry[];
  activeIndex?: number;
  size?: "sm" | "md";
}) {
  const lineGap = size === "sm" ? 8 : 11;
  const noteGap = size === "sm" ? 74 : 90;
  const padLeft = 56;
  const padRight = 24;
  const staffTop = 40;
  const bottomLineY = staffTop + lineGap * 4; // E4 line

  const resolved = notes.map((n) =>
    n.midi !== undefined ? midiToStaffNote(n.midi) : noteAtFret(n.stringIndex ?? 0, n.fret ?? 0)
  );

  const width = padLeft + padRight + Math.max(1, notes.length - 1) * noteGap + 40;
  const height = staffTop + lineGap * 4 + 56;

  function yFor(staffStep: number) {
    return bottomLineY - staffStep * (lineGap / 2);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-700 bg-ink-950 p-3">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
        {/* Staff lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={i} x1={20} y1={staffTop + i * lineGap} x2={width - 20} y2={staffTop + i * lineGap} stroke="#3a414d" strokeWidth={1} />
        ))}
        {/* Treble clef (unicode glyph, serif fallback keeps it legible even without the music font) */}
        <text x={24} y={bottomLineY + 4} fontSize={lineGap * 4.4} fontFamily="Georgia, 'Noto Music', serif" fill="#e4e7ec">
          𝄞
        </text>

        {resolved.map((note, i) => {
          const x = padLeft + i * noteGap;
          const y = yFor(note.staffStep);
          const isActive = activeIndex === i;
          const ledgerSteps: number[] = [];
          if (note.staffStep < 0) {
            for (let s = -2; s >= note.staffStep; s -= 2) ledgerSteps.push(s);
          } else if (note.staffStep > 8) {
            for (let s = 10; s <= note.staffStep; s += 2) ledgerSteps.push(s);
          }
          const src = notes[i];
          const hasPos = src.stringIndex !== undefined && src.fret !== undefined;
          const posLabel = hasPos ? STRING_NAMES[src.stringIndex!] : null;
          const fretLabel = hasPos ? `fret ${src.fret}` : null;

          return (
            <g key={i}>
              {ledgerSteps.map((s) => (
                <line key={s} x1={x - 12} y1={yFor(s)} x2={x + 12} y2={yFor(s)} stroke="#5a6270" strokeWidth={1} />
              ))}
              {note.sharp && (
                <text x={x - 16} y={y + 5} fontSize={16} fill={isActive ? "#e8a93d" : "#e4e7ec"}>
                  ♯
                </text>
              )}
              <ellipse cx={x} cy={y} rx={7} ry={5.5} fill={isActive ? "#e8a93d" : "#e4e7ec"} transform={`rotate(-18 ${x} ${y})`} />
              {posLabel && (
                <>
                  <text x={x} y={height - 20} textAnchor="middle" fontSize={10} fill={isActive ? "#e8a93d" : "#88909c"}>
                    {posLabel}
                  </text>
                  <text x={x} y={height - 8} textAnchor="middle" fontSize={10} fill={isActive ? "#e8a93d" : "#88909c"}>
                    {fretLabel}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
