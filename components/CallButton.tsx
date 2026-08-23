"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import CallOverlay from "@/components/CallOverlay";

/** Floating call button, available from every screen. */
export default function CallButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Call the tutor"
        title="Call the tutor"
        className="fixed bottom-[86px] right-4 z-40 grid h-13 w-13 place-items-center rounded-full bg-brand-600 text-white shadow-pop transition hover:scale-105 hover:bg-brand-700"
        style={{ height: 52, width: 52 }}
      >
        <Phone size={21} />
      </button>
      {open && <CallOverlay onClose={() => setOpen(false)} />}
    </>
  );
}
