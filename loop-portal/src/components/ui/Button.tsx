import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium select-none " +
  "transition-colors duration-150 ease-out disabled:opacity-40 disabled:pointer-events-none " +
  "whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-soft shadow-ring",
  secondary: "bg-raised text-ink border border-edge hover:border-edge-strong shadow-lift",
  outline: "border border-edge text-ink hover:bg-sunk",
  ghost: "text-ink-soft hover:text-ink hover:bg-sunk",
  danger: "bg-overdue text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-sm",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-12 px-6 text-[15px] rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", block, className, children, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
      className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
      {...props}
    >
      {children}
    </motion.button>
  );
});
