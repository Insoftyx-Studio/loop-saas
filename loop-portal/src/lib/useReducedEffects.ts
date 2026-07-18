import { useEffect, useState } from "react";

const QUERIES = ["(prefers-reduced-motion: reduce)", "(max-width: 767px)"];

/**
 * True when we should skip scroll-linked animation work: phone-sized screens
 * or an explicit reduced-motion preference.
 *
 * Scroll-scrubbed values (parallax, per-word opacity) run on every scroll
 * frame. That's comfortable on a laptop but is a real frame budget on a
 * phone, where it reads as laggy scrolling. Components use this to render a
 * static equivalent instead.
 */
export function useReducedEffects(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return QUERIES.some((q) => window.matchMedia(q).matches);
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const mqls = QUERIES.map((q) => window.matchMedia(q));
    const update = () => setReduced(mqls.some((m) => m.matches));
    mqls.forEach((m) => m.addEventListener("change", update));
    update();
    return () => mqls.forEach((m) => m.removeEventListener("change", update));
  }, []);

  return reduced;
}
