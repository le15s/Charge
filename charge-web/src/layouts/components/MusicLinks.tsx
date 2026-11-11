"use client";

import { addMusicLink, removeMusicLink } from "@/app/actions/music";
import { MAX_MUSIC_LINKS, MUSIC_KINDS, parseMusicUrl, type MusicItem } from "@/lib/music";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

/** One saved link, as a button-sized row. It opens the playlist in the person's own music app. */
function Row({ m, onOpen }: { m: MusicItem; onOpen?: () => void }) {
  return (
    <a href={m.url} target="_blank" rel="noopener noreferrer" onClick={onOpen} data-testid="music-open"
      className="flex items-center gap-3 rounded-2xl border-2 border-border px-4 py-3 transition active:scale-[0.99] hover:border-primary dark:border-darkmode-border dark:hover:border-darkmode-primary">
      <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-lg text-white dark:bg-darkmode-primary dark:text-darkmode-body">♪</span>
      <span className="min-w-0 grow">
        <span className="block truncate font-semibold text-text-dark dark:text-darkmode-text-dark">{m.title}</span>
        <span className="block text-xs text-text-light dark:text-darkmode-text-light">{MUSIC_KINDS[m.kind].label}</span>
      </span>
      <span aria-hidden className="shrink-0 text-sm font-semibold text-primary dark:text-darkmode-primary">Open ↗</span>
    </a>
  );
}

/** The workout screen's "Music" button: a small sheet with the saved playlists. */
export function MusicSheet({ links }: { links: MusicItem[] }) {
  const [open, setOpen] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey); close.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button type="button" className="stat-pill cursor-pointer" onClick={() => setOpen(true)} aria-haspopup="dialog" data-testid="music-button"><span aria-hidden>♪</span> Music</button>
      {/* in a portal: the workout bar has a blur filter, which would trap a fixed sheet inside the bar */}
      {open && createPortal(
        <div className="anim-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Music" onClick={(e) => e.stopPropagation()} className="anim-sheet flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-body dark:bg-darkmode-body sm:rounded-2xl" data-testid="music-sheet">
            <div className="flex items-center justify-between border-b border-border px-5 py-4 dark:border-darkmode-border">
              <h2 className="h5">Music</h2>
              <button ref={close} type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-2xl leading-none">×</button>
            </div>
            <div className="space-y-2 overflow-y-auto p-4">
              {links.length ? links.map((m) => <Row key={m.id} m={m} onOpen={() => setOpen(false)} />) : (
                <p className="py-4 text-center">You haven&apos;t saved a playlist yet.</p>
              )}
              <p className="pt-2 text-sm text-text-light dark:text-darkmode-text-light">Your playlist opens in your music app, which plays it (and keeps playing with the screen off). Start it, then come back to Charge, and keep Charge open so the rest alert can sound.</p>
              <Link href="/settings?tab=app" className="block pt-1 text-center text-sm font-semibold underline" onClick={() => setOpen(false)}>{links.length ? "Manage my playlists" : "Add a playlist in Settings"}</Link>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** Settings: save and remove playlist links. */
export function MusicManager({ links }: { links: MusicItem[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const preview = url.trim() ? parseMusicUrl(url) : null;

  function add(e: React.FormEvent) {
    e.preventDefault(); setError("");
    start(async () => {
      const r = await addMusicLink({ title, url });
      if (!r.ok) { setError(r.error); return; }
      setTitle(""); setUrl(""); router.refresh();
    });
  }
  return (
    <div data-testid="music-manager">
      {links.length > 0 && (
        <ul className="mb-5 space-y-2" aria-label="Saved playlists">
          {links.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <div className="min-w-0 grow"><Row m={m} /></div>
              <button type="button" className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950" aria-label={`Remove ${m.title}`} disabled={pending}
                onClick={() => start(async () => { await removeMusicLink(m.id); router.refresh(); })}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      {links.length < MAX_MUSIC_LINKS ? (
        <form onSubmit={add} className="space-y-3" noValidate>
          <div>
            <label htmlFor="music-url" className="mb-1.5 block font-medium text-text-dark dark:text-darkmode-text-dark">Playlist link</label>
            <input id="music-url" className="form-input" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Paste the link from your music app's Share menu" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} aria-describedby="music-note" />
            <p id="music-note" className={`mt-1.5 text-sm ${error || (preview && !preview.ok) ? "font-medium text-red-700 dark:text-red-300" : "text-text-light dark:text-darkmode-text-light"}`}>
              {error || (preview && !preview.ok ? preview.error : preview?.ok ? `${MUSIC_KINDS[preview.kind].label} link. It will open in that app.` : "Works with Spotify, YouTube Music, Apple Music, Deezer, SoundCloud, Anghami and others.")}
            </p>
          </div>
          <div>
            <label htmlFor="music-title" className="mb-1.5 block font-medium text-text-dark dark:text-darkmode-text-dark">Name <span className="font-normal text-text-light dark:text-darkmode-text-light">(optional)</span></label>
            <input id="music-title" className="form-input" maxLength={40} placeholder="e.g. Leg day" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !url.trim()}>{pending ? "Saving…" : "Save playlist"}</button>
        </form>
      ) : <p className="text-sm">You have {MAX_MUSIC_LINKS} playlists, the most you can keep. Remove one to add another.</p>}
      <p className="mt-4 text-sm text-text-light dark:text-darkmode-text-light">Charge doesn&apos;t play or store any music. It only keeps these links, and your music app does the playing, so lock-screen controls and offline downloads work as usual.</p>
    </div>
  );
}
