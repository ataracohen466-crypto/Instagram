// Real-time pitch detection via autocorrelation (ACF2+), a well-known
// technique that works well for the strong fundamental of a plucked guitar
// string. Runs entirely client-side on samples pulled from a Web Audio
// AnalyserNode — no server round-trip needed for "is this note in tune".

export interface PitchResult {
  frequency: number;
  clarity: number; // 0..1 confidence
}

/** Autocorrelation pitch detection over a Float32 time-domain buffer. */
export function detectPitch(buffer: Float32Array, sampleRate: number): PitchResult | null {
  const SIZE = buffer.length;

  // RMS gate: ignore near-silence so the detector doesn't hallucinate a
  // pitch out of noise floor.
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null;

  // Trim leading/trailing near-silence to focus the autocorrelation window.
  let start = 0;
  let end = SIZE - 1;
  const threshold = 0.2;
  while (start < SIZE / 2 && Math.abs(buffer[start]) < threshold) start++;
  while (end > SIZE / 2 && Math.abs(buffer[end]) < threshold) end--;
  const trimmed = buffer.slice(start, end);
  const n = trimmed.length;
  if (n < 512) return null;

  const c = new Float32Array(n);
  for (let lag = 0; lag < n; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) sum += trimmed[i] * trimmed[i + lag];
    c[lag] = sum;
  }

  // First minimum, then find the max peak after it (fundamental period).
  let d = 0;
  while (d + 1 < n && c[d] > c[d + 1]) d++;

  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < n; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }
  if (maxPos <= 0) return null;

  // Parabolic interpolation around the peak for sub-sample accuracy.
  let T0 = maxPos;
  const x1 = c[T0 - 1] ?? c[T0];
  const x2 = c[T0];
  const x3 = c[T0 + 1] ?? c[T0];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a !== 0) T0 = T0 - b / (2 * a);

  const frequency = sampleRate / T0;
  const clarity = Math.max(0, Math.min(1, maxVal / (c[0] || 1)));

  if (frequency < 60 || frequency > 1200) return null;
  return { frequency, clarity };
}

// Standard guitar string frequencies for tuner reference, low E to high E.
export const OPEN_STRINGS = [
  { name: "E2", freq: 82.41 },
  { name: "A2", freq: 110.0 },
  { name: "D3", freq: 146.83 },
  { name: "G3", freq: 196.0 },
  { name: "B3", freq: 246.94 },
  { name: "E4", freq: 329.63 },
];

export function nearestOpenString(freq: number) {
  return OPEN_STRINGS.reduce((best, s) => (Math.abs(s.freq - freq) < Math.abs(best.freq - freq) ? s : best));
}
