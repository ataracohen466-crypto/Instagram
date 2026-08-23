// Procedurally generates the three 20-level learning paths (Chords, Notes,
// Tabs), each 20 levels x 10 parts x 5 sections = 1,000 lessons.
//
// This is deliberately templated, not 3,000 hand-typed lesson paragraphs:
// each level introduces a small batch of new chords/notes, and its 10 parts
// (one per fixed "archetype" — intro, drill, transition, strumming, rhythm,
// progression, speed ramp, mixed review, timed check, freeplay) apply that
// material with real, specific, parameter-driven instructions that scale in
// tempo and complexity across the 5 sections. It's the same approach real
// gamified skill trees (Duolingo and friends) use to make a large curriculum
// tractable without it turning into filler.

import { FRETBOARD_NOTES, STRING_NAMES, type FretboardNote } from "./notation";
import type { PathKey } from "./types";

export type { PathKey };

export interface GeneratedLesson {
  id: string;
  path: PathKey;
  level: number;
  part: number;
  section: number;
  archetype: string;
  title: string;
  instructions: string;
  tempo: number;
  reps: number;
  targetChords?: string[];
  targetNotes?: FretboardNote[];
}

export interface GeneratedPart {
  part: number;
  archetype: string;
  title: string;
  lessons: GeneratedLesson[];
}

export interface GeneratedLevel {
  level: number;
  title: string;
  summary: string;
  newChords?: string[];
  newNotes?: FretboardNote[];
  parts: GeneratedPart[];
}

const LEVELS_COUNT = 20;
const PARTS_PER_LEVEL = 10;
const SECTIONS_PER_PART = 5;

function reps(section: number): number {
  return 8 + (section - 1) * 4;
}
function tempoFor(base: number, section: number): number {
  const pct = 60 + (section - 1) * 10;
  return Math.round((base * pct) / 100);
}

/* ------------------------------ Chords path ------------------------------ */

const CHORD_INTRO_PLAN: string[][] = [
  ["Em", "Am"],
  ["E", "A"],
  ["D", "Dm"],
  ["G", "C"],
  ["E7", "A7"],
  ["D7", "B7"],
  ["Asus2", "Dsus2"],
  ["Am7", "Dm7"],
  ["G7", "Fmaj7"],
  ["Csus4", "Cadd9"],
  ["E5", "A5"],
  ["F"],
  ["Bm"],
  ["F#m"],
  ["Bb"],
  ["B"],
  [],
  [],
  [],
  [],
];

const CHORD_ARCHETYPES = [
  "Meet the Chord",
  "Shape Drill",
  "First Transition",
  "Strum Pattern Focus",
  "Rhythm & Timing",
  "Progression Loop",
  "Speed Ramp",
  "Mixed Review",
  "Timed Accuracy Check",
  "Freeplay Challenge",
];

const STRUM_PATTERNS = ["D D D D", "D DU D DU", "D DU UDU", "D D UDU", "D DU D U", "DU DU DU DU"];

