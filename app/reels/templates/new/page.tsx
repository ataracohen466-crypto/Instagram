"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import {
  CATEGORIES,
  CategoryId,
  FILTERS,
  FilterId,
  TransitionId,
  TextStyleId,
  TemplateSlot,
  ReelTemplate,
} from "@/lib/reelTemplates";
import { useApp, uid } from "@/lib/store";

const TRANSITIONS: { id: TransitionId; label: string }[] = [
  { id: "fade", label: "Fade" },
  { id: "zoom", label: "Zoom" },
  { id: "slide", label: "Slide" },
  { id: "flash", label: "Flash" },
  { id: "whip", label: "Whip" },
  { id: "blur", label: "Blur" },
];

const TEXT_STYLES: { id: TextStyleId; label: string }[] = [
  { id: "bold-center", label: "Bold centre" },
  { id: "subtitle", label: "Subtitle" },
  { id: "handwritten", label: "Handwritten" },
  { id: "counter", label: "Counter" },
  { id: "minimal-corner", label: "Minimal corner" },
  { id: "sticker", label: "Sticker" },
];

const ACCENTS = [
  "#e1306c", "#f77737", "#ffdc80", "#5851db",
  "#405de6", "#22c55e", "#0ea5e9", "#111827",
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
        active ? "bg-ig-text text-white" : "bg-[#efefef] text-ig-text"
      }`}
    >
      {children}
    </button>
  );
}

function Builder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("t");

  const myTemplates = useApp((s) => s.myTemplates);
  const saveTemplate = useApp((s) => s.saveTemplate);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategoryId>(CATEGORIES[0].id);
  const [transition, setTransition] = useState<TransitionId>("fade");
  const [filter, setFilter] = useState<FilterId>("none");
  const [textStyle, setTextStyle] = useState<TextStyleId>("bold-center");
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [audioLabel, setAudioLabel] = useState("original audio");
  const [slots, setSlots] = useState<TemplateSlot[]>([
    { label: "Clip 1", seconds: 3, text: "" },
    { label: "Clip 2", seconds: 3, text: "" },
    { label: "Clip 3", seconds: 3, text: "" },
  ]);

  // Editing an existing template loads it in place of the defaults.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded || !editId) return;
    const existing = myTemplates.find((t) => t.id === editId);
    if (!existing) return;
    setLoaded(true);
    setName(existing.name);
    setDescription(existing.description);
    setCategory(existing.category);
    setTransition(existing.transition);
    setFilter(existing.filter);
    setTextStyle(existing.textStyle);
    setAccent(existing.accent);
    setAudioLabel(existing.audioLabel);
    setSlots(existing.slots);
  }, [editId, myTemplates, loaded]);

  const total = slots.reduce((n, s) => n + s.seconds, 0);
  const canSave = name.trim().length > 0 && slots.length > 0;

  function setSlot(i: number, patch: Partial<TemplateSlot>) {
    setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  function save() {
    if (!canSave) return;
    const template: ReelTemplate = {
      id: editId ?? uid("mytpl"),
      name: name.trim(),
      category,
      description: description.trim() || `${slots.length} clips · ${Math.round(total)}s`,
      slots: slots.map((s, i) => ({
        label: s.label.trim() || `Clip ${i + 1}`,
        seconds: s.seconds,
        text: s.text,
      })),
      transition,
      filter,
      textStyle,
      audioLabel: audioLabel.trim() || "original audio",
      accent,
    };
    saveTemplate(template);
    router.push(`/reels/edit?t=${encodeURIComponent(template.id)}`);
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <header className="sticky top-0 z-40 border-b border-ig-border bg-white">
        <div className="mx-auto flex h-[54px] w-full max-w-[470px] items-center gap-3 px-4">
          <Link href="/reels/templates" aria-label="Back">
            <ChevronLeft size={26} />
          </Link>
          <p className="flex-1 text-[16px] font-semibold">
            {editId ? "Edit template" : "New template"}
          </p>
          <button
            onClick={save}
            disabled={!canSave}
            className="rounded-lg bg-ig-blue px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[470px] px-4">
        {/* Cover preview, matching how it will look in the browser */}
        <div
          className="mt-4 flex aspect-[16/9] w-full items-end overflow-hidden rounded-xl p-3"
          style={{
            background: `linear-gradient(155deg, ${accent} 0%, ${accent}55 55%, #111 100%)`,
          }}
        >
          <div className="w-full">
            <div className="mb-2 flex gap-0.5">
              {slots.map((s, i) => (
                <span
                  key={i}
                  className="h-[3px] flex-1 rounded-full bg-white/70"
                  style={{ flexGrow: Math.max(s.seconds, 0.5) }}
                />
              ))}
            </div>
            <p className="truncate text-[15px] font-bold text-white drop-shadow">
              {name.trim() || "Your template"}
            </p>
            <p className="text-[11px] text-white/80">
              {slots.length} clips · {Math.round(total)}s
            </p>
          </div>
        </div>

        <p className="mt-5 text-[13px] font-semibold">Name</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My template"
          className="mt-1.5 w-full rounded-lg border border-ig-border px-3 py-2 text-[14px] outline-none placeholder:text-ig-muted"
        />

        <p className="mt-4 text-[13px] font-semibold">Description</p>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What it's for"
          className="mt-1.5 w-full rounded-lg border border-ig-border px-3 py-2 text-[14px] outline-none placeholder:text-ig-muted"
        />

        <p className="mt-4 text-[13px] font-semibold">Category</p>
        <div className="no-scrollbar mt-1.5 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
              {c.label}
            </Chip>
          ))}
        </div>

        <p className="mt-4 text-[13px] font-semibold">Look</p>
        <div className="no-scrollbar mt-1.5 flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(FILTERS) as FilterId[]).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>

        <p className="mt-4 text-[13px] font-semibold">Transition</p>
        <div className="no-scrollbar mt-1.5 flex gap-2 overflow-x-auto pb-1">
          {TRANSITIONS.map((t) => (
            <Chip key={t.id} active={transition === t.id} onClick={() => setTransition(t.id)}>
              {t.label}
            </Chip>
          ))}
        </div>

        <p className="mt-4 text-[13px] font-semibold">Text style</p>
        <div className="no-scrollbar mt-1.5 flex gap-2 overflow-x-auto pb-1">
          {TEXT_STYLES.map((t) => (
            <Chip key={t.id} active={textStyle === t.id} onClick={() => setTextStyle(t.id)}>
              {t.label}
            </Chip>
          ))}
        </div>

        <p className="mt-4 text-[13px] font-semibold">Accent</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a}
              onClick={() => setAccent(a)}
              aria-label={`Accent ${a}`}
              className={`h-8 w-8 rounded-full border-2 ${
                accent === a ? "border-ig-text" : "border-transparent"
              }`}
              style={{ background: a }}
            />
          ))}
        </div>

        <p className="mt-4 text-[13px] font-semibold">Audio label</p>
        <input
          value={audioLabel}
          onChange={(e) => setAudioLabel(e.target.value)}
          placeholder="original audio"
          className="mt-1.5 w-full rounded-lg border border-ig-border px-3 py-2 text-[14px] outline-none placeholder:text-ig-muted"
        />

        <div className="mt-6 flex items-center justify-between">
          <p className="text-[13px] font-semibold">
            Clips · {Math.round(total)}s total
          </p>
          <button
            onClick={() =>
              setSlots((prev) => [
                ...prev,
                { label: `Clip ${prev.length + 1}`, seconds: 3, text: "" },
              ])
            }
            className="flex items-center gap-1 rounded-lg bg-[#efefef] px-2.5 py-1.5 text-[12px] font-semibold"
          >
            <Plus size={14} /> Add clip
          </button>
        </div>

        <div className="mt-2 space-y-2">
          {slots.map((slot, i) => (
            <div key={i} className="rounded-xl border border-ig-border p-3">
              <div className="flex items-center gap-2">
                <input
                  value={slot.label}
                  onChange={(e) => setSlot(i, { label: e.target.value })}
                  placeholder={`Clip ${i + 1}`}
                  className="min-w-0 flex-1 rounded-md bg-[#efefef] px-2 py-1.5 text-[13px] font-semibold outline-none"
                />
                {slots.length > 1 && (
                  <button
                    onClick={() => setSlots((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove clip ${i + 1}`}
                    className="text-ig-red"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <input
                value={slot.text}
                onChange={(e) => setSlot(i, { text: e.target.value })}
                placeholder="Text on screen…"
                className="mt-1.5 w-full rounded-md bg-[#efefef] px-2 py-1.5 text-[13px] outline-none placeholder:text-ig-muted"
              />

              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={0.5}
                  value={slot.seconds}
                  onChange={(e) => setSlot(i, { seconds: Number(e.target.value) })}
                  className="h-1 flex-1 accent-ig-blue"
                />
                <span className="w-9 text-right text-[11px] tabular-nums text-ig-muted">
                  {slot.seconds.toFixed(1)}s
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] leading-4 text-ig-muted">
          Saving opens the editor with this template so you can drop clips
          straight in. It stays in Your templates for next time.
        </p>
      </div>
    </div>
  );
}

export default function NewTemplatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Builder />
    </Suspense>
  );
}
