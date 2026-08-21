import type { LevelDef } from "./types";

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    key: "absolute-beginner",
    title: "Absolute Beginner",
    description: "Holding the guitar, first sounds, and your first two chords.",
    testChords: ["Em", "Am"],
    techniqueChallenges: ["Hold a pick correctly", "Fret a single note without buzzing", "Strum 4 clean down-strokes in a row"],
    lessons: [
      {
        id: "l1-posture",
        title: "Posture, Tuning & Your First Note",
        summary: "How to hold the guitar, tune up, and press down a single clean note.",
        chordsTaught: [],
        exercises: [
          { id: "l1-e1", title: "One-string plucking", minutes: 5, kind: "technique", instructions: "Pluck the open low E string 10 times with a relaxed wrist. Focus on a clean, even tone." },
          { id: "l1-e2", title: "Fret one note per string", minutes: 5, kind: "technique", instructions: "Fret the 1st fret on each string with your index finger. Aim for no buzz on any string." },
        ],
      },
      {
        id: "l1-em-am",
        title: "Your First Two Chords: Em and Am",
        summary: "Two chords that share almost the same shape — the fastest way to feel real progress.",
        chordsTaught: ["Em", "Am"],
        exercises: [
          { id: "l1-e3", title: "Em shape drill", minutes: 5, kind: "chord", targetChords: ["Em"], instructions: "Place the Em shape, strum once, check every string rings clean, release, repeat 10 times." },
          { id: "l1-e4", title: "Am shape drill", minutes: 5, kind: "chord", targetChords: ["Am"], instructions: "Place the Am shape, strum once, check every string rings clean, release, repeat 10 times." },
          { id: "l1-e5", title: "Em → Am switch", minutes: 5, kind: "transition", targetChords: ["Em", "Am"], instructions: "Switch slowly between Em and Am on a 4-count. Don't rush — clean beats fast." },
        ],
      },
    ],
  },
  {
    id: 2,
    key: "beginner",
    title: "Beginner",
    description: "The core open-chord vocabulary and your first strum patterns.",
    testChords: ["G", "C", "D"],
    techniqueChallenges: ["Change chords in under 1 second", "Strum a D DU UDU pattern evenly", "Play a full song at a slow tempo"],
    lessons: [
      {
        id: "l2-gcd",
        title: "G, C & D — the campfire chords",
        summary: "The three chords behind more songs than any others.",
        chordsTaught: ["G", "C", "D"],
        exercises: [
          { id: "l2-e1", title: "G shape drill", minutes: 5, kind: "chord", targetChords: ["G"], instructions: "Place G, strum, check all 6 strings ring, release. Repeat 12 times." },
          { id: "l2-e2", title: "C shape drill", minutes: 5, kind: "chord", targetChords: ["C"], instructions: "Place C, strum (mute low E), check strings ring, release. Repeat 12 times." },
          { id: "l2-e3", title: "G → C → D loop", minutes: 8, kind: "transition", targetChords: ["G", "C", "D"], instructions: "Loop G-C-D-G at a slow, steady tempo. Prioritize clean changes over speed." },
        ],
      },
      {
        id: "l2-strum",
        title: "Down-Up Strumming",
        summary: "Building a natural down-up strumming arm motion.",
        chordsTaught: [],
        exercises: [
          { id: "l2-e4", title: "D DU UDU pattern", minutes: 6, kind: "strumming", instructions: "Practice the D DU UDU pattern on a muted strum first, then on an open Em chord." },
        ],
      },
    ],
  },
  {
    id: 3,
    key: "early-intermediate",
    title: "Early Intermediate",
    description: "Barre chords, fingerpicking basics, and playing along to real tempos.",
    testChords: ["F", "A", "E"],
    techniqueChallenges: ["Hold a full barre chord for 8 beats", "Fingerpick a basic Travis-style pattern", "Play along with a metronome at 100 BPM"],
    lessons: [
      {
        id: "l3-barre",
        title: "Introducing the F Barre Chord",
        summary: "The chord everyone dreads — broken into small, achievable steps.",
        chordsTaught: ["F", "Fmaj7"],
        exercises: [
          { id: "l3-e1", title: "Fmaj7 (no barre) first", minutes: 5, kind: "chord", targetChords: ["Fmaj7"], instructions: "Start with the easier Fmaj7 shape to build finger strength before the full barre." },
          { id: "l3-e2", title: "Full F barre, 4 beats at a time", minutes: 8, kind: "chord", targetChords: ["F"], instructions: "Place the barre, strum, hold for 4 beats, release and shake out your hand. Repeat." },
        ],
      },
      {
        id: "l3-fingerpicking",
        title: "Fingerpicking Fundamentals",
        summary: "Thumb-and-fingers independence for picking patterns.",
        chordsTaught: [],
        exercises: [
          { id: "l3-e3", title: "P-i-m-a on Am", minutes: 8, kind: "technique", instructions: "Thumb on the A string, index/middle/ring on G/B/E strings. Go slow, stay even." },
        ],
      },
    ],
  },
  {
    id: 4,
    key: "intermediate",
    title: "Intermediate",
    description: "Full songs, capo work, and playing with expression and dynamics.",
    testChords: ["B7", "D7", "Cadd9"],
    techniqueChallenges: ["Play a full 3-minute song without stopping", "Use dynamics (loud/soft) within one song", "Play a 12-bar blues shuffle"],
    lessons: [
      {
        id: "l4-dynamics",
        title: "Dynamics & Groove",
        summary: "Making the same chords sound like music, not a metronome.",
        chordsTaught: ["Cadd9", "Csus4"],
        exercises: [
          { id: "l4-e1", title: "Loud verse, soft chorus", minutes: 8, kind: "strumming", instructions: "Play the same progression, contrasting a soft verse with a louder chorus." },
        ],
      },
      {
        id: "l4-blues",
        title: "12-Bar Blues Shuffle",
        summary: "The shuffle rhythm behind blues, rock and roll, and country.",
        chordsTaught: ["A7", "D7", "E7"],
        exercises: [
          { id: "l4-e2", title: "Shuffle strum drill", minutes: 8, kind: "rhythm", instructions: "Practice the swung shuffle feel on a single chord before applying it to the full 12-bar form." },
        ],
      },
    ],
  },
  {
    id: 5,
    key: "advanced",
    title: "Advanced",
    description: "Improvisation, advanced technique, and playing with total command of the neck.",
    testChords: ["F", "B7", "Cadd9"],
    techniqueChallenges: ["Improvise a solo over a 12-bar blues", "Sight-read a new chord chart in one pass", "Play a full set (3+ songs) with no notes"],
    lessons: [
      {
        id: "l5-improv",
        title: "Improvising Over Changes",
        summary: "Using the minor pentatonic scale to solo over chord progressions.",
        chordsTaught: [],
        exercises: [
          { id: "l5-e1", title: "Minor pentatonic box 1", minutes: 10, kind: "theory", instructions: "Learn box 1 of the minor pentatonic scale in position, then improvise over a slow backing loop." },
        ],
      },
      {
        id: "l5-technique",
        title: "Advanced Technique Lab",
        summary: "Hybrid picking, string skipping, and legato runs.",
        chordsTaught: [],
        exercises: [
          { id: "l5-e2", title: "Legato run", minutes: 10, kind: "technique", instructions: "Hammer-on/pull-off runs across 3 strings, focus on even volume between picked and slurred notes." },
        ],
      },
    ],
  },
];

export function levelIndex(key: string): number {
  return Math.max(0, LEVELS.findIndex((l) => l.key === key));
}
