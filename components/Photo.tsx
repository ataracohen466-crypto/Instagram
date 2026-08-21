"use client";

import { useState } from "react";
import { photoPlaceholder } from "@/lib/seed";

export default function Photo({
  src,
  seed,
  alt = "",
  className = "",
}: {
  src: string;
  seed: string;
  alt?: string;
  className?: string;
}) {
  const placeholder = photoPlaceholder(seed);
  const [failed, setFailed] = useState(false);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={failed ? placeholder : src}
      alt={alt}
      draggable={false}
      onError={() => setFailed(true)}
      style={{ backgroundImage: `url("${placeholder}")`, backgroundSize: "cover" }}
      className={className}
    />
  );
}
