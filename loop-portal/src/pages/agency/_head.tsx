import type { ReactNode } from "react";

export function PageHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-[14px] text-ink-mute">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
