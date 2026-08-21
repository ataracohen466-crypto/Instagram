export default function TabViewer({ tab }: { tab: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-ink-700 bg-ink-950 p-4 font-mono text-[13px] leading-relaxed text-teal-400">
      {tab}
    </pre>
  );
}
