"use client";

import { useEffect, useRef, useState } from "react";

interface MinimalRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function useVoiceToText(onChunk: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<MinimalRecognition | null>(null);

  useEffect(() => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  function start() {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec: MinimalRecognition = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      if (text.trim()) onChunk(text.trim());
    };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  }

  function stop() {
    recRef.current?.stop();
    setListening(false);
  }

  return { listening, supported, start, stop };
}
