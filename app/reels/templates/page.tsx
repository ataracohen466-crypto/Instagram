"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Search, Layers, Clock, Trash2, Mic, Music2, Plus, Pencil } from "lucide-react";
import { useApp } from "@/lib/store";
import { filledSlots, draftLength } from "@/lib/drafts";
import {
  TEMPLATES,
  CATEGORIES,
  CategoryId,
  templateDuration,
  ReelTemplate,
} from "@/lib/reelTemplates";

function TemplateCover({ template }: { template: ReelTemplate }) {
  const { accent, slots } = template;
  return (
    <div
      className="relative aspect-[9/16] w-full overflow-hidden rounded-lg"
      style={{
        background: `linear-gradient(155deg, ${accent} 0%, ${accent}55 55%, #111 100%)`,
      }}
    >
      {/* Slot segments, mirroring the reel progress bar */}
      <div className="absolute inset-x-1.5 top-1.5 flex gap-0.5">
        {slots.map((_, i) => (
          <span
            key={i}
            className={`h-[2px] flex-1 rounded-full ${
              i === 0 ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>

      <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 text-center">
        <p className="text-[11px] font-bold uppercase leading-tight tracking-wide text-white drop-shadow">
          {slots[0]?.text || template.name}
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4">
        <p className="flex items-center gap-1 text-[10px] text-white/90">
          <Layers size={9} /> {slots.length}
          <Clock size={9} className="ml-1" /> {Math.round(templateDuration(template))}s
        </p>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const drafts = useApp((s) => s.drafts);
  const deleteDraft = useApp((s) => s.deleteDraft);
  const myTemplates = useApp((s) => s.myTemplates);
  const deleteTemplate = useApp((s) => s.deleteTemplate);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.slots.some((s) => s.text.toLowerCase().includes(q))
      );
    });
  }, [category, query]);

  return (
    <div className="min-h-screen bg-white pb-24">
      <header className="sticky top-0 z-40 border-b border-ig-border bg-white">
        <div className="mx-auto flex h-[54px] w-full max-w-[470px] items-center gap-3 px-4">
          <Link href="/reels" aria-label="Back">
            <ChevronLeft size={26} />
          </Link>
          <p className="flex-1 text-[16px] font-semibold">Templates</p>
          <span className="text-[12px] text-ig-muted">{results.length}</span>
        </div>

        <div className="mx-auto w-full max-w-[470px] px-4 pb-2">
          <div className="flex items-center gap-2 rounded-lg bg-[#efefef] px-3 py-2">
            <Search size={15} className="text-ig-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates"
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-ig-muted"
            />
          </div>
        </div>

        <div className="no-scrollbar mx-auto flex w-full max-w-[470px] gap-2 overflow-x-auto px-4 pb-2.5">
          <button
            onClick={() => setCategory("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold ${
              category === "all"
                ? "bg-ig-text text-white"
                : "bg-[#efefef] text-ig-text"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold ${
                category === c.id
                  ? "bg-ig-text text-white"
                  : "bg-[#efefef] text-ig-text"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto w-full max-w-[470px] px-4 pt-3">
        {!query && category === "all" && (
          <Link
            href="/reels/templates/new"
            className="mb-5 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-ig-border py-3 text-[13px] font-semibold text-ig-blue"
          >
            <Plus size={16} /> Make your own template
          </Link>
        )}

        {myTemplates.length > 0 && !query && category === "all" && (
          <div className="mb-5">
            <p className="text-[13px] font-semibold">Your templates</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {myTemplates.map((t) => (
                <div key={t.id} className="relative">
                  <Link
                    href={`/reels/edit?t=${encodeURIComponent(t.id)}`}
                    className="block"
                  >
                    <TemplateCover template={t} />
                    <p className="mt-1 truncate text-[12px] font-semibold leading-tight">
                      {t.name}
                    </p>
                    <p className="truncate text-[11px] text-ig-muted">
                      {t.description}
                    </p>
                  </Link>
                  <div className="absolute right-1 top-1 flex gap-1">
                    <Link
                      href={`/reels/templates/new?t=${encodeURIComponent(t.id)}`}
                      aria-label={`Edit template ${t.name}`}
                      className="rounded-full bg-black/55 p-1 text-white"
                    >
                      <Pencil size={12} />
                    </Link>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      aria-label={`Delete template ${t.name}`}
                      className="rounded-full bg-black/55 p-1 text-white"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {drafts.length > 0 && !query && category === "all" && (
          <div className="mb-5">
            <p className="text-[13px] font-semibold">Your drafts</p>
            <div className="mt-2 space-y-2">
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-xl border border-ig-border p-2.5"
                >
                  <Link
                    href={`/reels/edit?t=${encodeURIComponent(
                      d.templateId
                    )}&d=${encodeURIComponent(d.id)}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-[13px] font-semibold">
                      {d.templateName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-ig-muted">
                      <span>
                        {filledSlots(d)}/{d.frames.length} clips ·{" "}
                        {Math.round(draftLength(d))}s
                      </span>
                      {d.voiceMediaId && <Mic size={11} />}
                      {d.musicMediaId && <Music2 size={11} />}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-ig-muted">
                      saved {new Date(d.updatedAt).toLocaleString(undefined, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </Link>
                  <button
                    onClick={() => deleteDraft(d.id)}
                    aria-label={`Delete draft ${d.templateName}`}
                    className="shrink-0 p-1.5 text-ig-muted"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 ? (
          <p className="py-20 text-center text-sm text-ig-muted">
            No templates match “{query}”.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {results.map((t) => (
              <Link
                key={t.id}
                href={`/reels/edit?t=${encodeURIComponent(t.id)}`}
                className="block"
              >
                <TemplateCover template={t} />
                <p className="mt-1 truncate text-[12px] font-semibold leading-tight">
                  {t.name}
                </p>
                <p className="truncate text-[11px] text-ig-muted">
                  {t.description}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