function chordArchetypeLesson(
  archetype: string,
  section: number,
  newChords: string[],
  known: string[],
  tempoBase: number
): { title: string; instructions: string; targetChords: string[] } {
  const r = reps(section);
  const t = tempoFor(tempoBase, section);
  const focusChords = newChords.length ? newChords : known.slice(-2);
  const pattern = STRUM_PATTERNS[(section - 1) % STRUM_PATTERNS.length];
  // The chord to pair the new material against: something already known from
  // an earlier level, or — on level 1, where nothing is "earlier" yet — the
  // new chord's own level-mate, so the very first transition is Em → Am
  // rather than nonsense like Em → Em.
  const priorChord = known.find((c) => !focusChords.includes(c)) ?? (focusChords.length > 1 ? focusChords[1] : focusChords[0]);

  const isNew = newChords.length > 0;

  switch (archetype) {
    case "Meet the Chord":
      return isNew
        ? {
            title: `Learn ${focusChords.join(" & ")}`,
            instructions: `Place ${focusChords[0]} one finger at a time — check each string rings clean before you strum. Strum once, release, and reset. Repeat ${r} times.`,
            targetChords: [focusChords[0]],
          }
        : {
            title: `Review: ${focusChords.join(" & ")}`,
            instructions: `Revisit ${focusChords[0]} — check your finger placement is still clean and the chord rings without buzzing. Repeat ${r} times.`,
            targetChords: [focusChords[0]],
          };
    case "Shape Drill":
      return {
        title: `${focusChords.join(" / ")} shape drill`,
        instructions: `Place ${focusChords.join(" then ")}, strumming once per chord. Every string should ring — if one buzzes, adjust that finger before moving on. ${r} reps.`,
        targetChords: focusChords,
      };
    case "First Transition":
      return {
        title: `${priorChord} → ${focusChords[0]}`,
        instructions: `Switch between ${priorChord} and ${focusChords[0]} on a slow 4-count at ${t} BPM. Prioritize a clean landing over speed. ${r} switches.`,
        targetChords: [priorChord, focusChords[0]],
      };
    case "Strum Pattern Focus":
      return {
        title: `Strum pattern: ${pattern}`,
        instructions: `Apply the pattern "${pattern}" over ${focusChords.join(" and ")} at ${t} BPM. Keep your arm moving in constant eighth notes even where you don't strike a string.`,
        targetChords: focusChords,
      };
    case "Rhythm & Timing":
      return {
        title: `Timing check: ${focusChords[0]}`,
        instructions: `With the metronome at ${t} BPM, strum ${focusChords[0]} exactly on the beat for ${r} bars. Focus on landing beat 1 dead center.`,
        targetChords: [focusChords[0]],
      };
    case "Progression Loop": {
      const loop = Array.from(new Set([priorChord, ...focusChords, known[known.length - 3] ?? priorChord])).slice(0, 4);
      return {
        title: `Loop: ${loop.join("-")}`,
        instructions: `Loop ${loop.join(" → ")} at ${t} BPM, one chord per bar, using the "${pattern}" pattern. Go around the loop ${Math.max(4, Math.round(r / 4))} times without stopping.`,
        targetChords: loop,
      };
    }
    case "Speed Ramp":
      return {
        title: `Speed ramp: ${focusChords.join(" & ")}`,
        instructions: `Same ${focusChords.join("/")} switch as before, now at ${t} BPM — faster than last section. If it falls apart, drop back 10 BPM and build back up.`,
        targetChords: focusChords,
      };
    case "Mixed Review": {
      const pool = known.length >= 4 ? shuffleDeterministic(known, section).slice(0, 4) : known;
      return {
        title: `Mixed review (${pool.length} chords)`,
        instructions: `Random-order review: ${pool.join(", ")}. Play each for 2 bars at ${t} BPM before moving to the next — this is spaced repetition, not a race.`,
        targetChords: pool,
      };
    }
    case "Timed Accuracy Check":
      return {
        title: `Checkpoint: ${focusChords.join(" & ")}`,
        instructions: `Scored check — play ${focusChords.join(" and ")} for ${r} clean reps at ${t} BPM. This is the level's checkpoint; Live Coach listens and grades each strum.`,
        targetChords: focusChords,
      };
    default:
      return {
        title: `Freeplay: everything so far`,
        instructions: `Free-form practice using any chords from this level and below. Try writing your own 4-chord loop and strumming it at ${t} BPM for a full minute.`,
        targetChords: known.slice(-6),
      };
  }
}

