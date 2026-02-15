// Logic Parameters
export const MINIMUM_EMOJI_OCCURRENCE = 6;


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
  longestStreak: number;
  currentStreak: number;
  msgCount: number;
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
  totalActiveDays: number;
  maxDaysStreak: number;
  totalWords: number;
  totalMedia: number;
  participants: Record<string, ParticipantStat>;
  graphSeries: { name: string; data: number[] }[];
  graphCategories: string[];
  timeOfDayBars: TimeOfDayBar[];
  mostActiveBar?: { label: string; topSender: string; total: number };
  mostSaidWord?: { word: string; count: number };
  topDays?: { date: string; count: number }[];
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
  const participantStats: Record<string, ParticipantStat> = {};
  
  // Word counting (total and per participant)
  const totalWordCounts: Record<string, number> = {};
  const participantWordCounts: Record<string, Record<string, number>> = {};

  // -- Date Processing for Streaks & Graph --
  const msgsByDate: Record<string, number> = {};
  const uniqueDates = new Set<string>();

  // Simple Emoji Regex (Basic Range)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu;
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "is", "are", "was", "were", "of", "it", "that", "this", "my", "your", "i", "me", "you", "he", "she", "we", "they", "it's", "i'm", "omitted", "media", "message", "deleted"]);

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
        longestStreak: 0,
        currentStreak: 0,
        msgCount: 0,
        timesOfDay: {},
        emojiCounts: {},
        topEmojis: [],
        msgsPerDate: {},
        topDays: [],
      };
      participantWordCounts[m.sender] = {};
    }

    const p = participantStats[m.sender];
    p.msgCount++;

    // Content Checks
    const isMedia = m.content.includes("<Media omitted>");
    const isEdited = m.content.includes("<This message was edited>");

    if (isMedia) {
      p.media++;
      totalMedia_count++;
    } else {
      // Word count
      const cleanText = m.content.toLowerCase().replace(/[^\w\s]/g, "");
      const wordsArr = cleanText.trim().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
      
      wordsArr.forEach(word => {
        totalWordCounts[word] = (totalWordCounts[word] || 0) + 1;
        participantWordCounts[m.sender][word] = (participantWordCounts[m.sender][word] || 0) + 1;
      });

      const words = m.content.trim().split(/\s+/).length;
      p.words += words;
      totalWords += words;

      // Emoji count
      const emojisArr = m.content.match(emojiRegex) || [];
      p.emojis += emojisArr.length;
      // Count each emoji
      emojisArr.forEach((emj) => {
        p.emojiCounts![emj] = (p.emojiCounts![emj] || 0) + 1;
      });
    }

    if (isEdited) p.edited++;

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
    return new Date(a).getTime() - new Date(b).getTime();
  });

  let maxDayStreak = 0;
  let currentDayStreak = 0;
  let prevDate: Date | null = null;

  const graphSeries = [
    {
      name: "Messages",
      data: sortedDates.map((date) => msgsByDate[date]),
    },
  ];
  const graphCategories = sortedDates;

  sortedDates.forEach((dateStr) => {
    const currDate = new Date(dateStr);
    if (!prevDate) {
      currentDayStreak = 1;
      maxDayStreak = 1;
    } else {
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentDayStreak++;
      } else {
        currentDayStreak = 1;
      }
    }
    if (currentDayStreak > maxDayStreak) maxDayStreak = currentDayStreak;
    prevDate = currDate;
  });

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

  return {
    totalActiveDays: uniqueDates.size,
    maxDaysStreak: maxDayStreak,
    totalWords,
    totalMedia: totalMedia_count,
    participants: participantStats,
    graphSeries,
    graphCategories,
    timeOfDayBars,
    mostActiveBar,
    mostSaidWord,
    topDays: totalTopDays,
  };
}
