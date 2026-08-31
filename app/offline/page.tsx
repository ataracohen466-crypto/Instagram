import { CloudOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-base px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <CloudOff size={26} />
      </div>
      <h1 className="font-display text-xl font-semibold text-ink">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-ink-soft">
        Bloom keeps your data on this device, so most of the app still works — reconnect to load new
        pages that haven&apos;t been visited yet.
      </p>
    </div>
  );
}
