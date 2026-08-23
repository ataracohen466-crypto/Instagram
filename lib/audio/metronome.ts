// A lookahead-scheduling Web Audio metronome/click track. Uses the
// standard "schedule slightly ahead of time" pattern so timing stays sample
// -accurate regardless of JS timer jitter.

export class Metronome {
  private ctx: AudioContext;
  private bpm: number;
  private beatsPerBar: number;
  private nextNoteTime = 0;
  private timerId: number | null = null;
  private currentBeat = 0;
  private lookahead = 25; // ms
  private scheduleAheadTime = 0.1; // seconds
  onBeat?: (beatIndex: number, timeSeconds: number) => void;

  constructor(ctx: AudioContext, bpm: number, beatsPerBar = 4) {
    this.ctx = ctx;
    this.bpm = bpm;
    this.beatsPerBar = beatsPerBar;
  }

  private scheduleClick(beatIndex: number, time: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = beatIndex % this.beatsPerBar === 0 ? 1400 : 1000;
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
    this.onBeat?.(beatIndex, time);
  }

  private scheduler = () => {
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleClick(this.currentBeat, this.nextNoteTime);
      this.nextNoteTime += 60 / this.bpm;
      this.currentBeat++;
    }
    this.timerId = window.setTimeout(this.scheduler, this.lookahead);
  };

  start() {
    this.currentBeat = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    if (this.timerId) window.clearTimeout(this.timerId);
    this.timerId = null;
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
  }
}
