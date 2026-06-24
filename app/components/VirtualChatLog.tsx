import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Message } from "../logic/whatsapp";
import { MessageRow } from "./MessageRow";

/**
 * A "fake scroll" (virtualized) chat log.
 *
 * Only the handful of rows inside the viewport are mounted to the DOM at any
 * time, but the scroll container is padded to the full height of the chat so
 * the scrollbar behaves exactly like every message were rendered. Row heights
 * are variable (messages wrap), so each mounted row measures itself and feeds
 * its real height back into the offset table — no fixed-height assumption.
 *
 * A day rail on the side + a sticky date pill let you scrub through specific
 * days without leaving the stream.
 */

type Row =
  | { type: "day"; date: string }
  | { type: "msg"; m: Message; globalIndex: number };

const DAY_ESTIMATE = 44;
const MSG_ESTIMATE = 78;
const OVERSCAN = 8;

// Binary search: index of the last row whose top offset is <= target.
function findRow(offsets: number[], target: number): number {
  let lo = 0;
  let hi = offsets.length - 2; // offsets has rows.length + 1 entries
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= target) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function prettyDate(date: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function VirtualChatLog({
  messages,
  onJumpToDay,
  scrollToDate,
  onScrolledToDate,
}: {
  messages: Message[];
  /** Shown as a per-message action while searching; jumps to the full day. */
  onJumpToDay?: (date: string) => void;
  /** When set, the log scrolls this date to the top once (then reports back). */
  scrollToDate?: string | null;
  onScrolledToDate?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  // Flatten messages into a row list, injecting a day divider whenever the
  // date changes. Day dividers double as the scroll targets for navigation.
  const { rows, days, dayRowIndex } = useMemo(() => {
    const rows: Row[] = [];
    const days: string[] = [];
    const dayRowIndex = new Map<string, number>();
    let lastDate: string | null = null;
    messages.forEach((m, i) => {
      if (m.date !== lastDate) {
        dayRowIndex.set(m.date, rows.length);
        days.push(m.date);
        rows.push({ type: "day", date: m.date });
        lastDate = m.date;
      }
      rows.push({ type: "msg", m, globalIndex: i });
    });
    return { rows, days, dayRowIndex };
  }, [messages]);

  // Measured heights live in a ref so measuring doesn't re-render on its own;
  // we bump `tick` only when a measurement actually changes an offset. The
  // tick value also re-keys the offsets memo so it picks up new measurements.
  const sizes = useRef<number[]>([]);
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);

  // Reset measurements whenever the row set changes (new file, new search).
  useLayoutEffect(() => {
    sizes.current = new Array(rows.length);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      setScrollTop(0);
    }
    bump();
  }, [rows, bump]);

  const estimate = useCallback(
    (i: number) => (rows[i].type === "day" ? DAY_ESTIMATE : MSG_ESTIMATE),
    [rows],
  );

  // Cumulative top offsets. offsets[i] = top of row i, offsets[len] = total.
  const offsets = useMemo(() => {
    const arr = new Array(rows.length + 1);
    arr[0] = 0;
    for (let i = 0; i < rows.length; i++) {
      const h = sizes.current[i] ?? estimate(i);
      arr[i + 1] = arr[i] + h;
    }
    return arr;
    // `tick` bumps whenever a measured row height changes the table.
  }, [rows, estimate, tick]);

  const totalH = offsets[rows.length] ?? 0;

  const startIndex = Math.max(0, findRow(offsets, scrollTop) - OVERSCAN);
  const endIndex = Math.min(
    rows.length - 1,
    findRow(offsets, scrollTop + viewportH) + OVERSCAN,
  );

  // Callback ref that measures a mounted row and corrects the offset table.
  const measure = useCallback(
    (node: HTMLDivElement | null, index: number) => {
      if (!node) return;
      const h = node.getBoundingClientRect().height;
      if (Math.abs((sizes.current[index] ?? -1) - h) > 0.5) {
        sizes.current[index] = h;
        bump();
      }
    },
    [bump],
  );

  const onScroll = (e: React.UIEvent<HTMLDivElement>) =>
    setScrollTop(e.currentTarget.scrollTop);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    setViewportH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  // Which day is currently at the top of the viewport.
  const currentDate = rows.length
    ? rows[startIndex].type === "day"
      ? (rows[startIndex] as { date: string }).date
      : (rows[startIndex] as { m: Message }).m.date
    : null;

  const jumpToDate = useCallback(
    (date: string) => {
      const idx = dayRowIndex.get(date);
      if (idx == null || !scrollRef.current) return;
      scrollRef.current.scrollTo({ top: offsets[idx], behavior: "smooth" });
    },
    [dayRowIndex, offsets],
  );

  const stepDay = useCallback(
    (dir: -1 | 1) => {
      if (!currentDate) return;
      const i = days.indexOf(currentDate);
      const next = days[i + dir];
      if (next) jumpToDate(next);
    },
    [currentDate, days, jumpToDate],
  );

  // Keep the active day button visible in the rail.
  useLayoutEffect(() => {
    if (!currentDate || !railRef.current) return;
    const btn = railRef.current.querySelector<HTMLElement>(
      `[data-date="${CSS.escape(currentDate)}"]`,
    );
    btn?.scrollIntoView({ block: "nearest" });
  }, [currentDate]);

  // Consume an external "scroll to this day" request exactly once. We stash it
  // in a ref so the measurement-driven re-renders (which change `offsets`)
  // don't make us re-scroll and fight the user. We jump, flash the divider,
  // then report back so the parent can clear its request.
  const pendingScroll = useRef<string | null>(null);
  const [flashDate, setFlashDate] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (scrollToDate) pendingScroll.current = scrollToDate;
  }, [scrollToDate]);
  useLayoutEffect(() => {
    const date = pendingScroll.current;
    if (!date) return;
    const idx = dayRowIndex.get(date);
    if (idx == null) return; // target day isn't in the current row set (yet)
    scrollRef.current?.scrollTo({ top: offsets[idx] });
    pendingScroll.current = null;
    setFlashDate(date);
    onScrolledToDate?.();
  });
  useLayoutEffect(() => {
    if (!flashDate) return;
    const t = setTimeout(() => setFlashDate(null), 1800);
    return () => clearTimeout(t);
  }, [flashDate]);

  const visible = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const row = rows[i];
    const top = offsets[i];
    if (row.type === "day") {
      visible.push(
        <div
          key={`day-${i}`}
          ref={(n) => measure(n, i)}
          className="absolute left-0 right-0 px-6 flex justify-center"
          style={{ top }}
        >
          <span
            className={`my-2 px-4 py-1 rounded-full border text-[11px] font-black uppercase tracking-widest transition-colors duration-500 ${
              row.date === flashDate
                ? "bg-green-600/30 border-green-500 text-green-300"
                : "bg-black/60 border-gray-700/60 text-gray-400"
            }`}
          >
            {prettyDate(row.date)}
          </span>
        </div>,
      );
    } else {
      visible.push(
        <div
          key={`msg-${row.globalIndex}`}
          ref={(n) => measure(n, i)}
          className="group/jump absolute left-0 right-0 px-6 py-1.5"
          style={{ top }}
        >
          <MessageRow m={row.m} />
          {onJumpToDay && (
            <button
              onClick={() => onJumpToDay(row.m.date)}
              className="absolute top-1.5 right-6 opacity-0 group-hover/jump:opacity-100 focus:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-700/50 hover:bg-green-500/20 px-2.5 py-1 rounded-lg"
              title={`Jump to ${row.m.date} in the full chat`}
            >
              View in chat →
            </button>
          )}
        </div>,
      );
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 font-medium">
        No messages match your filter.
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* Day rail */}
      <div
        ref={railRef}
        className="hidden md:flex flex-col w-40 shrink-0 border-r border-gray-800 overflow-y-auto custom-scrollbar py-2"
      >
        {days.map((d) => {
          const active = d === currentDate;
          return (
            <button
              key={d}
              data-date={d}
              onClick={() => jumpToDate(d)}
              className={`text-left px-4 py-2 text-xs font-bold transition-colors border-l-2 ${
                active
                  ? "border-green-500 text-green-400 bg-green-500/10"
                  : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/40"
              }`}
            >
              {prettyDate(d)}
            </button>
          );
        })}
      </div>

      {/* Stream */}
      <div className="flex-1 relative min-w-0">
        {/* Sticky current-day pill + day stepper */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 pointer-events-none">
          <button
            onClick={() => stepDay(-1)}
            className="pointer-events-auto w-7 h-7 flex items-center justify-center rounded-full bg-gray-800/90 border border-gray-700 text-gray-400 hover:text-white backdrop-blur transition-colors"
            title="Previous day"
          >
            ‹
          </button>
          <span className="px-4 py-1.5 rounded-full bg-gray-800/90 border border-gray-700 text-xs font-black uppercase tracking-widest text-green-400 backdrop-blur shadow-lg">
            {currentDate ? prettyDate(currentDate) : ""}
          </span>
          <button
            onClick={() => stepDay(1)}
            className="pointer-events-auto w-7 h-7 flex items-center justify-center rounded-full bg-gray-800/90 border border-gray-700 text-gray-400 hover:text-white backdrop-blur transition-colors"
            title="Next day"
          >
            ›
          </button>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="absolute inset-0 overflow-y-auto custom-scrollbar"
        >
          <div style={{ height: totalH, position: "relative" }}>{visible}</div>
        </div>
      </div>
    </div>
  );
}
