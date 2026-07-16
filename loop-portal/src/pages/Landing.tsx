import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  ArrowUpRight,
  Check,
  MessageSquare,
  FileCheck2,
  Sparkles,
  ReceiptText,
  Layers,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "../components/ui/Button";
import { LoopRing } from "../components/LoopRing";
import { Reveal, Item, fadeUp, easeOut } from "../components/motion";
import { cn } from "../lib/cn";

/* ---------------------------------------------------------------- */

function Nav() {
  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="glass flex w-full max-w-5xl items-center justify-between gap-4 rounded-full px-3 py-2 pl-5"
      >
        <Link to="/">
          <Logo />
        </Link>
        <div className="hidden items-center gap-7 text-[13.5px] text-ink-mute md:flex">
          <a className="transition-colors hover:text-ink" href="#loop">The loop</a>
          <a className="transition-colors hover:text-ink" href="#work">How it feels</a>
          <a className="transition-colors hover:text-ink" href="#pricing">Pricing</a>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login">
            <Button size="sm" className="rounded-full pl-4 pr-3.5">
              Open the demo <ArrowUpRight size={15} />
            </Button>
          </Link>
        </div>
      </motion.nav>
    </div>
  );
}

/* A small, honest mock of the branded client portal — the "screenshot
 * that sells." Shows the approval loop mid-flow. */
function PortalMock() {
  const accent = "196 108 58"; // Meridian Coffee's warm accent
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-edge bg-raised shadow-glow">
      <div aria-hidden className="bloom -right-8 -top-8 h-40 w-40" style={{ background: `rgb(${accent} / 0.35)` }} />
      {/* portal top bar */}
      <div className="flex items-center justify-between border-b border-edge px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-6 w-6 place-items-center rounded-md text-[11px] font-bold"
            style={{ background: `rgb(${accent} / 0.16)`, color: `rgb(${accent})` }}
          >
            MC
          </span>
          <span className="text-[13px] font-semibold">Meridian Coffee</span>
        </div>
        <span className="text-[11px] text-ink-faint">via Northwind Studio</span>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">Brand refresh</p>
          <p className="mt-1 font-display text-2xl leading-tight">On track, 2 of 4 milestones</p>
          <p className="mt-1 text-[13px] text-ink-mute">Packaging artwork lands next week.</p>
        </div>
        <LoopRing pct={0.5} size={72} accent={accent}>
          <span className="tnum text-[15px] font-semibold" style={{ color: `rgb(${accent})` }}>
            50%
          </span>
        </LoopRing>
      </div>

      {/* approval card */}
      <div className="mx-5 mb-5 rounded-lg border border-edge bg-paper p-4">
        <div className="flex items-start gap-3">
          <div
            className="h-14 w-14 shrink-0 rounded-md bg-cover bg-center"
            style={{
              backgroundImage: `url(https://picsum.photos/seed/coffeebag/200/200)`,
              filter: "grayscale(0.2) contrast(1.05)",
              outline: "1px solid rgb(0 0 0 / 0.1)",
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium">Packaging artwork — round 2</p>
            <p className="text-[12px] text-ink-faint">PDF · 14 pages · shared yesterday</p>
            <div className="mt-3 flex gap-2">
              <motion.span
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.4, ease: easeOut }}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-white"
                style={{ background: `rgb(${accent})` }}
              >
                <Check size={13} /> Approve
              </motion.span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-edge px-2.5 py-1.5 text-[12px] font-medium text-ink-soft">
                <MessageSquare size={13} /> Request changes
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <header ref={ref} className="relative mx-auto max-w-6xl px-5 pt-40 md:pt-48">
      {/* ambient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgb(var(--accent) / 0.10), transparent 70%)",
        }}
      />
      <div aria-hidden className="bloom left-[6%] top-[8%] h-64 w-64" style={{ background: "rgb(var(--accent) / 0.4)" }} />
      <div aria-hidden className="bloom right-[2%] top-[30%] h-72 w-72" style={{ background: "rgb(var(--progress) / 0.28)" }} />
      <motion.div style={{ y, opacity: fade }} className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-edge bg-raised px-3 py-1.5 text-[12.5px] text-ink-mute"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            One calm place for every client
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.05 }}
            className="max-w-2xl text-[clamp(2.6rem,5.4vw,4.4rem)] font-semibold leading-[0.98] tracking-tightest"
          >
            Stop drowning in{" "}
            <span className="font-display font-normal text-accent">status emails.</span> Keep
            clients in the loop.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.15 }}
            className="mt-6 max-w-md text-[15.5px] leading-relaxed text-ink-mute"
          >
            A branded portal where your clients see progress, approve work, and submit requests —
            instead of chaos across email, Slack, and Drive.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link to="/login">
              <Button size="lg" className="rounded-full shadow-glow">
                Explore as an agency <ArrowUpRight size={17} />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary" className="rounded-full">
                Explore as a client
              </Button>
            </Link>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-4 text-[12.5px] text-ink-faint"
          >
            No sign-up. Log in to either side and feel it.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: easeOut, delay: 0.2 }}
          className="relative"
        >
          <PortalMock />
        </motion.div>
      </motion.div>
    </header>
  );
}

/* ---------------------------------------------------------------- */

const features = [
  {
    icon: FileCheck2,
    title: "The approval loop",
    body: "Share a deliverable, the client approves or comments, and the status flips for you instantly. No more lost email threads.",
    span: "sm:col-span-3",
  },
  {
    icon: Layers,
    title: "A branded portal",
    body: "Each client logs into a clean view of their own engagement — under your logo and their accent color.",
    span: "sm:col-span-3",
  },
  {
    icon: Sparkles,
    title: "Weekly update, written for you",
    body: "One click turns the week's activity into a plain-English recap you can send.",
    span: "sm:col-span-2",
  },
  {
    icon: ReceiptText,
    title: "Invoices in view",
    body: "Paid, pending, overdue — at a glance, on both sides.",
    span: "sm:col-span-2",
  },
  {
    icon: MessageSquare,
    title: "Requests, queued",
    body: "Clients ask; you triage from one tidy list.",
    span: "sm:col-span-2",
  },
];

function Features() {
  return (
    <section id="work" className="mx-auto max-w-6xl px-5 py-28 md:py-40">
      <Reveal className="mb-14 max-w-2xl">
        <Item variants={fadeUp} className="text-[13px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          What it replaces
        </Item>
        <Item variants={fadeUp} className="mt-3 text-[clamp(1.8rem,3.4vw,2.8rem)] font-semibold leading-tight tracking-tight">
          Everything about the engagement, in one quiet place.
        </Item>
      </Reveal>

      <Reveal className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-6" amount={0.1}>
        {features.map((f) => (
          <Item
            key={f.title}
            variants={fadeUp}
            className={cn(
              "group flex flex-col justify-between rounded-lg border border-edge bg-raised p-6 transition-colors duration-300 hover:border-edge-strong",
              f.span,
            )}
          >
            <div className="mb-10 grid h-10 w-10 place-items-center rounded-md border border-edge bg-paper text-ink-soft transition-colors duration-300 group-hover:text-accent">
              <f.icon size={18} />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-mute">{f.body}</p>
            </div>
          </Item>
        ))}
      </Reveal>
    </section>
  );
}

/* Scroll-scrubbed statement — words brighten as you read. */
function Word({
  progress,
  range,
  children,
}: {
  progress: import("framer-motion").MotionValue<number>;
  range: [number, number];
  children: string;
}) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return <motion.span style={{ opacity }}>{children}</motion.span>;
}

function LoopStatement() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "start 0.35"] });
  const words =
    "The share, the review, the approval — that satisfying loop, closed in one place instead of ten emails.".split(
      " ",
    );
  return (
    <section id="loop" ref={ref} className="mx-auto max-w-4xl px-5 py-28 text-center md:py-40">
      <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-ink-faint">
        In the loop
      </p>
      <p className="mt-6 flex flex-wrap justify-center gap-x-[0.28em] gap-y-1 font-display text-[clamp(1.9rem,4.4vw,3.4rem)] leading-[1.12]">
        {words.map((w, i) => (
          <Word
            key={i}
            progress={scrollYProgress}
            range={[i / words.length, i / words.length + 1 / words.length]}
          >
            {w}
          </Word>
        ))}
      </p>
    </section>
  );
}

