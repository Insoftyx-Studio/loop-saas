import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Password field with a reveal toggle. Shared by every screen that takes a
 * password (sign in, change password) so the affordance stays consistent —
 * and so the toggle only has to be got right once.
 */
export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function PasswordInput(props, ref) {
    const [show, setShow] = useState(false);
    const label = show ? "Hide password" : "Show password";
    return (
      <div className="relative">
        <input
          ref={ref}
          type={show ? "text" : "password"}
          className="w-full rounded-lg border border-edge bg-raised px-3.5 py-2.5 pr-11 text-[14px] outline-none transition-colors focus:border-accent"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={label}
          title={label}
          className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-ink-faint transition-colors hover:bg-sunk hover:text-ink-soft"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  },
);
