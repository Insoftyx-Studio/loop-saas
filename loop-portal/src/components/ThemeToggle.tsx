import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";
import { cn } from "../lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Switch to light" : "Switch to dark"}
      onClick={(e) => toggle({ x: e.clientX, y: e.clientY })}
      className={cn(
        "relative grid h-9 w-9 place-items-center rounded-md border border-edge bg-raised text-ink-soft",
        "transition-colors duration-150 ease-out hover:text-ink hover:border-edge-strong active:scale-[0.96]",
        className,
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          exit={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          className="absolute"
        >
          {isDark ? <Moon size={17} /> : <Sun size={17} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
