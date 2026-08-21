"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { SUBJECT_COLORS, SUBJECT_ICON_NAMES, subjectIcon } from "@/lib/icons";
import { cx } from "@/lib/utils";

export default function SubjectPicker({
  value,
  onChange,
  allowCreate = true,
}: {
  value: string;
  onChange: (id: string) => void;
  allowCreate?: boolean;
}) {
  const subjects = useStore((s) => s.subjects);
  const addSubject = useStore((s) => s.addSubject);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];
    const icon = SUBJECT_ICON_NAMES[subjects.length % SUBJECT_ICON_NAMES.length];
    const subject = addSubject(trimmed, color, icon);
    onChange(subject.id);
    setName("");
    setAdding(false);
  };

  return (
    <div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {subjects.map((subject) => {
          const Icon = subjectIcon(subject.icon);
          const active = subject.id === value;
          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onChange(subject.id)}
              className={cx("chip shrink-0", active && "chip-active")}
              style={active ? { borderColor: subject.color } : undefined}
            >
              <Icon size={13} style={{ color: subject.color }} />
              {subject.name}
            </button>
          );
        })}
        {allowCreate && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="chip shrink-0 text-ink-faint"
          >
            <Plus size={13} /> Subject
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-2 flex gap-2">
          <input
            className="field"
            placeholder="e.g. AP Chemistry"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <button type="button" className="btn-primary" onClick={create}>
            Add
          </button>
        </div>
      )}
    </div>
  );
}
