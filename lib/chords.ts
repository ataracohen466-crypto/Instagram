import type { ChordDef } from "./types";

// Standard-tuning open/common chord shapes used across the whole app
// (diagrams, tabs, live-coach chroma matching, game mode).
export const CHORDS: Record<string, ChordDef> = {
  E: { id: "E", name: "E major", frets: [0, 2, 2, 1, 0, 0], fingers: [null, 2, 3, 1, null, null], difficulty: 1 },
  Em: { id: "Em", name: "E minor", frets: [0, 2, 2, 0, 0, 0], fingers: [null, 2, 3, null, null, null], difficulty: 1 },
  A: { id: "A", name: "A major", frets: [null, 0, 2, 2, 2, 0], fingers: [null, null, 1, 2, 3, null], difficulty: 1 },
  Am: { id: "Am", name: "A minor", frets: [null, 0, 2, 2, 1, 0], fingers: [null, null, 2, 3, 1, null], difficulty: 1 },
  D: { id: "D", name: "D major", frets: [null, null, 0, 2, 3, 2], fingers: [null, null, null, 1, 3, 2], difficulty: 2 },
  Dm: { id: "Dm", name: "D minor", frets: [null, null, 0, 2, 3, 1], fingers: [null, null, null, 2, 3, 1], difficulty: 2 },
  G: { id: "G", name: "G major", frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, null, null, null, 3], difficulty: 2 },
  C: { id: "C", name: "C major", frets: [null, 3, 2, 0, 1, 0], fingers: [null, 3, 2, null, 1, null], difficulty: 2 },
  F: {
    id: "F",
    name: "F major (barre)",
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    barre: { fret: 1, fromString: 0, toString: 5 },
    difficulty: 4,
  },
  Fmaj7: { id: "Fmaj7", name: "F major 7 (easy F)", frets: [null, null, 3, 2, 1, 0], fingers: [null, null, 3, 2, 1, null], difficulty: 2 },
  B7: { id: "B7", name: "B7", frets: [null, 2, 1, 2, 0, 2], fingers: [null, 2, 1, 3, null, 4], difficulty: 3 },
  E7: { id: "E7", name: "E7", frets: [0, 2, 0, 1, 0, 0], fingers: [null, 2, null, 1, null, null], difficulty: 1 },
  A7: { id: "A7", name: "A7", frets: [null, 0, 2, 0, 2, 0], fingers: [null, null, 2, null, 3, null], difficulty: 2 },
  D7: { id: "D7", name: "D7", frets: [null, null, 0, 2, 1, 2], fingers: [null, null, null, 2, 1, 3], difficulty: 2 },
  Csus4: { id: "Csus4", name: "C sus4", frets: [null, 3, 3, 0, 1, 1], fingers: [null, 3, 4, null, 1, 1], difficulty: 3 },
  Cadd9: { id: "Cadd9", name: "C add9", frets: [null, 3, 2, 0, 3, 0], fingers: [null, 2, 1, null, 3, null], difficulty: 3 },
  Bm: {
    id: "Bm",
    name: "B minor (mini barre)",
    frets: [null, 2, 4, 4, 3, 2],
    fingers: [null, 1, 3, 4, 2, 1],
    barre: { fret: 2, fromString: 1, toString: 5 },
    difficulty: 4,
  },
};

export const CHORD_ORDER_BY_DIFFICULTY = Object.values(CHORDS)
  .sort((a, b) => a.difficulty - b.difficulty)
  .map((c) => c.id);

// Fancier chord names real songs use, mapped to the nearest shape we have a
// diagram for. The label shown to the player is always the real chord name
// (e.g. "Em7") — only the fretboard picture is simplified to a shape we draw.
export const CHORD_DIAGRAM_ALIAS: Record<string, string> = { Em7: "Em", Dsus4: "D", A7sus4: "A7", "D/F#": "D" };

export function diagramIdFor(chordId: string): string {
  return CHORD_DIAGRAM_ALIAS[chordId] ?? chordId;
}

// Note names, used by the pitch detector to label detected frequencies.
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Which chromatic pitch classes (0=C .. 11=B) sound in each common chord.
// Used by the live-coach chroma matcher — a lightweight, real (not simulated)
// nearest-template match against the guitar's actual frequency content.
export const CHORD_CHROMA_TEMPLATES: Record<string, number[]> = {
  E: pcs(["E", "G#", "B"]),
  Em: pcs(["E", "G", "B"]),
  A: pcs(["A", "C#", "E"]),
  Am: pcs(["A", "C", "E"]),
  D: pcs(["D", "F#", "A"]),
  Dm: pcs(["D", "F", "A"]),
  G: pcs(["G", "B", "D"]),
  C: pcs(["C", "E", "G"]),
  F: pcs(["F", "A", "C"]),
  E7: pcs(["E", "G#", "B", "D"]),
  A7: pcs(["A", "C#", "E", "G"]),
  D7: pcs(["D", "F#", "A", "C"]),
  B7: pcs(["B", "D#", "F#", "A"]),
};

function pcs(notes: string[]): number[] {
  const v = new Array(12).fill(0);
  for (const n of notes) v[NOTE_NAMES.indexOf(n)] = 1;
  return v;
}

export function frequencyToNote(freq: number): { note: string; octave: number; cents: number; midi: number } {
  const A4 = 440;
  const midi = 69 + 12 * Math.log2(freq / A4);
  const rounded = Math.round(midi);
  const cents = Math.round((midi - rounded) * 100);
  const note = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return { note, octave, cents, midi: rounded };
}