function buildChordsPath(): GeneratedLevel[] {
  const levels: GeneratedLevel[] = [];
  let known: string[] = [];

  for (let level = 1; level <= LEVELS_COUNT; level++) {
    const newChords = CHORD_INTRO_PLAN[level - 1] ?? [];
    known = [...known, ...newChords];
    const tempoBase = 60 + level * 2;
    const isIntegration = newChords.length === 0;

    const parts: GeneratedPart[] = CHORD_ARCHETYPES.map((archetype, partIdx) => {
      const lessons: GeneratedLesson[] = [];
      for (let section = 1; section <= SECTIONS_PER_PART; section++) {
        const { title, instructions, targetChords } = chordArchetypeLesson(archetype, section, newChords, known, tempoBase);
        lessons.push({
          id: `chords-L${pad(level)}-P${pad(partIdx + 1)}-S${pad(section)}`,
          path: "chords",
          level,
          part: partIdx + 1,
          section,
          archetype,
          title,
          instructions,
          tempo: tempoFor(tempoBase, section),
          reps: reps(section),
          targetChords,
        });
      }
      return { part: partIdx + 1, archetype, title: `${archetype}${newChords.length ? ": " + newChords.join(" & ") : ""}`, lessons };
    });

    levels.push({
      level,
      title: isIntegration ? `Level ${level}: Integration & Speed` : `Level ${level}: ${newChords.join(" & ")}`,
      summary: isIntegration
        ? `No new chords — this level is about applying everything you know faster and more accurately.`
        : `Introduces ${newChords.join(" and ")}, then drills them into your hands through the level's 10 parts.`,
      newChords,
      parts,
    });
  }
  return levels;
}

/* --------------------------- Notes & Tabs paths --------------------------- */

// Fret 0..7 across 6 strings, grouped 3-per-level for 16 levels (48 positions), then 4 integration levels.
const NOTE_INTRO_ORDER: FretboardNote[] = [...FRETBOARD_NOTES].sort((a, b) => (a.fret !== b.fret ? a.fret - b.fret : a.stringIndex - b.stringIndex));

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
const NOTE_INTRO_PLAN: FretboardNote[][] = [...chunk(NOTE_INTRO_ORDER, 3), [], [], [], []].slice(0, LEVELS_COUNT);

const NOTE_ARCHETYPES = [
  "Meet the Note",
  "Find It on the Staff",
  "Fretboard Drill",
  "Interval Jump",
  "Rhythm Reading",
  "Note Sequence",
  "Speed Ramp",
  "Mixed Review",
  "Timed Sight-Read",
  "Freeplay Challenge",
];
const TAB_ARCHETYPES = [
  "Read the Tab",
  "Single-String Run",
  "String Skipping",
  "Position Shift",
  "Rhythm in Tab",
  "Combine with a Chord",
  "Speed Run",
  "Mixed Review",
  "Timed Read-Through",
  "Freeplay Tab",
];

function noteLabel(n: FretboardNote): string {
  return `${n.name}${n.octave}`;
}

