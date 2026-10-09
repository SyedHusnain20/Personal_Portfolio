"use client";

import { useEffect, useRef, useState } from "react";
import { NAINI_SUGGESTIONS, SITE } from "@/lib/content";

type Msg = { role: "user" | "assistant"; content: string };

// Keep in step with ChatMessage / ChatIn in backend/schemas.py.
const MAX_CHARS = 600;
const MAX_HISTORY = 8;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Tiny markdown subset (**bold**, [text](url), bare URLs, newlines). Escapes first, so model output can't inject HTML. */
function formatMessage(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(
      /(^|[\s(])(https?:\/\/[^\s<)]+)/g,
      '$1<a href="$2" target="_blank" rel="noreferrer">$2</a>',
    )
    .replace(/\n/g, "<br>");
}

export default function NainiChat() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setEverOpened(true);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(raw: string) {
    const content = raw.trim().slice(0, MAX_CHARS);
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);

    let reply: string;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Replies can be longer than the API's per-message limit, so trim before sending them back.
          messages: next.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          res.status === 429 && typeof data.detail === "string"
            ? data.detail
            : `Sorry, something went wrong. Please try again or email Hasnain directly at ${SITE.email}`,
        );
      }
      reply = String(data.reply);
    } catch (err) {
      reply =
        err instanceof Error && err.message
          ? err.message
          : `Sorry, something went wrong. Please try again or email Hasnain directly at ${SITE.email}`;
    }
    setMessages([...next, { role: "assistant", content: reply }]);
    setBusy(false);
    inputRef.current?.focus();
  }

  return (
    <>
      <button
        className={`naini-fab${open ? " open" : ""}`}
        id="nainiFab"
        type="button"
        aria-label="Chat with Naini, Hasnain's AI assistant"
        aria-expanded={open}
        aria-controls="nainiWindow"
        style={everOpened ? { animation: "none" } : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <svg className="icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg className="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className={`naini-window${open ? " open" : ""}`} id="nainiWindow" role="dialog" aria-label="Chat with Naini">
        <div className="naini-header">
          <div className="naini-avatar">N</div>
          <div className="naini-meta">
            <div className="naini-name">Naini</div>
            <div className="naini-status">Hasnain&apos;s AI assistant</div>
          </div>
        </div>

        <div className="naini-messages" ref={listRef} aria-live="polite">
          <div className="naini-msg bot">
            Hey! 👋 I&apos;m <strong>Naini</strong>, Hasnain&apos;s AI assistant. Ask me anything about his work,
            skills, projects, or how to get in touch!
          </div>

          {messages.length === 0 && (
            <div className="naini-suggestions">
              {NAINI_SUGGESTIONS.map((text) => (
                <button type="button" key={text} onClick={() => send(text)}>
                  {text}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div className="naini-msg user" key={i}>
                {m.content}
              </div>
            ) : (
              <div className="naini-msg bot" key={i} dangerouslySetInnerHTML={{ __html: formatMessage(m.content) }} />
            ),
          )}

          {busy && (
            <div className="naini-typing" aria-label="Naini is typing">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>

        <form
          className="naini-input-area"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="naini-input"
            placeholder="Ask about Hasnain..."
            autoComplete="off"
            maxLength={MAX_CHARS}
            aria-label="Message for Naini"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="naini-send" type="submit" aria-label="Send message" disabled={busy || !input.trim()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
        <div className="naini-powered">POWERED BY GROQ · NAINI v1.0</div>
      </div>
    </>
  );
}