const stats = [
  { v: "24/7", l: "Clients see progress without asking" },
  { v: "1", l: "Place every approval lives, with a comment trail" },
  { v: "Hours → min", l: "To send a weekly client update" },
];

function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-28 md:pb-40">
      <Reveal className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Item
            key={s.l}
            variants={fadeUp}
            className="rounded-lg border border-edge bg-raised p-7"
          >
            <div className="tnum font-display text-[clamp(2.2rem,4vw,3rem)] leading-none text-ink">
              {s.v}
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-mute">{s.l}</p>
          </Item>
        ))}
      </Reveal>
    </section>
  );
}

function CTA() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-5 pb-28 md:pb-40">
      <Reveal>
        <Item
          variants={fadeUp}
          className="relative overflow-hidden rounded-2xl border border-edge bg-ink px-6 py-16 text-center text-paper md:py-24"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(50% 80% at 50% 0%, rgb(var(--accent) / 0.35), transparent 65%)",
            }}
          />
          <p className="relative text-[13px] font-medium uppercase tracking-[0.14em] text-paper/50">
            The one thing to remember
          </p>
          <h2 className="relative mx-auto mt-5 max-w-2xl text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-tight">
            Let a buyer log in and feel it.
          </h2>
          <p className="relative mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-paper/70">
            The agency dashboard on one side, the calm branded portal on the other. Two demo logins,
            no sign-up.
          </p>
          <div className="relative mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/login">
              <Button
                size="lg"
                className="rounded-full bg-paper text-ink hover:bg-paper/90"
              >
                Open the live demo <ArrowUpRight size={17} />
              </Button>
            </Link>
          </div>
        </Item>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-edge">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center">
        <Logo />
        <p className="text-[12.5px] text-ink-faint">
          A demonstration build · fictional agency, Northwind Studio.
        </p>
        <div className="flex gap-6 text-[13px] text-ink-mute">
          <a href="#loop" className="hover:text-ink">The loop</a>
          <a href="#pricing" className="hover:text-ink">Pricing</a>
          <Link to="/login" className="hover:text-ink">Demo</Link>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-full overflow-x-hidden"
    >
      <Nav />
      <Hero />
      <Features />
      <LoopStatement />
      <Stats />
      <CTA />
      <Footer />
    </motion.main>
  );
}
