import {
  useState,
  useMemo,
  useDeferredValue,
  useTransition,
  type ChangeEvent,
  useRef,
  memo,
  useCallback,
  useEffect,
} from "react";
import { BlobReader } from "@zip.js/zip.js";
import { ZipReader, TextWriter } from "@zip.js/zip.js";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { 
  type Message, 
  parseWhatsAppChat, 
  calculateBasicStats, 
  calculateDeepStats, 
  MINIMUM_EMOJI_OCCURRENCE
} from "../logic/whatsapp";

export function meta({}) {
  return [
    { title: "Whats my Stats? - WhatsApp Chat Analytics" },
    {
      name: "description",
      content:
        "Analyze your WhatsApp chats on the fly by uploading a Chat Export.",
    },
  ];
}

// 1. Memoized component for row performance
const MessageRow = memo(({ m }: { m: Message }) => (
  <div
    className={`group flex flex-col ${m.isSystem ? "items-center py-2" : "items-start"}`}
  >
    {!m.isSystem && (
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-black text-green-500 tracking-wide uppercase">
          {m.sender}
        </span>
        <span className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
          {m.date} {m.time}
        </span>
      </div>
    )}
    <div
      className={`${m.isSystem ? "bg-gray-800/50 text-gray-500 text-[11px] px-4 py-1.5" : "bg-gray-800 text-gray-200 px-5 py-3"} rounded-2xl max-w-[85%] whitespace-pre-wrap leading-relaxed border border-transparent hover:border-gray-700 transition-colors`}
    >
      {m.content}
    </div>
  </div>
));
MessageRow.displayName = "MessageRow";

