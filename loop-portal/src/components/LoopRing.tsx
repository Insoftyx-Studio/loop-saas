import { motion } from "framer-motion";
import { cn } from "../lib/cn";

/**
 * The signature. A "loop" that draws itself to the project's progress.
 * Track sits on the edge tone; the arc is the brand/accent. The small
 * cap dot at the arc head makes the loop feel alive rather than plotted.
 */
export function LoopRing({
  pct,
  size = 68,
  stroke = 5,
  accent,
  children,
  className,
  delay = 0,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  accent?: string; // "r g b"; defaults to --accent
  children?: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = Math.max(0.0001, Math.min(1, pct));
  const col = accent ? `rgb(${accent})` : "rgb(var(--accent))";
  const glow = accent ? `rgb(${accent} / 0.5)` : "rgb(var(--accent) / 0.5)";
  const headAngle = -90 + arc * 360;
  const headX = size / 2 + r * Math.cos((headAngle * Math.PI) / 180);
  const headY = size / 2 + r * Math.sin((headAngle * Math.PI) / 180);

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--edge-strong))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - arc) }}
          viewport={{ once: true }}
          transition={{ duration: 1.05, ease: [0.23, 1, 0.32, 1], delay }}
          style={{ filter: `drop-shadow(0 0 5px ${glow})` }}
        />
      </svg>
      {arc > 0.03 && arc < 0.995 && (
        <motion.span
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{ background: col, left: headX - 3, top: headY - 3 }}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: delay + 1.0, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        />
      )}
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
