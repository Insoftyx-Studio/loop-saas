import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Card({
  className,
  children,
  as: As = "div",
  interactive,
  ...rest
}: {
  className?: string;
  children: ReactNode;
  as?: any;
  interactive?: boolean;
} & Record<string, any>) {
  return (
    <As
      className={cn(
        "rounded-lg border border-edge bg-raised",
        interactive &&
          "transition-[border-color,transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-edge-strong hover:shadow-lift",
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
}

export function Avatar({
  initials,
  accent,
  size = 36,
  className,
}: {
  initials: string;
  accent?: string; // "r g b"
  size?: number;
  className?: string;
}) {
  const style = accent
    ? { background: `rgb(${accent} / 0.14)`, color: `rgb(${accent})` }
    : undefined;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-semibold",
        !accent && "bg-sunk text-ink-soft",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36, ...style }}
    >
      {initials}
    </span>
  );
}

type Tone = "neutral" | "approved" | "pending" | "overdue" | "accent";

const toneStyles: Record<Tone, string> = {
  neutral: "text-ink-mute",
  approved: "text-approved",
  pending: "text-pending",
  overdue: "text-overdue",
  accent: "text-accent",
};
const toneDot: Record<Tone, string> = {
  neutral: "bg-ink-faint",
  approved: "bg-approved",
  pending: "bg-pending",
  overdue: "bg-overdue",
  accent: "bg-accent",
};

export function Pill({
  tone = "neutral",
  children,
  dot = true,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-edge bg-raised px-2.5 py-1 text-[12px] font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[tone])} />}
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="mono rounded border border-edge bg-sunk px-1.5 py-0.5 text-[11px] text-ink-mute">
      {children}
    </kbd>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint",
        className,
      )}
    >
      {children}
    </span>
  );
}
