import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { easeOut } from "../motion";

export type SelectOption = {
  value: string;
  label: string;
  /** name of a CSS colour token (e.g. "approved") → shown as a status dot */
  tone?: string;
};

/**
 * Themed, animated single-select. Replaces the native <select> so status
 * pickers match the app's surfaces and open with a soft spring instead of
 * the OS's rigid dropdown.
 */
export function Select({
  value,
  options,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dot = (tone?: string) =>
    tone ? { background: `rgb(var(--${tone}))`, boxShadow: `0 0 6px rgb(var(--${tone}) / 0.7)` } : undefined;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-edge bg-raised py-1.5 pl-2.5 pr-2 text-[12.5px] font-medium text-ink-soft",
          "transition-colors duration-150 hover:border-edge-strong hover:text-ink",
          open && "border-edge-strong",
        )}
      >
        {current?.tone && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={dot(current.tone)} />}
        <span>{current?.label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2, ease: easeOut }} className="grid">
          <ChevronDown size={13} className="text-ink-faint" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: easeOut }}
            className="absolute right-0 z-40 mt-1.5 min-w-[10rem] origin-top-right overflow-hidden rounded-lg border border-edge bg-raised p-1 shadow-pop"
          >
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-150",
                    o.value === value ? "bg-sunk text-ink" : "text-ink-soft hover:bg-sunk/60 hover:text-ink",
                  )}
                >
                  {o.tone && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={dot(o.tone)} />}
                  <span className="flex-1 text-left">{o.label}</span>
                  {o.value === value && <Check size={14} className="shrink-0 text-accent" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