function positionArchetypeLesson(
  path: "notes" | "tabs",
  archetype: string,
  section: number,
  newNotes: FretboardNote[],
  known: FretboardNote[],
  tempoBase: number
): { title: string; instructions: string; targetNotes: FretboardNote[] } {
  const r = reps(section);
  const t = tempoFor(tempoBase, section);
  const focus = newNotes.length ? newNotes : known.slice(-3);
  const noun = path === "notes" ? "note" : "fret";
  const idx = NOTE_ARCHETYPES.indexOf(archetype) >= 0 ? NOTE_ARCHETYPES.indexOf(archetype) : TAB_ARCHETYPES.indexOf(archetype);

  const isNewMaterial = newNotes.length > 0;

  switch (idx) {
    case 0: // Meet the Note / Read the Tab
      return {
        title: isNewMaterial
          ? path === "notes"
            ? `Learn ${focus.map(noteLabel).join(", ")}`
            : `Read: ${STRING_NAMES[focus[0].stringIndex]} string, fret ${focus[0].fret}`
          : `Review: ${focus.map(noteLabel).join(", ")}`,
        instructions: isNewMaterial
          ? path === "notes"
            ? `Find and play ${focus.map((n) => `${STRING_NAMES[n.stringIndex]} string fret ${n.fret} (${noteLabel(n)})`).join("; ")} on your guitar. Play each ${r} times, checking pitch against the staff position.`
            : `Play ${STRING_NAMES[focus[0].stringIndex]} string, fret ${focus[0].fret}. Repeat ${r} times, matching the tab number to the correct fret every time.`
          : `Revisit ${focus.map(noteLabel).join(", ")} — check your pitch is still accurate. Play each ${r} times.`,
        targetNotes: focus,
      };
    case 1: // Find It on the Staff / Single-String Run
      return {
        title: path === "notes" ? `Staff position: ${focus.map(noteLabel).join(", ")}` : `Run: ${STRING_NAMES[focus[0].stringIndex]} string`,
        instructions:
          path === "notes"
            ? `Look at where ${focus.map(noteLabel).join(" and ")} sit on the staff, then find and play them without looking at the fretboard. ${r} reps each.`
            : `Play a short run of ${r % 5 + 3} notes up and down the ${STRING_NAMES[focus[0].stringIndex]} string, reading the tab left to right, no skipped beats.`,
        targetNotes: focus,
      };
    case 2: // Fretboard Drill / String Skipping
      return {
        title: `${path === "notes" ? "Fretboard drill" : "String-skipping drill"}: ${focus.map(noteLabel).join(", ")}`,
        instructions: `Play ${focus.map(noteLabel).join(", ")} in random order, ${r} total notes, at ${t} BPM. This builds the map between ${noun} position and pitch.`,
        targetNotes: focus,
      };
    case 3: // Interval Jump / Position Shift
      return {
        title: `${path === "notes" ? "Interval jump" : "Position shift"}: ${focus.map(noteLabel).join(" ↔ ")}`,
        instructions: `Alternate between ${focus.map(noteLabel).join(" and ")} at ${t} BPM, ${r} jumps. Keep your fretting hand relaxed as it moves.`,
        targetNotes: focus,
      };
    case 4: // Rhythm Reading / Rhythm in Tab
      return {
        title: `Rhythm check: ${focus.map(noteLabel).join(", ")}`,
        instructions: `With the metronome at ${t} BPM, play ${focus.map(noteLabel).join(", ")} exactly on the beat for ${r} beats total.`,
        targetNotes: focus,
      };
    case 5: { // Note Sequence / Combine with a Chord
      const seq = known.length >= 4 ? shuffleDeterministic(known, section).slice(0, 4) : known;
      return {
        title: `Sequence: ${seq.map(noteLabel).join(" - ")}`,
        instructions: `Play this sequence in order at ${t} BPM, looping it ${Math.max(4, Math.round(r / 4))} times: ${seq.map(noteLabel).join(" → ")}.`,
        targetNotes: seq,
      };
    }
    case 6: // Speed Ramp / Speed Run
      return {
        title: `Speed ${path === "notes" ? "ramp" : "run"}: ${focus.map(noteLabel).join(", ")}`,
        instructions: `Same notes as before, now at ${t} BPM. Back off 10 BPM if the pitches start slipping, then build back up.`,
        targetNotes: focus,
      };
    case 7: { // Mixed Review
      const pool = known.length >= 5 ? shuffleDeterministic(known, section + 7).slice(0, 5) : known;
      return {
        title: `Mixed review (${pool.length} notes)`,
        instructions: `Random-order spaced review: ${pool.map(noteLabel).join(", ")}. Play each twice at ${t} BPM before moving on.`,
        targetNotes: pool,
      };
    }
    case 8: // Timed Sight-Read / Timed Read-Through
      return {
        title: `Checkpoint: ${focus.map(noteLabel).join(", ")}`,
        instructions: `Scored check — play ${focus.map(noteLabel).join(", ")} cleanly at ${t} BPM. Live Coach listens and grades your pitch accuracy.`,
        targetNotes: focus,
      };
    default:
      return {
        title: `Freeplay: everything so far`,
        instructions: `Free-form practice using any notes from this level and below at a comfortable tempo around ${t} BPM.`,
        targetNotes: known.slice(-6),
      };
  }
}

