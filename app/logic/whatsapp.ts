// Logic Parameters
export const MINIMUM_EMOJI_OCCURRENCE = 6;
import { TOP_WORD_STOP_WORDS } from "./stopWords";


export interface Message {
  date: string;
  time: string;
  sender: string;
  content: string;
  isSystem?: boolean;
}

export interface ParticipantStat {
  words: number;
  media: number;
  edited: number;
  emojis: number;
  links: number;
  questions: number;
  deleted: number;
  longestStreak: number;
  currentStreak: number;
  msgCount: number;
  avgWordsPerMessage: number;
  avgReplyMinutes: number | null;
  fastestReplyMinutes: number | null;
  slowestReplyMinutes: number | null;
  timesOfDay: Record<string, number>;
  emojiCounts?: Record<string, number>; // emoji -> count
  topEmojis?: string[]; // top 3 emojis
  leastEmojis?: string[]; // least 3 emojis
  mostSaidWord?: { word: string; count: number };
  topDays?: { date: string; count: number }[];
  msgsPerDate?: Record<string, number>;
}

export interface TimeOfDayBar {
  label: string;
  range: [number, number];
  totals: Record<string, number>;
  total: number;
}

export interface DeepStats {
  totalMessages: number;
  totalActiveDays: number;
  maxDaysStreak: number;
  currentActiveDaysStreak: number;
  totalWords: number;
  totalMedia: number;
  totalDeleted: number;
  totalLinks: number;
  totalQuestions: number;
  avgWordsPerMessage: number;
  participants: Record<string, ParticipantStat>;
  graphSeries: { name: string; data: number[] }[];
  graphCategories: string[];
  timeOfDayBars: TimeOfDayBar[];
  weekdayTotals: { label: string; total: number }[];
  mostActiveWeekday?: { label: string; total: number };
  fastestResponder?: { sender: string; avgReplyMinutes: number };
  slowestResponder?: { sender: string; avgReplyMinutes: number };
  longestMessage?: {
    sender: string;
    date: string;
    time: string;
    words: number;
    chars: number;
    preview: string;
  };
  mostActiveBar?: { label: string; topSender: string; total: number };
  mostSaidWord?: { word: string; count: number };
  topDays?: { date: string; count: number }[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseWhatsAppDateTime(date: string, time: string): Date | null {
  const dateMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;

  let first = parseInt(dateMatch[1], 10);
  let second = parseInt(dateMatch[2], 10);
  let year = parseInt(dateMatch[3], 10);
  const hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);

  if (year < 100) year += 2000;

  let day = first;
  let month = second;
  if (first <= 12 && second > 12) {
    day = second;
    month = first;
  }

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function parseWhatsAppChat(text: string): Message[] {
  const lines = text.split(/\r?\n/);
  const parsed: Message[] = [];
  const dateRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2})\s-\s/;

  lines.forEach((line) => {
    if (!line.trim()) return;
    const match = line.match(dateRegex);

    if (match) {
      const [fullMatch, date, time] = match;
      const remaining = line.slice(fullMatch.length);
      const senderLineMatch = remaining.match(/^([^:]+):\s(.*)$/);

      if (senderLineMatch) {
        parsed.push({
          date,
          time,
          sender: senderLineMatch[1],
          content: senderLineMatch[2],
        });
      } else {
        parsed.push({
          date,
          time,
          sender: "System",
          content: remaining,
          isSystem: true,
        });
      }
    } else if (parsed.length > 0) {
      parsed[parsed.length - 1].content += "\n" + line;
    }
  });

  return parsed;
}

