// Guitar-to-standard-notation mapping for the Notes learning path.
//
// Guitar music is written one octave higher than it sounds (a long-standing
// notation convention that keeps guitar parts off a forest of ledger lines).
// Everything here works in that "written" pitch, so a NoteStaff component
// can place noteheads with no guitar-specific knowledge of its own.

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const DIATONIC_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

export interface StaffNote {
  name: string; // e.g. "F#"
  octave: number;
  midi: number;
  staffStep: number; // integer steps above the treble staff's bottom line (E4) — each step is one line/space
  sharp: boolean;
}

export function midiToStaffNote(midi: number): StaffNote {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  const letter = name[0];
  const diatonicAbs = octave * 7 + DIATONIC_INDEX[letter];
  const referenceAbs = 4 * 7 + DIATONIC_INDEX.E; // E4 = bottom line of the treble staff
  return { name, octave, midi, staffStep: diatonicAbs - referenceAbs, sharp: name.includes("#") };
}

function noteToMidi(name: string, octave: number): number {
  return 12 * (octave + 1) + NOTE_NAMES.indexOf(name);
}

// Open-string pitch as WRITTEN (one octave above what the string actually
// sounds), low E to high e.
const OPEN_STRING_WRITTEN_MIDI = [
  noteToMidi("E", 3),
  noteToMidi("A", 3),
  noteToMidi("D", 4),
  noteToMidi("G", 4),
  noteToMidi("B", 4),
  noteToMidi("E", 5),
];

export const STRING_NAMES = ["Low E", "A", "D", "G", "B", "High e"];

/** The note (in writing pitch) sounded by a given string (0 = low E) and fret. */
export function noteAtFret(stringIndex: number, fret: number): StaffNote {
  return midiToStaffNote(OPEN_STRING_WRITTEN_MIDI[stringIndex] + fret);
}

export interface FretboardNote extends StaffNote {
  stringIndex: number;
  fret: number;
}

/** Every note in first-through-fifth position (frets 0-7) across all 6 strings, for lesson generation. */
export const FRETBOARD_NOTES: FretboardNote[] = (() => {
  const out: FretboardNote[] = [];
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= 7; f++) {
      out.push({ stringIndex: s, fret: f, ...noteAtFret(s, f) });
    }
  }
  return out;
})();

export function findFretboardNote(stringIndex: number, fret: number): FretboardNote {
  return FRETBOARD_NOTES.find((n) => n.stringIndex === stringIndex && n.fret === fret)!;
}

// Frequency (Hz) a given string/fret actually sounds at — used to check a
// played pitch against an expected fretboard position (Notes & Tabs paths).
const OPEN_STRING_SOUNDING_HZ = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];
export function soundingFrequency(stringIndex: number, fret: number): number {
  return OPEN_STRING_SOUNDING_HZ[stringIndex] * Math.pow(2, fret / 12);
}

/** Renders a simple 6-line ASCII tab block (high e on top) for a short note sequence. */
export function tabAsciiFromNotes(notes: { stringIndex: number; fret: number }[]): string {
  const labels = ["e", "B", "G", "D", "A", "E"]; // display order, high to low
  const rows: string[][] = labels.map(() => []);
  for (const n of notes) {
    for (let display = 0; display < 6; display++) {
      const actualString = 5 - display;
      rows[display].push(actualString === n.stringIndex ? String(n.fret) : "-");
    }
  }
  return rows.map((frets, i) => `${labels[i]}|-${frets.join("-")}-|`).join("\n");
}