function buildPositionPath(path: "notes" | "tabs"): GeneratedLevel[] {
  const archetypes = path === "notes" ? NOTE_ARCHETYPES : TAB_ARCHETYPES;
  const levels: GeneratedLevel[] = [];
  let known: FretboardNote[] = [];

  for (let level = 1; level <= LEVELS_COUNT; level++) {
    const newNotes = NOTE_INTRO_PLAN[level - 1] ?? [];
    known = [...known, ...newNotes];
    const tempoBase = 60 + level * 2;
    const isIntegration = newNotes.length === 0;

    const parts: GeneratedPart[] = archetypes.map((archetype, partIdx) => {
      const lessons: GeneratedLesson[] = [];
      for (let section = 1; section <= SECTIONS_PER_PART; section++) {
        const { title, instructions, targetNotes } = positionArchetypeLesson(path, archetype, section, newNotes, known, tempoBase);
        lessons.push({
          id: `${path}-L${pad(level)}-P${pad(partIdx + 1)}-S${pad(section)}`,
          path,
          level,
          part: partIdx + 1,
          section,
          archetype,
          title,
          instructions,
          tempo: tempoFor(tempoBase, section),
          reps: reps(section),
          targetNotes,
        });
      }
      return {
        part: partIdx + 1,
        archetype,
        title: `${archetype}${newNotes.length ? ": " + newNotes.map(noteLabel).join(", ") : ""}`,
        lessons,
      };
    });

    levels.push({
      level,
      title: isIntegration
        ? `Level ${level}: Integration & Speed`
        : `Level ${level}: ${newNotes.map((n) => `${STRING_NAMES[n.stringIndex]} fret ${n.fret}`).join(", ")}`,
      summary: isIntegration
        ? `No new positions — this level is about reading and playing everything you know faster and more accurately.`
        : `Introduces ${newNotes.length} new fretboard position${newNotes.length === 1 ? "" : "s"}, then drills them through the level's 10 parts.`,
      newNotes,
      parts,
    });
  }
  return levels;
}

/* --------------------------------- Shared --------------------------------- */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Deterministic pseudo-shuffle (no Math.random) so the same lesson always
// generates the same content — important since lessons are addressed by id
// and re-rendered many times.
function shuffleDeterministic<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed + 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let cache: Record<PathKey, GeneratedLevel[]> | null = null;

export function getCurriculum(path: PathKey): GeneratedLevel[] {
  if (!cache) {
    cache = {
      chords: buildChordsPath(),
      notes: buildPositionPath("notes"),
      tabs: buildPositionPath("tabs"),
    };
  }
  return cache[path];
}

export function findLesson(path: PathKey, level: number, part: number, section: number): GeneratedLesson | undefined {
  return getCurriculum(path)
    .find((l) => l.level === level)
    ?.parts.find((p) => p.part === part)
    ?.lessons.find((s) => s.section === section);
}

export function allChordIdsKnownAt(level: number): string[] {
  const levels = getCurriculum("chords");
  const known: string[] = [];
  for (const l of levels) {
    if (l.level > level) break;
    known.push(...(l.newChords ?? []));
  }
  return known;
}

export const PATH_META: Record<PathKey, { label: string; description: string; icon: string }> = {
  chords: { label: "Chords", description: "Strum real chord shapes and progressions.", icon: "🎸" },
  notes: { label: "Notes", description: "Read standard notation on the staff.", icon: "🎼" },
  tabs: { label: "Tabs", description: "Read and play guitar tablature.", icon: "🎵" },
};
