import type { SongArrangement } from "./types";

// A small built-in library of ORIGINAL practice pieces (no copyrighted
// lyrics/melodies — these are teaching arrangements written for the app)
// used by Guitar Game and Fix My Playing so those features work fully
// offline, without needing an AI call or a copyrighted reference track.
export const BUILT_IN_SONGS: SongArrangement[] = [
  {
    title: "Sunrise Strum",
    originalNote: "Original beginner practice piece written for Guitar AI.",
    difficulty: 1,
    bpm: 80,
    capo: 0,
    timeSignature: "4/4",
    chordsUsed: ["G", "Em", "C", "D"],
    sections: [
      { name: "Intro", chords: ["G", "Em"], strumPattern: "D D DU", bars: 4, notes: "Keep the strum slow and even." },
      { name: "Verse", chords: ["G", "Em", "C", "D"], strumPattern: "D DU UDU", bars: 8, notes: "Watch the G→Em change — same shape, one finger moves." },
      { name: "Chorus", chords: ["C", "D", "G"], strumPattern: "D D U UDU", bars: 8, notes: "Let the G ring out on beat 1." },
    ],
    versions: {
      beginner: "Whole notes strum (one down-strum per chord), no fingerpicking.",
      intermediate: "Full D DU UDU pattern with clean chord changes on the beat.",
      advanced: "Add a hammer-on into the G chord and palm-mute the verse.",
    },
  },
  {
    title: "Riverbend Waltz",
    originalNote: "Original 3/4 practice piece written for Guitar AI.",
    difficulty: 2,
    bpm: 96,
    capo: 0,
    timeSignature: "3/4",
    chordsUsed: ["Am", "F", "C", "G"],
    sections: [
      { name: "Intro", chords: ["Am", "F"], strumPattern: "D . D . D .", bars: 4, notes: "Bass-strum-strum feel: root note, then two strums." },
      { name: "Verse", chords: ["Am", "F", "C", "G"], strumPattern: "D DU D DU", bars: 8, notes: "F is the hard one — thumb low, roll through the barre." },
      { name: "Bridge", chords: ["F", "G", "Am"], strumPattern: "D D DU D", bars: 4, notes: "Slow the F→G change down before speeding back up." },
    ],
    versions: {
      beginner: "Swap the F for Fmaj7 (no barre) until the barre chord is solid.",
      intermediate: "Full progression at 96 BPM with the barre F chord.",
      advanced: "Add a walking bassline between chords on beat 3.",
    },
  },
  {
    title: "Backporch Blues Lick",
    originalNote: "Original 12-bar-style practice piece written for Guitar AI.",
    difficulty: 3,
    bpm: 100,
    capo: 0,
    timeSignature: "4/4",
    chordsUsed: ["A7", "D7", "E7"],
    sections: [
      { name: "A section", chords: ["A7"], strumPattern: "D DU D DU", bars: 4, tab: "e|-----------------|\nB|-----------------|\nG|--2--2--0--2--2--|\nD|--2--2--2--2--2--|\nA|--0--0--0--0--0--|\nE|-----------------|", notes: "Lock into the shuffle feel." },
      { name: "B section", chords: ["D7", "A7"], strumPattern: "D DU D DU", bars: 4 },
      { name: "Turnaround", chords: ["E7", "D7", "A7"], strumPattern: "D D D D", bars: 4, notes: "This is the classic blues turnaround — take it slow first." },
    ],
    versions: {
      beginner: "Play just the chords in quarter notes, no shuffle swing yet.",
      intermediate: "Add the swung eighth-note strum shown above.",
      advanced: "Add the turnaround lick tab and a light palm mute throughout.",
    },
  },
];

export function getSongByTitle(title: string): SongArrangement | undefined {
  return BUILT_IN_SONGS.find((s) => s.title.toLowerCase() === title.toLowerCase());
}
