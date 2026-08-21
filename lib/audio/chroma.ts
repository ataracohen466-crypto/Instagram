import { CHORD_CHROMA_TEMPLATES } from "../chords";

// Folds an FFT frequency-domain buffer into a 12-bin chroma vector (energy
// per pitch class, octave-independent) and matches it against known chord
// templates via cosine similarity. This is the same family of technique
// real chord-recognition systems use, simplified for a live, in-browser
// beginner coach rather than studio-grade MIR.

export function computeChroma(freqData: Uint8Array, sampleRate: number, fftSize: number): number[] {
  const chroma = new Array(12).fill(0);
  const binHz = sampleRate / fftSize;
  const minFreq = 70; // below low E
  const maxFreq = 1200;

  for (let bin = 0; bin < freqData.length; bin++) {
    const freq = bin * binHz;
    if (freq < minFreq || freq > maxFreq) continue;
    const magnitude = freqData[bin] / 255;
    if (magnitude < 0.05) continue;
    const midi = 69 + 12 * Math.log2(freq / 440);
    const pitchClass = (((Math.round(midi) % 12) + 12) % 12);
    chroma[pitchClass] += magnitude;
  }

  const max = Math.max(...chroma, 1e-6);
  return chroma.map((v) => v / max);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function matchChord(chroma: number[]): { chordId: string; confidence: number } | null {
  let best: { chordId: string; confidence: number } | null = null;
  for (const [chordId, template] of Object.entries(CHORD_CHROMA_TEMPLATES)) {
    const sim = cosineSimilarity(chroma, template);
    if (!best || sim > best.confidence) best = { chordId, confidence: sim };
  }
  return best;
}
