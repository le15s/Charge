import Link from "next/link";

/** Charge wordmark: a small loaded-bar mark and the name in the display face. */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Charge home">
      <svg width="34" height="22" viewBox="0 0 34 22" aria-hidden="true" className="shrink-0">
        <rect x="0" y="10" width="34" height="2.4" rx="1.2" className="fill-text-dark dark:fill-darkmode-text-dark" />
        <rect x="6" y="2" width="4" height="18" rx="1.2" className="fill-primary dark:fill-darkmode-primary" />
        <rect x="11.5" y="5" width="3.5" height="12" rx="1.2" className="fill-plate-blue dark:fill-darkmode-plate-blue" />
        <rect x="24" y="2" width="4" height="18" rx="1.2" className="fill-primary dark:fill-darkmode-primary" />
        <rect x="19" y="5" width="3.5" height="12" rx="1.2" className="fill-plate-blue dark:fill-darkmode-plate-blue" />
      </svg>
      <span style={{ fontFamily: "var(--font-brand)" }} className="text-[1.7rem] font-black leading-none tracking-[0.01em] text-text-dark dark:text-darkmode-text-dark">Charge</span>
    </Link>
  );
}
