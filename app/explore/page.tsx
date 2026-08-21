"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { PERSONAS } from "@/lib/personas";
import { useApp } from "@/lib/store";
import { avatarUrl, photoUrl } from "@/lib/seed";
import Photo from "@/components/Photo";

export default function ExplorePage() {
  const posts = useApp((s) => s.posts);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const people = useMemo(
    () =>
      q
        ? PERSONAS.filter(
            (p) =>
              p.username.toLowerCase().includes(q) ||
              p.name.toLowerCase().includes(q) ||
              p.topic.toLowerCase().includes(q)
          )
        : [],
    [q]
  );

  const grid = useMemo(
    () =>
      posts
        .filter((p) => !p.isMine)
        .slice()
        .sort(() => Math.random() - 0.5)
        .slice(0, 30),
    [posts]
  );

  return (
    <div>
      <div className="sticky top-[60px] z-30 bg-ig-bg px-4 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-[#efefef] px-3 py-2">
          <Search size={16} className="text-ig-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ig-muted"
          />
        </div>
      </div>

      {q ? (
        <div className="bg-white">
          {people.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ig-muted">
              No results for “{query}”
            </p>
          ) : (
            people.map((p) => (
              <Link
                key={p.id}
                href={`/profile/${p.username}`}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(p.avatarSeed)}
                  alt=""
                  className="h-11 w-11 rounded-full"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{p.username}</p>
                  <p className="truncate text-sm text-ig-muted">
                    {p.name} • {p.topic}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[2px]">
          {grid.map((post) => (
            <Link
              key={post.id}
              href={`/profile/${post.authorUsername}`}
              className="aspect-square bg-ig-bg"
            >
              <Photo
                src={post.imageUrl ?? photoUrl(post.imageSeed, 400)}
                seed={post.imageSeed}
                className="h-full w-full object-cover"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