export function calculateBasicStats(messages: Message[]) {
  const counts: Record<string, number> = {};
  messages
    .filter((m) => !m.isSystem)
    .forEach((m) => {
      counts[m.sender] = (counts[m.sender] || 0) + 1;
    });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export function calculateDeepStats(messages: Message[]): DeepStats | null {
  if (messages.length === 0) return null;

  const nonSystemMessages = messages.filter((m) => !m.isSystem);

  // -- Basic Counters --
  let totalWords = 0;
  let totalMedia_count = 0;
  let totalDeleted_count = 0;
  let totalLinks_count = 0;
  let totalQuestions_count = 0;
  let totalTextMessages = 0;
  const participantStats: Record<string, ParticipantStat> = {};
  const participantTextMessages: Record<string, number> = {};
  const participantReplyStats: Record<string, { total: number; count: number; fastest: number; slowest: number }> = {};
  let previousMessageDateTime: Date | null = null;
  let previousMessageSender = "";
  let longestMessage:
    | {
        sender: string;
        date: string;
        time: string;
        words: number;
        chars: number;
        preview: string;
      }
    | undefined;
  
  // Word counting (total and per participant)
  const totalWordCounts: Record<string, number> = {};
  const participantWordCounts: Record<string, Record<string, number>> = {};

  // -- Date Processing for Streaks & Graph --
  const msgsByDate: Record<string, number> = {};
  const uniqueDates = new Set<string>();
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdayCounts = Array(7).fill(0) as number[];

  // Simple Emoji Regex (Basic Range)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu;

  // For time of day bars
  // Define time buckets: Night (0-5), Morning (6-11), Afternoon (12-17), Evening (18-23)
  const timeBuckets = [
    { label: "Night", range: [0, 5] },
    { label: "Morning", range: [6, 11] },
    { label: "Afternoon", range: [12, 17] },
    { label: "Evening", range: [18, 23] },
  ];
  const timeOfDayBars: { label: string; range: [number, number]; totals: Record<string, number>; total: number }[] = timeBuckets.map((b) => ({
    label: b.label,
    range: [b.range[0], b.range[1]] as [number, number],
    totals: {},
    total: 0,
  }));

  nonSystemMessages.forEach((m) => {
    // Initialize participant if needed
    if (!participantStats[m.sender]) {
      participantStats[m.sender] = {
        words: 0,
        media: 0,
        edited: 0,
        emojis: 0,
        links: 0,
        questions: 0,
        deleted: 0,
        longestStreak: 0,
        currentStreak: 0,
        msgCount: 0,
        avgWordsPerMessage: 0,
        avgReplyMinutes: null,
        fastestReplyMinutes: null,
        slowestReplyMinutes: null,
        timesOfDay: {},
        emojiCounts: {},
        topEmojis: [],
        msgsPerDate: {},
        topDays: [],
      };
      participantWordCounts[m.sender] = {};
      participantTextMessages[m.sender] = 0;
      participantReplyStats[m.sender] = { total: 0, count: 0, fastest: Number.POSITIVE_INFINITY, slowest: 0 };
    }

    const p = participantStats[m.sender];
    p.msgCount++;

    // Content Checks
    const isMedia = m.content.includes("<Media omitted>");
    const isDeleted = /(?:this message was deleted|you deleted this message)/i.test(m.content);
    const isEdited = m.content.includes("<This message was edited>");
    const links = m.content.match(/(?:https?:\/\/|www\.)\S+/gi) || [];
    const questionMarks = (m.content.match(/\?/g) || []).length;
    const dateTime = parseWhatsAppDateTime(m.date, m.time);

    if (isMedia) {
      p.media++;
      totalMedia_count++;
    } else if (isDeleted) {
      p.deleted++;
      totalDeleted_count++;
    } else {
      // Word count
      const cleanText = m.content.toLowerCase().replace(/[^\w\s]/g, "");
      const wordsArr = cleanText.trim().split(/\s+/).filter(w => w.length > 2 && !TOP_WORD_STOP_WORDS.has(w));
      
      wordsArr.forEach(word => {
        totalWordCounts[word] = (totalWordCounts[word] || 0) + 1;
        participantWordCounts[m.sender][word] = (participantWordCounts[m.sender][word] || 0) + 1;
      });

      const words = m.content.trim().split(/\s+/).length;
      p.words += words;
      totalWords += words;
      totalTextMessages++;
      participantTextMessages[m.sender]++;

      const chars = m.content.trim().length;
      if (!longestMessage || words > longestMessage.words) {
        longestMessage = {
          sender: m.sender,
          date: m.date,
          time: m.time,
          words,
          chars,
          preview: m.content.trim().slice(0, 120),
        };
      }

      // Emoji count
      const emojisArr = m.content.match(emojiRegex) || [];
      p.emojis += emojisArr.length;
      // Count each emoji
      emojisArr.forEach((emj) => {
        p.emojiCounts![emj] = (p.emojiCounts![emj] || 0) + 1;
      });
    }

    p.links += links.length;
    totalLinks_count += links.length;
    p.questions += questionMarks;
    totalQuestions_count += questionMarks;

    if (isEdited) p.edited++;

    if (dateTime) {
      weekdayCounts[dateTime.getDay()]++;
      if (
        previousMessageDateTime &&
        previousMessageSender &&
        previousMessageSender !== m.sender
      ) {
        const diffMinutes = (dateTime.getTime() - previousMessageDateTime.getTime()) / (1000 * 60);
        if (diffMinutes >= 0 && diffMinutes <= 24 * 60) {
          const stats = participantReplyStats[m.sender];
          stats.total += diffMinutes;
          stats.count++;
          stats.fastest = Math.min(stats.fastest, diffMinutes);
          stats.slowest = Math.max(stats.slowest, diffMinutes);
        }
      }
      previousMessageDateTime = dateTime;
      previousMessageSender = m.sender;
    }

    // Time of Day
    const hourStr = m.time.split(":")[0];
    const hour = parseInt(hourStr, 10);
    p.timesOfDay[hourStr] = (p.timesOfDay[hourStr] || 0) + 1;

    // Assign to time bucket
    const bucket = timeOfDayBars.find((b) => hour >= b.range[0] && hour <= b.range[1]);
    if (bucket) {
      bucket.totals[m.sender] = (bucket.totals[m.sender] || 0) + 1;
      bucket.total++;
    }

    // Date Grouping
    msgsByDate[m.date] = (msgsByDate[m.date] || 0) + 1;
    uniqueDates.add(m.date);
    p.msgsPerDate![m.date] = (p.msgsPerDate![m.date] || 0) + 1;
  });

  // Calculate top 3 emojis and top word for each participant
  Object.entries(participantStats).forEach(([sender, p]) => {
    if (p.emojiCounts) {
      p.topEmojis = Object.entries(p.emojiCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emoji]) => emoji);
      // Only include least used emojis that occurred at least 3 times
      p.leastEmojis = Object.entries(p.emojiCounts)
        .filter(([, count]) => count >= MINIMUM_EMOJI_OCCURRENCE) // Filter out emojis that are too rare
        .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([emoji]) => emoji);
    }

    // Top Word
    const words = participantWordCounts[sender];
    const sortedWords = Object.entries(words).sort((a, b) => b[1] - a[1]);
    if (sortedWords[0]) {
      p.mostSaidWord = { word: sortedWords[0][0], count: sortedWords[0][1] };
    }

    // Top Days
    p.topDays = Object.entries(p.msgsPerDate!)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([date, count]) => ({ date, count }));

    p.avgWordsPerMessage = participantTextMessages[sender]
      ? p.words / participantTextMessages[sender]
      : 0;

    const replyStats = participantReplyStats[sender];
    if (replyStats.count > 0) {
      p.avgReplyMinutes = replyStats.total / replyStats.count;
      p.fastestReplyMinutes = replyStats.fastest;
      p.slowestReplyMinutes = replyStats.slowest;
    }
  });

  // Total Top Word
  const totalSortedWords = Object.entries(totalWordCounts).sort((a, b) => b[1] - a[1]);
  const mostSaidWord = totalSortedWords[0] ? { word: totalSortedWords[0][0], count: totalSortedWords[0][1] } : undefined;

  // Total Top Days
  const totalTopDays = Object.entries(msgsByDate)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([date, count]) => ({ date, count }));

  // -- Calculate Streaks (Consecutive Messages) --
  let lastSender = "";
  let currentStreakCount = 0;

  nonSystemMessages.forEach((m) => {
    if (m.sender === lastSender) {
      currentStreakCount++;
    } else {
      if (lastSender && participantStats[lastSender]) {
        if (currentStreakCount > participantStats[lastSender].longestStreak) {
          participantStats[lastSender].longestStreak = currentStreakCount;
        }
      }
      lastSender = m.sender;
      currentStreakCount = 1;
    }
  });
  // Final check for the last batch
  if (lastSender && participantStats[lastSender]) {
    if (currentStreakCount > participantStats[lastSender].longestStreak) {
      participantStats[lastSender].longestStreak = currentStreakCount;
    }
  }

  // -- Calculate Days Streak & Graph Data --
  // Convert dates to timestamps for sorting
  const sortedDates = Array.from(uniqueDates).sort((a, b) => {
    const aDate = parseWhatsAppDateTime(a, "00:00");
    const bDate = parseWhatsAppDateTime(b, "00:00");
    if (!aDate && !bDate) return a.localeCompare(b);
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate.getTime() - bDate.getTime();
  });

  let maxDayStreak = 0;
  let currentDayStreak = 0;
  let currentActiveDayStreak = 0;
  let prevDate: Date | null = null;

  const graphSeries = [
    {
      name: "Messages",
      data: sortedDates.map((date) => msgsByDate[date]),
    },
  ];
  const graphCategories = sortedDates;

  sortedDates.forEach((dateStr) => {
    const currDate = parseWhatsAppDateTime(dateStr, "00:00");
    if (!currDate) return;

    if (!prevDate) {
      currentDayStreak = 1;
      maxDayStreak = 1;
    } else {
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / MS_PER_DAY);

      if (diffDays === 1) {
        currentDayStreak++;
      } else {
        currentDayStreak = 1;
      }
    }
    if (currentDayStreak > maxDayStreak) maxDayStreak = currentDayStreak;
    prevDate = currDate;
  });

  if (sortedDates.length > 0) {
    currentActiveDayStreak = 1;
    let nextDate = parseWhatsAppDateTime(sortedDates[sortedDates.length - 1], "00:00");
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const currDate = parseWhatsAppDateTime(sortedDates[i], "00:00");
      if (!currDate || !nextDate) break;
      const diffTime = nextDate.getTime() - currDate.getTime();
      const diffDays = Math.round(diffTime / MS_PER_DAY);
      if (diffDays === 1) {
        currentActiveDayStreak++;
        nextDate = currDate;
        continue;
      }
      break;
    }
  }

  // Find the most active bar and top sender in that bar
  let mostActiveBar: { label: string; topSender: string; total: number } | undefined = undefined;
  let maxBarTotal = 0;
  timeOfDayBars.forEach((bar) => {
    if (bar.total > maxBarTotal) {
      maxBarTotal = bar.total;
      // Find top sender in this bar
      let topSender = "";
      let topCount = 0;
      Object.entries(bar.totals).forEach(([sender, count]) => {
        if (count > topCount) {
          topSender = sender;
          topCount = count;
        }
      });
      mostActiveBar = { label: bar.label, topSender, total: bar.total };
    }
  });

  const weekdayTotals = weekdayLabels.map((label, idx) => ({
    label,
    total: weekdayCounts[idx],
  }));
  const mostActiveWeekday = weekdayTotals.reduce<{ label: string; total: number } | undefined>(
    (best, day) => {
      if (!best || day.total > best.total) return day;
      return best;
    },
    undefined,
  );

  const fastestResponder = Object.entries(participantStats).reduce<
    { sender: string; avgReplyMinutes: number } | undefined
  >((best, [sender, participant]) => {
    if (participant.avgReplyMinutes == null) return best;
    if (!best || participant.avgReplyMinutes < best.avgReplyMinutes) {
      return { sender, avgReplyMinutes: participant.avgReplyMinutes };
    }
    return best;
  }, undefined);
  const slowestResponder = Object.entries(participantStats).reduce<
    { sender: string; avgReplyMinutes: number } | undefined
  >((best, [sender, participant]) => {
    if (participant.avgReplyMinutes == null) return best;
    if (!best || participant.avgReplyMinutes > best.avgReplyMinutes) {
      return { sender, avgReplyMinutes: participant.avgReplyMinutes };
    }
    return best;
  }, undefined);

  return {
    totalMessages: nonSystemMessages.length,
    totalActiveDays: uniqueDates.size,
    maxDaysStreak: maxDayStreak,
    currentActiveDaysStreak: currentActiveDayStreak,
    totalWords,
    totalMedia: totalMedia_count,
    totalDeleted: totalDeleted_count,
    totalLinks: totalLinks_count,
    totalQuestions: totalQuestions_count,
    avgWordsPerMessage: totalTextMessages ? totalWords / totalTextMessages : 0,
    participants: participantStats,
    graphSeries,
    graphCategories,
    timeOfDayBars,
    weekdayTotals,
    mostActiveWeekday,
    fastestResponder,
    slowestResponder,
    longestMessage,
    mostActiveBar,
    mostSaidWord,
    topDays: totalTopDays,
  };
}
