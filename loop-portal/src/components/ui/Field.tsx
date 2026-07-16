import { forwardRef } from "react";
import { cn } from "../../lib/cn";

const field =
  "w-full rounded-md border border-edge bg-sunk px-3 text-sm text-ink placeholder:text-ink-faint " +
  "transition-colors duration-150 ease-out focus:border-accent focus:bg-raised focus:outline-none " +
  "focus:ring-2 focus:ring-accent/25";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(field, "h-10", className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(field, "py-2.5 leading-relaxed", className)} {...props} />;
});

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[13px] font-medium text-ink-soft">{children}</label>;
}
