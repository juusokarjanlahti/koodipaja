"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Text from the assignment that students can copy with one click or drag straight
 * into the editor (CodeMirror accepts text/plain drops natively). The copy button is
 * the keyboard-accessible alternative to dragging (WCAG 2.1: 2.5.1 / 2.1.1).
 */

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers or contexts without the async clipboard API.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "absolute";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const copy = async () => {
    if (await copyText(text)) {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    }
  };
  return { copied, copy };
}

function onDragStart(text: string) {
  return (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", text);
    e.dataTransfer.effectAllowed = "copy";
  };
}

const buttonClass =
  "rounded border border-border bg-surface px-1.5 text-xs text-muted hover:text-text " +
  "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 " +
  "[@media(hover:none)]:opacity-100";

/**
 * The code span itself is the button: click or Enter copies, dragging drops the text into
 * the editor. No extra button means no gaps in the text and it works on touch screens.
 */
export function InlineSnippet({ text }: { text: string }) {
  const { copied, copy } = useCopy(text);
  return (
    <span className="relative inline">
      <button
        type="button"
        onClick={copy}
        draggable
        onDragStart={onDragStart(text)}
        aria-label={`Kopioi teksti ${text}`}
        title="Kopioi napauttamalla tai vedä editoriin"
        data-snippet=""
        className="snippet-inline cursor-grab rounded active:cursor-grabbing"
      >
        <code>{text}</code>
      </button>
      {copied && (
        <span
          role="status"
          className="absolute -top-7 left-0 z-10 whitespace-nowrap rounded bg-text px-2 py-0.5 text-xs text-bg"
        >
          Kopioitu
        </span>
      )}
    </span>
  );
}

export function BlockSnippet({ text }: { text: string }) {
  const { copied, copy } = useCopy(text);
  return (
    <div className="group relative">
      <pre draggable onDragStart={onDragStart(text)} className="cursor-grab active:cursor-grabbing" data-snippet="">
        <code>{text}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className={`absolute right-2 top-2 ${buttonClass}`}
        aria-label="Kopioi koodilohko"
      >
        {copied ? "Kopioitu" : "Kopioi"}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Kopioitu leikepöydälle" : ""}
      </span>
    </div>
  );
}
