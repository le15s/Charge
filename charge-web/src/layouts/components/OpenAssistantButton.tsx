"use client";

export default function OpenAssistantButton({ className = "btn btn-primary", children = "Ask the assistant" }: { className?: string; children?: React.ReactNode }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("open-assistant"))}>{children}</button>;
}
