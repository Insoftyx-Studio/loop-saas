import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type Origin = { x: number; y: number } | null;

type Ctx = {
  theme: Theme;
  toggle: (origin?: Origin) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

function readInitial(): Theme {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitial);

  const apply = useCallback((next: Theme) => {
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("loop-theme", next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  }, []);

  const toggle = useCallback(
    (origin?: Origin) => {
      const next: Theme = theme === "dark" ? "light" : "dark";
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

      // No View Transitions support (or reduced motion): fall back to the
      // token crossfade already wired on <body> — still smooth, never a flash.
      if (reduce || !(document as any).startViewTransition) {
        apply(next);
        return;
      }

      const x = origin?.x ?? window.innerWidth - 56;
      const y = origin?.y ?? 56;
      const end = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      const transition = (document as any).startViewTransition(() => apply(next));
      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`],
          },
          {
            duration: 620,
            easing: "cubic-bezier(0.23, 1, 0.32, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      });
    },
    [theme, apply],
  );

  // Keep in sync if the class is changed elsewhere.
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
