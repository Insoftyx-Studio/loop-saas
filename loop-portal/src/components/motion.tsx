import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export const easeOut = [0.23, 1, 0.32, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
};

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

/** Staggers direct children on scroll-in. Children should use `fadeUp`. */
export function Reveal({
  children,
  className,
  once = true,
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  once?: boolean;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
    >
      {children}
    </motion.div>
  );
}

export const Item = motion.div;
