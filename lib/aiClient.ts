"use client";

import Anthropic from "@anthropic-ai/sdk";
import { Persona, ChatMessage } from "./types";
import { getPersona, randomPersonas } from "./personas";
import { fallbackCaption, fallbackComment, fallbackChat } from "./fallback";

const MODEL = "claude-opus-5";
const KEY_STORAGE = "instaai.apiKey";

/**
 * The key lives only in this browser's localStorage — it is never sent
 * anywhere except directly to api.anthropic.com from this device.
 */
export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) window.localStorage.setItem(KEY_STORAGE, trimmed);
    else window.localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* private mode / storage disabled — AI just stays off */
  }
}

export function aiEnabled(): boolean {
  return getApiKey().length > 0;
}

function getClient(): Anthropic | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: { "anthropic-dangerous-direct-browser-access": "true" },
  });
}

interface GenerateOptions {
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
}

async function generate({
  system,
  messages,
  maxTokens = 400,
}: GenerateOptions): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      output_config: { effort: "low" },
      system,
      messages,
    });

    if (response.stop_reason === "refusal") return null;

    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Invalid Anthropic API key — falling back to canned text.");
    } else if (error instanceof Anthropic.RateLimitError) {
      console.error("Rate limited — falling back to canned text.");
    } else if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}: ${error.message}`);
    } else {
      console.error("Anthropic request failed", error);
    }
    return null;
  }
}

export interface GeneratedComment {
  username: string;
  avatarSeed: string;
  text: string;
}

export async function generateComments(
  caption: string,
  count = 2,
  personaIds?: string[]
): Promise<GeneratedComment[]> {
  const n = Math.min(Math.max(count, 1), 4);
  const personas: Persona[] = personaIds?.length
    ? (personaIds
        .map((id) => getPersona(id))
        .filter((p): p is Persona => p !== undefined))
    : randomPersonas(n);

  return Promise.all(
    personas.slice(0, n).map(async (persona) => {
      const text = await generate({
        system: `${persona.personality}\n\nYou are commenting on a photo posted by a friend on a social photo app. Reply with ONLY the comment text — no quotes, no name prefix, no explanation. Keep it under 12 words and make it feel like a real Instagram comment.`,
        messages: [
          {
            role: "user",
            content: caption
              ? `The photo's caption is: "${caption}". Write your comment.`
              : `The photo has no caption. Write a short comment reacting to the photo.`,
          },
        ],
        maxTokens: 120,
      });

      return {
        username: persona.username,
        avatarSeed: persona.avatarSeed,
        text: text || fallbackComment(),
      };
    })
  );
}

export async function generateCaption(hint: string): Promise<string> {
  const text = await generate({
    system:
      "You write Instagram captions. Reply with ONLY the caption text — no quotes, no explanation, no hashtag spam. Keep it under 15 words, casual and human, at most one emoji.",
    messages: [
      {
        role: "user",
        content: hint
          ? `Write a caption for a photo described as: "${hint.slice(0, 300)}"`
          : "Write a caption for a photo I just took. Make it feel spontaneous.",
      },
    ],
    maxTokens: 120,
  });

  const { PERSONAS } = await import("./personas");
  const persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
  return text || fallbackCaption(persona);
}

export async function generateChatReply(
  personaId: string,
  myName: string,
  history: ChatMessage[]
): Promise<string> {
  const persona = getPersona(personaId);
  if (!persona) return "…";

  const messages: Anthropic.MessageParam[] = history
    .slice(-20)
    .filter((m) => typeof m.text === "string" && m.text.trim().length > 0)
    .map((m) => ({
      role: m.sender === "me" ? ("user" as const) : ("assistant" as const),
      content: m.text.slice(0, 2000),
    }));

  if (messages.length === 0 || messages[0].role !== "user") {
    messages.unshift({ role: "user", content: "hey!" });
  }

  const reply = await generate({
    system: `${persona.personality}

You are direct-messaging ${myName} on a social photo app. Your handle is @${persona.username}. Stay in character as an AI persona — you can acknowledge you're an AI if asked, but keep it light.

Style rules:
- Write like a real DM: short, casual, lowercase-friendly.
- One to three sentences max. Usually one.
- Ask a question back sometimes, but not every message.
- At most one emoji, often none.
- Never use markdown, bullet points, or headings.`,
    messages,
    maxTokens: 300,
  });

  return reply || fallbackChat(persona);
}
