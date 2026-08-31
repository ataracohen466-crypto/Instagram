"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Camera, X, Trash2 } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { useStore } from "@/lib/store";
import { dayKey, parseDayKey, formatFriendly } from "@/lib/dates";
import { Card, PageHeader, EmptyState } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PhotoThumb } from "@/components/JournalPhotoThumb";
import { putImage, fileToCompressedDataUrl, deleteImage } from "@/lib/db";
import { newId } from "@/lib/id";
import type { SkinPhotoView } from "@/lib/types";

const VIEWS: SkinPhotoView[] = ["front", "left", "right"];
const VIEW_LABELS: Record<SkinPhotoView, string> = { front: "Front", left: "Left profile", right: "Right profile" };

export default function SkinPhotosPage() {
  const photos = useStore((s) => s.skinPhotos);
  const deleteSkinPhoto = useStore((s) => s.deleteSkinPhoto);
  const [view, setView] = useState<SkinPhotoView>("front");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const viewPhotos = useMemo(
    () => photos.filter((p) => p.view === view).sort((a, b) => b.date.localeCompare(a.date)),
    [photos, view]
  );
  const lastPhoto = viewPhotos[0];
  const daysSinceLast = lastPhoto ? differenceInCalendarDays(new Date(), parseDayKey(lastPhoto.date)) : null;

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const comparePhotos = compareIds.map((id) => photos.find((p) => p.id === id)).filter(Boolean) as typeof photos;

  return (
    <div className="pb-10">
      <Link href="/skin" className="mb-4 flex items-center gap-1 text-sm text-ink-soft"><ChevronLeft size={16} /> Skin</Link>
      <PageHeader
        title="Progress photos"
        subtitle="Private, on-device, and best compared weekly rather than checked daily."
        action={
          <button onClick={() => setCaptureOpen(true)} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--skin)" }}>
            <Camera size={15} /> Add photo
          </button>
        }
      />

      <div className="mb-4 flex gap-1 rounded-full border border-border bg-surface-raised p-1">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => {
              setView(v);
              setCompareIds([]);
            }}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition ${view === v ? "text-white" : "text-ink-soft"}`}
            style={view === v ? { background: "var(--skin)" } : undefined}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      {daysSinceLast !== null && daysSinceLast < 7 && (
        <p className="mb-4 rounded-xl bg-skin-soft px-3 py-2 text-xs text-skin">
          Your last {VIEW_LABELS[view].toLowerCase()} photo was {daysSinceLast === 0 ? "today" : `${daysSinceLast} day${daysSinceLast === 1 ? "" : "s"} ago`}.
          Weekly photos tend to show clearer patterns than checking more often.
        </p>
      )}

      {comparePhotos.length === 2 && (
        <Card className="mb-4">
          <p className="mb-3 text-sm font-semibold text-ink">Comparing</p>
          <div className="grid grid-cols-2 gap-3">
            {comparePhotos
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((p) => (
                <div key={p.id} className="text-center">
                  <PhotoThumb id={p.id} size={140} />
                  <p className="mt-1 text-xs text-ink-faint">{formatFriendly(p.date)}</p>
                </div>
              ))}
          </div>
          <p className="mt-2 text-xs text-ink-faint">Side-by-side is for your own reference only — never used to rank or compare with anyone else.</p>
        </Card>
      )}

      {viewPhotos.length === 0 ? (
        <EmptyState icon={<Camera size={20} />} title="No photos yet" body="Add your first photo with consistent lighting and framing for the clearest comparisons over time." />
      ) : (
        <div>
          <p className="mb-2 text-xs text-ink-faint">Tap up to two photos to compare.</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {viewPhotos.map((p) => (
              <button key={p.id} onClick={() => toggleCompare(p.id)} className="relative">
                <PhotoThumb id={p.id} size={100} />
                {compareIds.includes(p.id) && (
                  <div className="absolute inset-0 rounded-xl border-2" style={{ borderColor: "var(--skin)" }} />
                )}
                <p className="mt-1 text-[10px] text-ink-faint">{formatFriendly(p.date)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <CaptureModal open={captureOpen} onClose={() => setCaptureOpen(false)} defaultView={view} />
    </div>
  );
}

function CaptureModal({ open, onClose, defaultView }: { open: boolean; onClose: () => void; defaultView: SkinPhotoView }) {
  const addSkinPhoto = useStore((s) => s.addSkinPhoto);
  const [view, setView] = useState<SkinPhotoView>(defaultView);
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<{ dataUrl: string; width: number; height: number } | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    const result = await fileToCompressedDataUrl(file, 1600, 0.88);
    setPreview(result);
  }

  async function save() {
    if (!preview) return;
    const id = newId();
    await putImage(id, preview.dataUrl);
    addSkinPhoto({ id, date: dayKey(), view, note: note || undefined });
    setPreview(null);
    setNote("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a progress photo">
      <div className="space-y-4">
        <div className="rounded-xl bg-skin-soft p-3 text-xs text-skin">
          For the clearest comparisons: use the same spot, face the same direction, and try similar lighting each time.
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">View</label>
          <div className="flex gap-2">
            {VIEWS.map((v) => (
              <button key={v} onClick={() => setView(v)} className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-medium ${view === v ? "border-skin bg-skin-soft text-skin" : "border-border text-ink-soft"}`}>
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>

        {preview ? (
          <div className="relative mx-auto w-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.dataUrl} alt="" className="w-full rounded-xl" />
            <button onClick={() => setPreview(null)} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white">
              <X size={13} />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-8 text-ink-faint">
            <Camera size={22} />
            <span className="text-sm">Take or choose a photo</span>
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
        )}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Note (optional)"
          className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-skin"
        />

        <button
          onClick={save}
          disabled={!preview}
          className="w-full rounded-full py-3 text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--skin)" }}
        >
          Save photo
        </button>
      </div>
    </Modal>
  );
}