export default function Stats() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"idle" | "parsing" | "ready">("idle");
  // Modal state for streak/active days info
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showActiveDaysModal, setShowActiveDaysModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "chatlog" | "deep">(
    "overview",
  );
  const [showLogWarning, setShowLogWarning] = useState(false); // Warning state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayLogDate, setDayLogDate] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement> | File) => {
    let file: File | undefined;
    if (e instanceof File) {
      file = e;
    } else {
      file = e.target.files?.[0];
    }
    if (!file) return;

    setStatus("parsing");
    try {
      // Read the zip file using zip.js
      const zipFileReader = new BlobReader(file);
      const zipReader = new ZipReader(zipFileReader);
      const entries = await zipReader.getEntries();
      const txtEntry = entries.find((entry) => entry.filename.endsWith(".txt"));
      if (!txtEntry) throw new Error("No .txt file found in ZIP");

      const textWriter = new TextWriter();
      const content = await (txtEntry as any).getData(textWriter);
      await zipReader.close();

      parseData(content);
    } catch (err) {
      console.error(err);
      setStatus("idle");
    }
  };

  // Drag and drop handlers
  const handleDrag = (
    e: React.DragEvent<HTMLLabelElement | HTMLDivElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (
    e: React.DragEvent<HTMLLabelElement | HTMLDivElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Intercept tab switching
  const handleTabChange = (tab: "overview" | "chatlog" | "deep") => {
    if (tab === "chatlog" && messages.length > 5000) {
      setShowLogWarning(true);
    } else {
      setActiveTab(tab);
    }
  };

  const parseData = (text: string) => {
    const parsed = parseWhatsAppChat(text);
    setMessages(parsed);
    setStatus("ready");
  };

  const showLogsForDate = (date: string) => {
    setDayLogDate(date);
  };

  const stats = useMemo(() => {
    return calculateBasicStats(messages);
  }, [messages]);

  const filteredMessages = useMemo(() => {
    // Optimization: Don't compute filter unless tab is active
    if (activeTab !== "chatlog") return [];

    let filtered = messages;
    if (selectedDate) {
      filtered = filtered.filter((m) => m.date === selectedDate);
    }

    const term = deferredSearchTerm.trim().toLowerCase();
    if (!term) return filtered;
    return filtered.filter(
      (m) =>
        m.content.toLowerCase().includes(term) ||
        m.sender.toLowerCase().includes(term),
    );
  }, [messages, deferredSearchTerm, activeTab, selectedDate]);

  // 1. Calculate Deep Stats
  const deepStats = useMemo(() => {
    return calculateDeepStats(messages);
  }, [messages]);

  // Find first and last message for streak and active days
  const streakInfo = useMemo(() => {
    if (!deepStats || messages.length === 0) return null;
    // Find the sorted unique dates
    const nonSystem = messages.filter((m) => !m.isSystem);
    const dateMap = new Map();
    nonSystem.forEach((m, i) => {
      if (!dateMap.has(m.date)) dateMap.set(m.date, i);
    });
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    // Find the longest streak of consecutive days
    let maxStreak = 0, currStreak = 0, streakStartIdx = 0, streakEndIdx = 0, tempStartIdx = 0;
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0 || (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i-1]).getTime()) === 86400000) {
        currStreak++;
        if (currStreak === 1) tempStartIdx = i;
        if (currStreak > maxStreak) {
          maxStreak = currStreak;
          streakStartIdx = tempStartIdx;
          streakEndIdx = i;
        }
      } else {
        currStreak = 1;
        tempStartIdx = i;
      }
    }
    // Find first and last message for the streak
    const streakStartDate = sortedDates[streakStartIdx];
    const streakEndDate = sortedDates[streakEndIdx];
    const firstMsg = nonSystem.find((m) => m.date === streakStartDate);
    const lastMsg = [...nonSystem].reverse().find((m) => m.date === streakEndDate);
    return { firstMsg, lastMsg };
  }, [deepStats, messages]);

  const activeDaysInfo = useMemo(() => {
    if (!deepStats || messages.length === 0) return null;
    const nonSystem = messages.filter((m) => !m.isSystem);
    const sorted = [...nonSystem].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return { firstMsg: sorted[0], lastMsg: sorted[sorted.length - 1] };
  }, [deepStats, messages]);

  const chartOptions: ApexOptions = {
    chart: {
        type: "area",
        toolbar: { show: false },
        background: "transparent",
    },
    theme: { mode: "dark" },
    stroke: { curve: "smooth", colors: ["#22c55e"] },
    fill: {
        type: "gradient",
        gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.3,
            stops: [0, 90, 100],
            colorStops: [ {color: "#22c55e", offset: 0, opacity: 0.5}, {color: "#22c55e", offset: 100, opacity: 0} ]
        }
    },
    dataLabels: { enabled: false },
    xaxis: {
        categories: deepStats?.graphCategories || [],
        labels: { show: false }, // Hide labels if too many
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false }
    },
    grid: { borderColor: "#374151" },
    tooltip: { theme: "dark" }
  };

  if (status !== "ready") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 text-center">
        <div
          className={`max-w-xl bg-gray-900 border border-gray-800 p-12 rounded-[2.5rem] shadow-2xl relative transition-all ${
            dragActive ? "ring-4 ring-green-600/40 border-green-600" : ""
          }`}
          onDragEnter={handleDrag}
        >
          <h1 className="text-4xl font-black text-gray-200 mb-4">
            Upload Chat Archive
          </h1>
          <p className="text-gray-400 mb-8">
            Select the .zip file exported from your WhatsApp chat (Android
            format).
          </p>

          <input
            type="file"
            accept=".zip"
            onChange={handleFileUpload}
            className="hidden"
            id="chat-upload"
            disabled={status === "parsing"}
            ref={inputRef}
          />
          <label
            htmlFor="chat-upload"
            className={`inline-block cursor-pointer px-12 py-4 bg-green-600 text-white font-bold text-lg rounded-2xl hover:bg-green-700 transition-all hover:shadow-green-900/20 active:scale-95`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            tabIndex={0}
          >
            {status === "parsing"
              ? "Parsing Logs..."
              : "Select ZIP File or Drag & Drop"}
          </label>
          {dragActive && (
            <div
              className="absolute inset-0 bg-black/60 rounded-[2.5rem] flex items-center justify-center pointer-events-none z-10"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <span className="text-2xl text-green-500 font-bold">
                Drop file here...
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-gray-300 p-4 md:p-8 relative">
      {/* Warning Modal */}
      {showLogWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-red-900/50 p-8 rounded-3xl max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black text-red-500 mb-2">
              Heavy Load Warning
            </h3>
            <p className="text-gray-400 mb-6">
              You are about to render{" "}
              <span className="text-white font-bold">
                {messages.length.toLocaleString()}
              </span>{" "}
              messages. This might freeze your browser for a moment.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLogWarning(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogWarning(false);
                  setActiveTab("chatlog");
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600/20 text-red-500 font-bold hover:bg-red-600/30 transition border border-red-900"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Chat <span className="text-green-600">Analytics</span>
            </h1>
            <p className="text-sm text-gray-500">
              {messages.length.toLocaleString()} messages processed
            </p>
          </div>
          <div className="flex bg-gray-900 p-1.5 rounded-2xl border border-gray-800">
            {(["overview", "chatlog", "deep"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"}`}
              >
                {tab === "overview"
                  ? "Overview"
                  : tab === "chatlog"
                    ? "Chat Log"
                    : "Deep Stats"}
              </button>
            ))}
          </div>
        </header>

        {activeTab === "overview" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800">
                <span className="text-gray-500 font-bold uppercase tracking-wider text-xs">
                  Total Messages
                </span>
                <h3 className="text-5xl font-black text-white mt-2">
                  {messages.length.toLocaleString()}
                </h3>
              </div>
              {stats.map(([sender, count]) => (
                <div
                  key={sender}
                  className="bg-gray-900 p-8 rounded-3xl border border-gray-800 border-l-4 border-l-green-600"
                >
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-xs">
                    {sender}
                  </span>
                  <h3 className="text-5xl font-black text-green-500 mt-2">
                    {count.toLocaleString()}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2 font-medium">
                    {((count / messages.length) * 100).toFixed(1)}% of activity
                  </p>
                </div>
              ))}
            </div>
            <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 border-l-4 border-l-green-600 mt-8">
              <span className="text-gray-300 font-bold uppercase tracking-wider text-xl">
                Need more Stats?
              </span>
              <h3 className="text-5xl font-black text-green-500 mt-2">🤔</h3>
              <p className="text-sm text-gray-400 mt-2 font-medium">
                More insights are available in the Deep Stats tab!
              </p>
              <button
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition"
                onClick={() => setActiveTab("deep")}
              >
                Switch to Deep Stats
              </button>
            </div>
          </div>
        )}

        {activeTab === "chatlog" && (
          <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden flex flex-col h-[75vh]">
            <div className="p-6 border-b border-gray-800 space-y-4">
              {selectedDate && (
                <div className="flex items-center justify-between bg-green-600/10 border border-green-600/20 px-4 py-2 rounded-xl">
                  <span className="text-sm font-bold text-green-500">
                    Showing messages from: {selectedDate}
                  </span>
                  <button 
                    onClick={() => setSelectedDate(null)}
                    className="text-xs font-black text-green-500 hover:text-green-400 uppercase tracking-widest"
                  >
                    Clear Filter
                  </button>
                </div>
              )}
              <input
                type="text"
                placeholder="Search keywords or users..."
                className="w-full bg-black border border-gray-700 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-green-600/50 transition-all font-medium"
                value={searchTerm}
                onChange={(e) =>
                  startTransition(() => {
                    setSearchTerm(e.target.value);
                    if (e.target.value) setSelectedDate(null); // Optional: clear date filter when searching
                  })
                }
              />
              {isPending && (
                <p className="text-xs text-green-400 mt-2">Updating results…</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {filteredMessages.map((m, i) => (
                <MessageRow key={i} m={m} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "deep" && deepStats && (
          <div className="space-y-6">
            {/* Top Row: Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 relative">
                <h4 className="text-gray-500 text-xs font-bold uppercase">Longest Day Streak</h4>
                <p className="text-4xl font-black text-white mt-2">{deepStats.maxDaysStreak} <span className="text-lg text-gray-600">days</span></p>
                <button
                  className="absolute bottom-4 right-4 text-xs px-3 py-1 bg-gray-800 text-green-400 rounded-full border border-green-700 hover:bg-green-900/60 transition"
                  onClick={() => setShowStreakModal(true)}
                  title="Show streak details"
                >
                  Info
                </button>
              </div>
              <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 relative">
                <h4 className="text-gray-500 text-xs font-bold uppercase">Total Active Days</h4>
                <p className="text-4xl font-black text-white mt-2">{deepStats.totalActiveDays} <span className="text-lg text-gray-600">days</span></p>
                <button
                  className="absolute bottom-4 right-4 text-xs px-3 py-1 bg-gray-800 text-green-400 rounded-full border border-green-700 hover:bg-green-900/60 transition"
                  onClick={() => setShowActiveDaysModal(true)}
                  title="Show active days details"
                >
                  Info
                </button>
              </div>
                    {/* Longest Day Streak Modal */}
                    {showStreakModal && streakInfo && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-gray-900 border border-green-900/50 p-8 rounded-3xl max-w-md w-full shadow-2xl relative">
                          <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold"
                            onClick={() => setShowStreakModal(false)}
                            aria-label="Close"
                          >×</button>
                          <h3 className="text-2xl font-black text-green-500 mb-2">Longest Day Streak</h3>
                          <div className="text-gray-300 text-sm mb-4">First and last message of the streak:</div>
                          <div className="mb-4">
                            <div className="mb-2">
                              <span className="font-bold text-green-400">Start:</span> {streakInfo.firstMsg?.date} {streakInfo.firstMsg?.time} — <span className="font-semibold">{streakInfo.firstMsg?.sender}</span>
                              <div className="bg-gray-800 text-gray-200 rounded-xl px-4 py-2 mt-1 text-xs">{streakInfo.firstMsg?.content}</div>
                            </div>
                            <div>
                              <span className="font-bold text-green-400">End:</span> {streakInfo.lastMsg?.date} {streakInfo.lastMsg?.time} — <span className="font-semibold">{streakInfo.lastMsg?.sender}</span>
                              <div className="bg-gray-800 text-gray-200 rounded-xl px-4 py-2 mt-1 text-xs">{streakInfo.lastMsg?.content}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Total Active Days Modal */}
                    {showActiveDaysModal && activeDaysInfo && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-gray-900 border border-green-900/50 p-8 rounded-3xl max-w-md w-full shadow-2xl relative">
                          <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold"
                            onClick={() => setShowActiveDaysModal(false)}
                            aria-label="Close"
                          >×</button>
                          <h3 className="text-2xl font-black text-green-500 mb-2">Total Active Days</h3>
                          <div className="text-gray-300 text-sm mb-4">First and last message in the chat:</div>
                          <div className="mb-4">
                            <div className="mb-2">
                              <span className="font-bold text-green-400">First:</span> {activeDaysInfo.firstMsg?.date} {activeDaysInfo.firstMsg?.time} — <span className="font-semibold">{activeDaysInfo.firstMsg?.sender}</span>
                              <div className="bg-gray-800 text-gray-200 rounded-xl px-4 py-2 mt-1 text-xs">{activeDaysInfo.firstMsg?.content}</div>
                            </div>
                            <div>
                              <span className="font-bold text-green-400">Last:</span> {activeDaysInfo.lastMsg?.date} {activeDaysInfo.lastMsg?.time} — <span className="font-semibold">{activeDaysInfo.lastMsg?.sender}</span>
                              <div className="bg-gray-800 text-gray-200 rounded-xl px-4 py-2 mt-1 text-xs">{activeDaysInfo.lastMsg?.content}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Day Log Modal */}
                    {dayLogDate && (
                      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                        <div className="bg-gray-900 border border-gray-800 p-0 rounded-[2rem] max-w-2xl w-full h-[85vh] shadow-2xl relative flex flex-col overflow-hidden">
                          <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 sticky top-0 z-10">
                            <div>
                              <h3 className="text-xl font-black text-white">Daily Logs</h3>
                              <p className="text-sm text-green-500 font-bold">{dayLogDate}</p>
                            </div>
                            <button
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white transition-colors"
                              onClick={() => setDayLogDate(null)}
                            >×</button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {messages
                              .filter((m) => m.date === dayLogDate)
                              .map((m, i) => (
                                <MessageRow key={i} m={m} />
                              ))}
                          </div>
                          <div className="p-4 border-t border-gray-800 text-center">
                            <button
                              className="px-8 py-2 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition"
                              onClick={() => setDayLogDate(null)}
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
               <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800">
                  <h4 className="text-gray-500 text-xs font-bold uppercase">Total Words</h4>
                  <p className="text-4xl font-black text-green-500 mt-2">{(deepStats.totalWords / 1000).toFixed(1)}k</p>
               </div>
               <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800">
                  <h4 className="text-gray-500 text-xs font-bold uppercase">Media Shared</h4>
                  <p className="text-4xl font-black text-blue-500 mt-2">{deepStats.totalMedia}</p>
               </div>
            </div>

            {/* Chat Stat Card */}
            <div className="bg-gray-900 p-8 rounded-[2rem] border border-gray-800 border-t-4 border-t-green-600">
              <div className="flex flex-col md:flex-row justify-between gap-8">
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-white mb-2">Whole Chat Summary</h3>
                  <p className="text-gray-500 text-sm mb-6">Aggregate insights across all participants.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 bg-gray-800/40 rounded-2xl border border-gray-700/50">
                      <div className="text-xs text-gray-500 uppercase font-black tracking-widest mb-1">Most Significant Word</div>
                      <div className="text-3xl font-black text-green-500">
                        "{deepStats.mostSaidWord?.word}"
                        <span className="text-sm font-bold text-gray-500 ml-2">({deepStats.mostSaidWord?.count})</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">Excl. common stopwords and short words.</p>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 uppercase font-black tracking-widest mb-3">Top 3 Most Active Days</div>
                      <div className="space-y-2">
                        {deepStats.topDays?.map((day, i) => (
                          <div key={day.date} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-gray-800">
                            <div>
                              <span className="text-sm font-bold text-gray-200">{day.date}</span>
                              <span className="ml-2 text-xs text-gray-500">{day.count} messages</span>
                            </div>
                            <button 
                              onClick={() => showLogsForDate(day.date)}
                              className="text-[10px] font-black text-green-500 hover:text-green-400 uppercase tracking-tighter bg-green-500/10 px-2 py-1 rounded-md transition-colors"
                            >
                              Show Logs
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* Time of Day Bar Graph */}
              <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800">
                <h3 className="text-xl font-bold text-white">Time of Day Activity</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Wonder when you're most active? Hover over each bar to see the exact message count and your top chat buddy during that time slot!
                </p>
                <div className="flex gap-6 items-end h-40">
                  {deepStats.timeOfDayBars?.map((bar, i) => (
                    <div key={bar.label} className="flex flex-col items-center group relative flex-1">
                      <div
                        className="w-10 rounded-t-xl bg-green-600/80 transition-all duration-300 cursor-pointer relative"
                        style={{ height: `${bar.total === 0 ? 8 : 32 + (bar.total / (Math.max(...deepStats.timeOfDayBars.map(b => b.total)) || 1)) * 120}px` }}
                      >
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs text-gray-300 font-bold select-none">
                          {bar.total}
                        </span>
                      </div>
                      <span className="mt-2 text-sm text-gray-200 font-bold">{bar.label}</span>
                      {/* Tooltip */}
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-10 hidden group-hover:flex flex-col items-center">
                        <div className="bg-gray-800 text-gray-100 text-xs rounded-lg px-4 py-2 shadow-lg border border-gray-700 whitespace-nowrap">
                          {Object.entries(bar.totals).length === 0 ? (
                            <span>No messages</span>
                          ) : (
                            Object.entries(bar.totals)
                              .sort((a, b) => b[1] - a[1])
                              .map(([sender, count]) => (
                                <div key={sender} className="flex gap-2 items-center">
                                  <span className="font-bold text-green-400">{sender}</span>
                                  <span className="text-gray-300">({count} Msgs)</span>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {deepStats.mostActiveBar && deepStats.mostActiveBar.topSender && (
                  <div className="mt-4 text-green-400 text-sm font-semibold">
                    You're quite chatty in the <span className="font-bold">{deepStats.mostActiveBar.label}</span> with <span className="font-bold">{deepStats.mostActiveBar.topSender}</span> being your most active chat buddy during that time!
                  </div>
                )}
              </div>
              
                {/* Hourly Activity Bar Graph */}
                <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 mt-8">
                  <h3 className="text-xl font-bold text-white">Hourly Activity</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Every hour on the clock, how many messages do you send? Let's see if you're a night owl or an early bird!
                  </p>
                  <div className="flex gap-4 items-end h-48 overflow-x-auto">
                    {(() => {
                      // Build hourly totals from messages
                      const hourlyTotals: number[] = Array(24).fill(0);
                      messages.forEach((m) => {
                        if (!m.isSystem) {
                          const hour = parseInt(m.time.split(":")[0], 10);
                          if (!isNaN(hour)) hourlyTotals[hour]++;
                        }
                      });
                      const max = Math.max(...hourlyTotals, 1);
                      return hourlyTotals.map((count, hour) => (
                        <div key={hour} className="flex flex-col items-center w-8">
                          <div
                            className="bg-green-600 rounded-t-xl transition-all w-full"
                            style={{ height: `${(count / max) * 140 + 8}px`, minHeight: 8 }}
                            title={`Hour ${hour}: ${count} messages`}
                          />
                          <span className="text-xs text-gray-400 mt-1 font-mono">{hour.toString().padStart(2, "0")}</span>
                          <span className="text-[10px] text-gray-600">{count}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

            {/* Daily Activity Graph */}
            <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800">
                <h3 className="text-xl font-bold text-white">Daily Activity Volume</h3>
                <p className="text-gray-400 text-sm mb-4">
                    How does your messaging activity fluctuate over time? This graph shows the number of messages sent each day. Hover over the peaks and valleys to see exact counts and dates!
                </p>
                <div className="h-64">
                    <Chart 
                        options={chartOptions} 
                        series={deepStats.graphSeries}
                        type="area" 
                        height="100%" 
                    />
                </div>
            </div>

            {/* Participant Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(deepStats.participants).map(([name, p]) => (
                    <div key={name} className="bg-gray-900 p-8 rounded-3xl border border-gray-800">
                        <h3 className="text-2xl font-black text-white mb-6 flex justify-between items-center">
                            {name}
                            <span className="text-sm font-medium px-3 py-1 bg-gray-800 rounded-full text-gray-400">
                                {p.msgCount.toLocaleString()} msgs
                            </span>
                        </h3>
                         {/* Humorous message */}
                         <div className="mb-4">
                           <span className="text-green-400 text-sm font-semibold">
                             {(() => {
                               const percent = (p.msgCount / messages.length) * 100;
                               if (percent >= 90) return "🏆 The Chat Overlord! Nobody else stands a chance.";
                               if (percent >= 70) return "🦜 Serial Messenger! Do you ever sleep?";
                               if (percent >= 50) return "🗣️ The Main Character Energy.";
                               if (percent >= 35) return "💬 The Conversation Driver.";
                               if (percent >= 20) return "😎 A Key Player in the Chat.";
                               if (percent >= 10) return "👀 Always around, always watching.";
                               if (percent >= 5) return "🤫 The Occasional Dropper.";
                               if (percent > 0) return "🦗 The Silent Observer. Rare, but precious.";
                               return "🤖 No messages detected! Are you, hmm, what even are you??";
                             })()}
                           </span>
                         </div>
                        
                        <div className="space-y-6">
                            {/* Metric Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-800/50 rounded-2xl">
                                    <div className="text-xs text-gray-500 uppercase font-bold">Words Sent</div>
                                    <div className="text-xl font-bold text-gray-200">{p.words.toLocaleString()}</div>
                                </div>
                                 <div className="p-4 bg-gray-800/50 rounded-2xl">
                                    <div className="text-xs text-gray-500 uppercase font-bold">Most Active Hour</div>
                                    <div className="text-xl font-bold text-gray-200">
                                        {Object.entries(p.timesOfDay).sort((a,b) => b[1] - a[1])[0]?.[0] || "00"}:00
                                    </div>
                                </div>
                                 <div className="p-4 bg-gray-800/50 rounded-2xl">
                                   <div className="text-xs text-gray-500 uppercase font-bold">Top Used Emojis</div>
                                   <div className="mt-2 flex gap-2">
                                     {p.topEmojis && p.topEmojis.length > 0 ? (
                                       p.topEmojis.map((emoji, idx) => (
                                         <div key={"top-"+idx} className="flex flex-col items-center">
                                           <span className="mb-1 px-2 py-0.5 rounded-full bg-green-700/80 text-xs text-white font-bold shadow">{p.emojiCounts?.[emoji]}</span>
                                           <span title={emoji} className="text-2xl">{emoji}</span>
                                         </div>
                                       ))
                                     ) : (
                                       <span className="text-gray-600 text-base">—</span>
                                     )}
                                   </div>
                                 </div>
                                 <div className="p-4 bg-gray-800/50 rounded-2xl">
                                   <div className="text-xs text-gray-500 uppercase font-bold">Least Used Emojis (Minimum {MINIMUM_EMOJI_OCCURRENCE})</div>
                                   <div className="mt-2 flex gap-2">
                                     {p.leastEmojis && p.leastEmojis.length > 0 ? (
                                       p.leastEmojis.map((emoji, idx) => (
                                         <div key={"least-"+idx} className="flex flex-col items-center">
                                           <span className="mb-1 px-2 py-0.5 rounded-full bg-gray-700/80 text-xs text-white font-bold shadow">{p.emojiCounts?.[emoji]}</span>
                                           <span title={emoji} className="text-2xl">{emoji}</span>
                                         </div>
                                       ))
                                     ) : (
                                       <span className="text-gray-600 text-base">—</span>
                                     )}
                                   </div>
                                 </div>
                                <div className="p-4 bg-gray-800/50 rounded-2xl">
                                    <div className="text-xs text-gray-500 uppercase font-bold">Longest Spree</div>
                                    <div className="text-xl font-bold text-gray-200">{p.longestStreak} msgs</div>
                                </div>
                                <div className="p-4 bg-gray-800/50 rounded-2xl">
                                    <div className="text-xs text-gray-500 uppercase font-bold">Emojis used</div>
                                    <div className="text-xl font-bold text-gray-200">{p.emojis.toLocaleString()}</div>
                                </div>
                                <div className="p-4 bg-gray-800/50 rounded-2xl col-span-2">
                                    <div className="text-xs text-gray-500 uppercase font-black mb-1">Top Word</div>
                                    <div className="text-2xl font-black text-green-500">
                                      "{p.mostSaidWord?.word}"
                                      <span className="text-sm font-bold text-gray-500 ml-2">({p.mostSaidWord?.count})</span>
                                    </div>
                                </div>
                            </div>

                            {/* Top Days for Participant */}
                            <div className="space-y-3">
                              <div className="text-xs text-gray-500 uppercase font-black tracking-widest">Most Active Days</div>
                              <div className="grid grid-cols-1 gap-2">
                                {p.topDays?.map((day) => (
                                  <div key={day.date} className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-gray-800/50">
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-sm font-bold text-gray-300">{day.date}</span>
                                      <span className="text-[10px] text-gray-500">{day.count} msgs</span>
                                    </div>
                                    <button 
                                      onClick={() => showLogsForDate(day.date)}
                                      className="text-[10px] font-black text-green-500 hover:text-green-400 uppercase bg-green-500/10 px-2 py-1 rounded-md transition-all"
                                    >
                                      Logs
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Detailed List */}
                            <div className="space-y-2 pt-2 border-t border-gray-800">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Media Files</span>
                                    <span className="text-gray-300 font-mono">{p.media}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Edited Messages</span>
                                    <span className="text-gray-300 font-mono">{p.edited}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
