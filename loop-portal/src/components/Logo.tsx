import { cn } from "../lib/cn";

export function Logo({
  size = 22,
  showText = true,
  className,
}: {
  size?: number;
  showText?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-ink", className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="3" opacity="0.28" />
        <path
          d="M16 5 a11 11 0 0 1 9.5 5.5"
          stroke="rgb(var(--accent))"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span className="text-[17px] font-semibold tracking-tightest">Loop</span>
      )}
    </span>
  );
}
