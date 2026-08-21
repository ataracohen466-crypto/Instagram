// Spectral-flux onset detection: measures frame-to-frame increase in
// frequency-bin energy. A strum or plucked note produces a sharp rise in
// broadband energy, so peaks in this "flux" signal are a solid, real
// approximation of note/strum onsets — the same core idea production
// beat-tracking libraries use, simplified for in-browser rhythm scoring.

export class OnsetTracker {
  private prevSpectrum: Float32Array | null = null;
  private fluxHistory: number[] = [];
  readonly onsets: number[] = []; // timestamps (ms, performance.now()) of detected onsets
  private lastOnsetAt = 0;

  push(freqData: Uint8Array, timestampMs: number) {
    const spectrum = Float32Array.from(freqData, (v) => v / 255);
    if (this.prevSpectrum) {
      let flux = 0;
      for (let i = 0; i < spectrum.length; i++) {
        const diff = spectrum[i] - this.prevSpectrum[i];
        if (diff > 0) flux += diff;
      }
      this.fluxHistory.push(flux);
      if (this.fluxHistory.length > 43) this.fluxHistory.shift(); // ~1s at 43 frames/s

      const mean = this.fluxHistory.reduce((a, b) => a + b, 0) / this.fluxHistory.length;
      const variance = this.fluxHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / this.fluxHistory.length;
      const threshold = mean + Math.sqrt(variance) * 1.5 + 0.15;

      const debounceMs = 120; // don't double-trigger within one strum
      if (flux > threshold && timestampMs - this.lastOnsetAt > debounceMs) {
        this.onsets.push(timestampMs);
        this.lastOnsetAt = timestampMs;
        this.prevSpectrum = spectrum;
        return true;
      }
    }
    this.prevSpectrum = spectrum;
    return false;
  }

  reset() {
    this.prevSpectrum = null;
    this.fluxHistory = [];
    this.onsets.length = 0;
    this.lastOnsetAt = 0;
  }
}

/** Builds the expected beat-grid timestamps (ms) for a bpm/bars/beatsPerBar window. */
export function buildBeatGrid(bpm: number, bars: number, beatsPerBar: number, startMs: number): number[] {
  const beatMs = 60000 / bpm;
  const grid: number[] = [];
  for (let i = 0; i < bars * beatsPerBar; i++) grid.push(startMs + i * beatMs);
  return grid;
}

/** Scores detected onsets against an expected beat grid: returns 0-100 timing accuracy. */
export function scoreTiming(onsets: number[], grid: number[], toleranceMs = 120): { accuracy: number; offsets: number[] } {
  if (grid.length === 0) return { accuracy: 0, offsets: [] };
  const offsets: number[] = [];
  let hits = 0;
  for (const beat of grid) {
    let closest = Infinity;
    for (const onset of onsets) {
      const diff = Math.abs(onset - beat);
      if (diff < closest) closest = diff;
    }
    if (closest <= toleranceMs) {
      hits++;
      offsets.push(closest);
    }
  }
  return { accuracy: Math.round((hits / grid.length) * 100), offsets };
}
