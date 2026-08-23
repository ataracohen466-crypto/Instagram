"use client";

/**
 * Thin wrappers over the browser's native Web Speech API. Both halves are
 * feature-detected — the UI hides the mic and speaker controls entirely when a
 * browser doesn't support them, rather than showing a button that does nothing.
 */

interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechInputSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function speechOutputSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export interface Dictation {
  stop: () => void;
}

/** Starts dictation; `onText` receives the transcript so far. */
export function startDictation(
  onText: (text: string, isFinal: boolean) => void,
  onEnd?: () => void
): Dictation | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang =
    typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalText = "";

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) finalText += result[0].transcript;
      else interim += result[0].transcript;
    }
    onText(`${finalText}${interim}`.trim(), interim.length === 0);
  };

  recognition.onerror = () => {
    onEnd?.();
  };
  recognition.onend = () => {
    onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}

/** Strips the markdown that would otherwise be read out character by character. */
function forSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/[*_`#>]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export interface SpeakOptions {
  rate?: number;
  /** Shifted per speaker so a two-host podcast sounds like two people. */
  pitch?: number;
}

export function speak(
  text: string,
  onEnd?: () => void,
  options: SpeakOptions = {}
): void {
  if (!speechOutputSupported()) {
    // Keep chained playback moving on browsers with no speech synthesis.
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(forSpeech(text).slice(0, 4000));
  utterance.rate = options.rate ?? 1.02;
  if (options.pitch !== undefined) utterance.pitch = options.pitch;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (!speechOutputSupported()) return;
  window.speechSynthesis.cancel();
}
