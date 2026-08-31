"use client";

import { useState } from "react";
import { Plus, Check, Trash2, Archive } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, PageHeader, EmptyState } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { GOAL_CATEGORY_META, GOAL_CATEGORIES } from "@/lib/goals";
import type { Goal, GoalCategory } from "@/lib/types";
import { Target } from "lucide-react";

export default function GoalsPage() {
  const goals = useStore((s) => s.goals);
  const addGoal = useStore((s) => s.addGoal);
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const active = goals.filter((g) => !g.archived);
  const archived = goals.filter((g) => g.archived);
  const detail = goals.find((g) => g.id === detailId) ?? null;

  return (
    <div className="pb-10">
      <PageHeader
        title="Goals"
        subtitle="Small, healthy intentions — not a scoreboard."
        action={
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-ink">
            <Plus size={15} /> New goal
          </button>
        }
      />

      {active.length === 0 ? (
        <EmptyState
          icon={<Target size={20} />}
          title="No goals yet"
          body="Try something gentle, like improving your sleep routine or journaling a bit more."
          action={
            <button onClick={() => setAddOpen(true)} className="mt-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-ink">
              Add a goal
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} onOpen={() => setDetailId(g.id)} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Archived</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {archived.map((g) => (
              <GoalCard key={g.id} goal={g} onOpen={() => setDetailId(g.id)} muted />
            ))}
          </div>
        </div>
      )}

      <AddGoalModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addGoal} />
      <GoalDetailModal goal={detail} onClose={() => setDetailId(null)} />
    </div>
  );
}

function GoalCard({ goal, onOpen, muted }: { goal: Goal; onOpen: () => void; muted?: boolean }) {
  const meta = GOAL_CATEGORY_META[goal.category];
  return (
    <button onClick={onOpen} className={`flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-card ${muted ? "opacity-60" : ""}`}>
      <ProgressRing value={goal.progress} size={48} stroke={4.5}>
        <meta.icon size={16} className="text-primary" />
      </ProgressRing>
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{goal.title}</p>
        <p className="text-xs text-ink-faint">{meta.label} · {goal.progress}%</p>
      </div>
    </button>
  );
}

function AddGoalModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: ReturnType<typeof useStore.getState>["addGoal"];
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<GoalCategory>("sleep");
  const [description, setDescription] = useState("");

  function submit() {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), category, description: description || undefined });
    setTitle("");
    setDescription("");
    setCategory("sleep");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New goal">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">Category</label>
          <div className="flex flex-wrap gap-2">
            {GOAL_CATEGORIES.map((c) => {
              const meta = GOAL_CATEGORY_META[c];
              return (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c);
                    if (!title && meta.suggestion) setTitle(meta.suggestion);
                  }}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    category === c ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft"
                  }`}
                >
                  <meta.icon size={13} /> {meta.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">Goal</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Improve my sleep routine"
            className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">Why this matters to you (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <p className="text-xs text-ink-faint">Bloom keeps goals focused on habits and wellbeing, not appearance or weight.</p>
        <button onClick={submit} className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-ink">
          Add goal
        </button>
      </div>
    </Modal>
  );
}

function GoalDetailModal({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const toggleMilestone = useStore((s) => s.toggleGoalMilestone);
  const addMilestone = useStore((s) => s.addGoalMilestone);
  const addHelpfulThing = useStore((s) => s.addHelpfulThing);
  const logGoalWeek = useStore((s) => s.logGoalWeek);
  const archiveGoal = useStore((s) => s.archiveGoal);
  const deleteGoal = useStore((s) => s.deleteGoal);

  const [milestoneText, setMilestoneText] = useState("");
  const [helpfulText, setHelpfulText] = useState("");
  const [weekNote, setWeekNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!goal) return null;
  const meta = GOAL_CATEGORY_META[goal.category];

  return (
    <Modal open={!!goal} onClose={onClose} title={goal.title} wide>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <ProgressRing value={goal.progress} size={64} stroke={6}>
            <span className="font-display text-base font-bold text-ink">{goal.progress}%</span>
          </ProgressRing>
          <div>
            <p className="text-sm font-medium text-ink">{meta.label}</p>
            {goal.description && <p className="text-sm text-ink-soft">{goal.description}</p>}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Milestones</p>
          <div className="space-y-2">
            {goal.milestones.map((m) => (
              <button key={m.id} onClick={() => toggleMilestone(goal.id, m.id)} className="flex w-full items-center gap-2.5 text-left text-sm">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${m.done ? "border-good bg-good text-white" : "border-border text-transparent"}`}>
                  <Check size={12} />
                </span>
                <span className={m.done ? "text-ink-faint line-through" : "text-ink"}>{m.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={milestoneText}
              onChange={(e) => setMilestoneText(e.target.value)}
              placeholder="Add a small milestone"
              className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => {
                if (!milestoneText.trim()) return;
                addMilestone(goal.id, milestoneText.trim());
                setMilestoneText("");
              }}
              className="rounded-lg bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">What's helped</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {goal.helpfulThings.map((h) => (
              <span key={h} className="rounded-full bg-good-soft px-2.5 py-1 text-xs text-good">{h}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={helpfulText}
              onChange={(e) => setHelpfulText(e.target.value)}
              placeholder="e.g. Setting a phone reminder"
              className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => {
                if (!helpfulText.trim()) return;
                addHelpfulThing(goal.id, helpfulText.trim());
                setHelpfulText("");
              }}
              className="rounded-lg bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Weekly reflection</p>
          <textarea
            value={weekNote}
            onChange={(e) => setWeekNote(e.target.value)}
            rows={2}
            placeholder="How's this goal going this week?"
            className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                logGoalWeek(goal.id, weekNote || "Checked in", 5);
                setWeekNote("");
              }}
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-ink"
            >
              Log this week
            </button>
          </div>
          {goal.weeklyLog.length > 0 && (
            <div className="mt-3 space-y-1.5 text-xs text-ink-soft">
              {[...goal.weeklyLog].reverse().slice(0, 5).map((w, i) => (
                <p key={i}>· {w.note}</p>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-border pt-4">
          <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-sm text-warn">
            <Trash2 size={14} /> Delete
          </button>
          <button
            onClick={() => {
              archiveGoal(goal.id, !goal.archived);
              onClose();
            }}
            className="flex items-center gap-1.5 text-sm text-ink-soft"
          >
            <Archive size={14} /> {goal.archived ? "Unarchive" : "Archive"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteGoal(goal.id);
          onClose();
        }}
        title="Delete this goal?"
        body="This removes the goal and its history. This can't be undone."
        confirmLabel="Delete"
        danger
      />
    </Modal>
  );
}
