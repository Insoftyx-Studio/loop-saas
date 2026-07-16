import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MessageSquare, CornerDownLeft } from "lucide-react";
import type { Deliverable, Role } from "../lib/data";
import { useStore } from "../lib/store";
import { Thumb, DeliverablePill } from "./status";
import { Avatar } from "./ui/primitives";
import { Textarea } from "./ui/Field";
import { Button } from "./ui/Button";
import { timeAgo } from "../lib/data";
import { easeOut } from "./motion";

export function DeliverableReview({
  deliverable,
  role,
  author,
  accent,
}: {
  deliverable: Deliverable;
  role: Role;
  author: string;
  accent?: string;
}) {
  const { db, setDeliverableStatus, addComment } = useStore();
  const comments = db.comments
    .filter((c) => c.deliverableId === deliverable.id)
    .sort((a, b) => +new Date(a.at) - +new Date(b.at));
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<null | "changes">(null);
  const [celebrate, setCelebrate] = useState(false);
  const col = accent ? `rgb(${accent})` : "rgb(var(--accent))";

  const isClient = role === "client";

  const approve = () => {
    setDeliverableStatus(deliverable.id, "approved");
    if (draft.trim()) {
      addComment(deliverable.id, draft.trim(), role, author);
      setDraft("");
    }
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 1600);
  };

  const requestChanges = () => {
    if (!draft.trim()) {
      setMode("changes");
      return;
    }
    addComment(deliverable.id, draft.trim(), role, author);
    setDeliverableStatus(deliverable.id, "changes_requested");
    setDraft("");
    setMode(null);
  };

  const reply = () => {
    if (!draft.trim()) return;
    addComment(deliverable.id, draft.trim(), role, author);
    setDraft("");
  };

  return (
    <div className="relative flex h-full flex-col">
      {/* celebration overlay */}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-paper/70 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, ease: easeOut }}
              className="grid place-items-center"
            >
              <svg width="76" height="76" viewBox="0 0 76 76">
                <motion.circle
                  cx="38" cy="38" r="34" fill="none" stroke={col} strokeWidth="3"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: easeOut }}
                  style={{ rotate: -90, transformOrigin: "center" }}
                />
                <motion.path
                  d="M25 39 L34 48 L52 29" fill="none" stroke={col} strokeWidth="3.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.35, ease: easeOut, delay: 0.35 }}
                />
              </svg>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-3 text-[14px] font-semibold"
              >
                Approved
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* preview */}
      <div className="border-b border-edge p-5">
        <div className="flex gap-4">
          <Thumb seed={deliverable.thumbSeed} size={72} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold leading-tight">{deliverable.title}</h2>
            <p className="mt-1 text-[12.5px] text-ink-faint">
              {deliverable.kind} · shared {timeAgo(deliverable.sharedAt)}
            </p>
            <div className="mt-2.5">
              <DeliverablePill status={deliverable.status} />
            </div>
          </div>
        </div>
      </div>

      {/* thread */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
          Conversation
        </p>
        {comments.length === 0 && (
          <p className="text-[13px] text-ink-mute">
            No comments yet. {isClient ? "Approve, or leave a note if something needs changing." : "Waiting on the client to review."}
          </p>
        )}
        {comments.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="flex gap-3"
          >
            <Avatar
              initials={c.author.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              accent={c.role === "client" ? accent : undefined}
              size={30}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px]">
                <span className="font-semibold">{c.author}</span>{" "}
                <span className="text-ink-faint">
                  · {c.role === "client" ? "Client" : "Northwind"} · {timeAgo(c.at)}
                </span>
              </p>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-soft">{c.body}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* actions */}
      <div className="border-t border-edge p-4">
        <Textarea
          rows={mode === "changes" ? 3 : 2}
          placeholder={
            isClient
              ? deliverable.status === "approved"
                ? "Add a note…"
                : "Add a comment, or request changes with details…"
              : "Reply to the client…"
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="mt-2.5 flex items-center justify-end gap-2">
          {isClient && deliverable.status !== "approved" ? (
            <>
              <Button variant="outline" size="sm" onClick={requestChanges}>
                <MessageSquare size={14} /> Request changes
              </Button>
              <Button
                size="sm"
                onClick={approve}
                style={{ background: col, color: "#fff" }}
                className="shadow-ring"
              >
                <Check size={15} /> Approve
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={reply} disabled={!draft.trim()}>
              <CornerDownLeft size={14} /> Send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
