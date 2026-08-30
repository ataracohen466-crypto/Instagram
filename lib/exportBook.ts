import { Book } from "./types";

function slug(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "untitled";
}

function bookToText(book: Book): string {
  const parts: string[] = [book.title.trim() || "Untitled Book", ""];
  book.chapters.forEach((chapter, i) => {
    parts.push(chapter.title.trim() || `Chapter ${i + 1}`);
    parts.push("");
    chapter.scenes.forEach((scene) => {
      if (scene.content.trim()) {
        parts.push(scene.content.trim());
        parts.push("");
      }
    });
  });
  return parts.join("\n");
}

function bookToMarkdown(book: Book): string {
  const parts: string[] = [`# ${book.title.trim() || "Untitled Book"}`, ""];
  if (book.synopsis.trim()) {
    parts.push(`> ${book.synopsis.trim()}`, "");
  }
  book.chapters.forEach((chapter, i) => {
    parts.push(`## ${chapter.title.trim() || `Chapter ${i + 1}`}`, "");
    chapter.scenes.forEach((scene) => {
      if (scene.content.trim()) {
        parts.push(scene.content.trim(), "");
      }
    });
  });
  return parts.join("\n");
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportBookAsText(book: Book) {
  download(`${slug(book.title)}.txt`, bookToText(book), "text/plain;charset=utf-8");
}

export function exportBookAsMarkdown(book: Book) {
  download(`${slug(book.title)}.md`, bookToMarkdown(book), "text/markdown;charset=utf-8");
}

export function exportSceneAsText(title: string, content: string) {
  download(`${slug(title)}.txt`, content, "text/plain;charset=utf-8");
}
