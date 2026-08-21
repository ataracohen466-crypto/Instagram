// Real, well-known songs. We publish only the chord progression — a
// functional, non-copyrightable building block (the same reason every chord
// -chart site can publish these) — plus capo/tempo/structure. No lyrics, no
// note-for-note transcription of the recording.
export interface PopularSongSection {
  name: string;
  chords: string[];
  strumPattern: string;
}

export interface PopularSong {
  title: string;
  artist: string;
  capo: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  bpm: number;
  timeSignature: string;
  chordsUsed: string[];
  sections: PopularSongSection[];
  tip: string;
}

export const POPULAR_SONGS: PopularSong[] = [
  {
    title: "Wonderwall",
    artist: "Oasis",
    capo: 2,
    difficulty: 2,
    bpm: 87,
    timeSignature: "4/4",
    chordsUsed: ["Em7", "G", "Cadd9", "D"],
    sections: [
      { name: "Verse", chords: ["Em7", "G", "Dsus4", "A7sus4"], strumPattern: "D DU D DU" },
      { name: "Chorus", chords: ["Cadd9", "D", "Em7", "G"], strumPattern: "D D DU D" },
      { name: "Bridge", chords: ["C", "D", "Em", "G"], strumPattern: "D DU D DU" },
    ],
    tip: "The whole song lives on four chord shapes with a capo on fret 2 — the hardest part is the fast Em7→G change.",
  },
  {
    title: "Perfect",
    artist: "Ed Sheeran",
    capo: 1,
    difficulty: 2,
    bpm: 63,
    timeSignature: "4/4",
    chordsUsed: ["G", "Em", "C", "D"],
    sections: [
      { name: "Verse", chords: ["G", "Em", "C", "D"], strumPattern: "D . DU . D ." },
      { name: "Chorus", chords: ["G", "Em", "C", "D"], strumPattern: "D DU UDU" },
    ],
    tip: "Same four chords the whole way through — capo 1 keeps it in the original key. Swap in Em7/Cadd9/Dsus4 later for color.",
  },
  {
    title: "Riptide",
    artist: "Vance Joy",
    capo: 1,
    difficulty: 2,
    bpm: 100,
    timeSignature: "4/4",
    chordsUsed: ["Am", "G", "C", "F"],
    sections: [
      { name: "Verse", chords: ["Am", "G", "C"], strumPattern: "D DU UDU" },
      { name: "Chorus", chords: ["Am", "G", "C", "F"], strumPattern: "D DU UDU" },
    ],
    tip: "Started life on ukulele, so the strum wants to feel light and bouncy rather than heavy.",
  },
  {
    title: "I'm Yours",
    artist: "Jason Mraz",
    capo: 4,
    difficulty: 2,
    bpm: 76,
    timeSignature: "4/4",
    chordsUsed: ["G", "D", "Em", "C"],
    sections: [
      { name: "Verse", chords: ["G", "D", "Em", "C"], strumPattern: "D DU UDU" },
      { name: "Chorus", chords: ["G", "D", "Em", "C"], strumPattern: "D DU UDU" },
    ],
    tip: "One loop, all the way through — great song for building strumming stamina.",
  },
  {
    title: "Thinking Out Loud",
    artist: "Ed Sheeran",
    capo: 2,
    difficulty: 3,
    bpm: 79,
    timeSignature: "4/4",
    chordsUsed: ["D", "G", "A", "Bm"],
    sections: [
      { name: "Verse", chords: ["D", "G", "A"], strumPattern: "D DU D DU" },
      { name: "Chorus", chords: ["D", "G", "A", "Bm"], strumPattern: "D DU D DU" },
    ],
    tip: "The chorus adds Bm into the mix — a great first mini-barre chord to learn.",
  },
  {
    title: "Hey, Soul Sister",
    artist: "Train",
    capo: 4,
    difficulty: 2,
    bpm: 97,
    timeSignature: "4/4",
    chordsUsed: ["C", "G", "Am", "F"],
    sections: [
      { name: "Verse", chords: ["C", "G", "Am", "F"], strumPattern: "D DU UDU" },
      { name: "Chorus", chords: ["C", "G", "Am", "F"], strumPattern: "D D UDU" },
    ],
    tip: "Capo 4 gets you that ukulele-bright tone from the original recording.",
  },
  {
    title: "Someone Like You",
    artist: "Adele",
    capo: 2,
    difficulty: 2,
    bpm: 67,
    timeSignature: "4/4",
    chordsUsed: ["G", "D", "Em", "C"],
    sections: [
      { name: "Verse", chords: ["G", "D", "Em", "C"], strumPattern: "D . . D . U ." },
      { name: "Chorus", chords: ["G", "D", "Em", "C"], strumPattern: "D DU UDU" },
    ],
    tip: "Written on piano, so let the chords ring out — this one rewards a soft touch over a hard strum.",
  },
  {
    title: "Free Fallin'",
    artist: "Tom Petty",
    capo: 3,
    difficulty: 1,
    bpm: 95,
    timeSignature: "4/4",
    chordsUsed: ["D", "G", "A"],
    sections: [
      { name: "Verse", chords: ["D", "G", "D", "A"], strumPattern: "D DU UDU" },
      { name: "Chorus", chords: ["D", "G", "D", "A"], strumPattern: "D DU UDU" },
    ],
    tip: "Only three chords — one of the best songs for a brand new player's first full song.",
  },
  {
    title: "Let It Be",
    artist: "The Beatles",
    capo: 0,
    difficulty: 2,
    bpm: 73,
    timeSignature: "4/4",
    chordsUsed: ["C", "G", "Am", "F"],
    sections: [
      { name: "Verse", chords: ["C", "G", "Am", "F", "C", "G", "F", "C"], strumPattern: "D D DU D" },
      { name: "Chorus", chords: ["Am", "G", "F", "C"], strumPattern: "D DU D DU" },
    ],
    tip: "One of the most-covered progressions in pop — nail this and you can fake your way through hundreds of songs.",
  },
  {
    title: "Stand By Me",
    artist: "Ben E. King",
    capo: 0,
    difficulty: 1,
    bpm: 118,
    timeSignature: "4/4",
    chordsUsed: ["G", "Em", "C", "D"],
    sections: [
      { name: "Verse", chords: ["G", "Em", "C", "D"], strumPattern: "D . D . D ." },
      { name: "Chorus", chords: ["G", "Em", "C", "D"], strumPattern: "D . D . D ." },
    ],
    tip: "The textbook I–vi–IV–V progression — once this is under your fingers you'll hear it everywhere.",
  },
];

export function findPopularSong(query: string): PopularSong | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return POPULAR_SONGS.find((s) => s.title.toLowerCase() === q || `${s.title} ${s.artist}`.toLowerCase() === q);
}
