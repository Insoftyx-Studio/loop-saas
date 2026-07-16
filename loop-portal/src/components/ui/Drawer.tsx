import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { easeOut } from "../motion";

export function Drawer({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.34, ease: easeOut }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-edge bg-paper shadow-pop"
          >
            <div className="flex items-center justify-between border-b border-edge px-5 py-3.5">
              <p className="text-[13px] font-medium text-ink-mute">{title}</p>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-md text-ink-mute transition-colors hover:bg-sunk hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
