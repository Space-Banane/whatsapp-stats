particlesJS.load("particles-js", "particles.json", function () {
  console.log("callback - particles.js config loaded");
});

// A Project that is fun to actually code

function daysBetween(time) { // Thanks ChatGPT 😛
  const { first, last } = time;

  // Create Date objects for both dates
  const firstDate = new Date(first.year, first.month - 1, first.day);
  const lastDate = new Date(last.year, last.month - 1, last.day);

  // Calculate the difference in milliseconds
  const diffInMs = lastDate - firstDate;

  // Convert milliseconds to days
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  return Math.abs(diffInDays);
}

function removeEmojis(str) {
  return str.replace(/([\u203C-\u3299]|[\uD83C-\uDBFF][\uDC00-\uDFFF])/g, "");
}

function countConsecutiveMessages(messages) {
  const consecutiveCounts = {};
  let currentSender = null;
  let currentCount = 0;

  for (const message of messages) {
    if (message.includes(" - ") && !message.includes("<Media omitted>")) {
      const sender = removeEmojis(message.split(" - ")[1].split(":")[0]).trim();
      if (sender === currentSender) {
        currentCount++;
      } else {
        consecutiveCounts[currentSender] = Math.max(
          consecutiveCounts[currentSender] || 0,
          currentCount
        );
        currentSender = sender;
        currentCount = 1;
      }
    }
  }
  consecutiveCounts[currentSender] = Math.max(
    consecutiveCounts[currentSender] || 0,
    currentCount
  );

  return consecutiveCounts;
}

function EvaluateYapLevel(words) {
  if (words < 1000) return "Casual Chatter 🌱";
  if (words < 5000) return "Friendly Conversationalist 😊";
  if (words < 10000) return "Message Master 🎯";
  if (words < 20000) return "Chat Enthusiast ⭐";
  if (words < 50000) return "Social Butterfly 🦋";
  if (words < 100000) return "Conversation Champion 👑";
  if (words < 200000) return "Legendary Communicator 🌟";
  if (words < 500000) return "Chat Guru 🙏";
  return "Ultimate Message Maven ✨";
}

// Helper to format durations (ms) into HH:MM:SS
function formatDuration(durationMs) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds - hours * 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

let data;

async function DoStats(content) {
  // Hide upload elements
  ['fileuploader', 'texthead'].forEach(id =>
    document.getElementById(id).style.display = 'none'
  );

  // Initialize data structure
  data = {
    participants: [],
    raw: {
      messages: [],
      totalWords: 0,
      totalMedia: 0
    },
    timespan: {
      start: null,
      end: null,
      durationDays: 0
    },
    stats: {
      mostActive: {
        morning: { name: '', count: 0 }, // 6AM-12PM
        afternoon: { name: '', count: 0 }, // 12PM-6PM 
        evening: { name: '', count: 0 }, // 6PM-12AM
        night: { name: '', count: 0 } // 12AM-6AM
      },
      longestMessage: {
        sender: '',
        words: 0,
        date: ''
      },
      emojis: {
        mostUsed: {},
        totalCount: 0
      },
      // New property to hold response times per participant
      responseTimes: {}
    }
  };

  let messages = content.split('\n').filter(msg => msg.trim());

  // First pass - identify participants
  const participantNames = new Set();
  for (const msg of messages) {
    if (participantNames.size >= 2) break; // Limit to 2 participants
    if (!msg.includes(' - ')) continue;
    const [timestamp, content] = msg.split(' - ');
    if (!content.includes(':')) continue;
    const name = removeEmojis(content.split(':')[0]).trim();
    if (isValidParticipant(name)) {
      participantNames.add(name);
    }
  }

  if (participantNames.size < 2) {
    alert("Couldn't identify two participants in the chat. Please ensure the chat file is in the correct format.");
  }

  // Initialize participant data + responseTimes
  participantNames.forEach(name => {
    data.participants.push({
      name,
      messageCount: 0,
      mediaCount: 0,
      wordCount: 0,
      editedCount: 0,
      emojiCount: 0,
      maxCombo: 0,
      avgResponseTime: null, // in ms
      avgResponseTimeFormatted: "N/A",
      timeDistribution: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0
      }
    });
    data.stats.responseTimes[name] = [];
  });

  // Track for combos and average response time
  let currentCombo = { sender: '', count: 0 };
  let lastMessage = null; // will hold { sender, timestamp }

  messages.forEach(msg => {
    if (!msg.includes(' - ')) return;

    const parts = msg.split(' - ');
    if (parts.length !== 2) return;
    const [timestampStr, content] = parts;

    const timestampParts = timestampStr.split(', ');
    if (timestampParts.length !== 2) return;
    const [dateStr, timeStr] = timestampParts;

    const dateParts = dateStr.split('/');
    if (dateParts.length !== 3) return;
    const [month, day, shortYear] = dateParts.map(n => parseInt(n));
    const year = 2000 + shortYear;

    const timeParts = timeStr.split(':');
    if (timeParts.length < 1) return;
    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1] || "0");

    const timestampObj = new Date(year, month - 1, day, hour, minute);

    if (!data.timespan.start) {
      data.timespan.start = new Date(year, month - 1, day);
    }
    data.timespan.end = new Date(year, month - 1, day);

    const sender = content.includes(':') ? removeEmojis(content.split(':')[0]).trim() : null;
    if (!sender || !data.participants.find(p => p.name === sender)) return;

    const participant = data.participants.find(p => p.name === sender);
    participant.messageCount++;

    // Track time distribution
    const timeOfDay = getTimeOfDay(hour);
    participant.timeDistribution[timeOfDay]++;

    // Track combos
    if (sender === currentCombo.sender) {
      currentCombo.count++;
    } else {
      if (currentCombo.count > 0) {
        const p = data.participants.find(p => p.name === currentCombo.sender);
        if (p) p.maxCombo = Math.max(p.maxCombo, currentCombo.count);
      }
      currentCombo = { sender, count: 1 };
    }

    // Calculate response times when sender changes
    if (lastMessage && lastMessage.sender !== sender) {
      const responseTime = timestampObj - lastMessage.timestamp; // in ms
      data.stats.responseTimes[sender].push(responseTime);
    }
    lastMessage = { sender, timestamp: timestampObj };

    // Count words, media, emojis
    if (content.includes('<Media omitted>')) {
      participant.mediaCount++;
      data.raw.totalMedia++;
    } else if (content.includes(':')) {
      const messageText = content.split(':')[1];
      const words = messageText.split(' ').filter(w => w).length;
      participant.wordCount += words;
      data.raw.totalWords += words;

      // Track longest message
      if (words > data.stats.longestMessage.words) {
        data.stats.longestMessage = {
          sender,
          words,
          date: `${day}/${month}/${year}`
        };
      }

      // Count emojis
      const emojis = messageText.match(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\u2011-\u26FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD10-\uDDFF])/g) || [];

      participant.emojiCount += emojis.length;
      data.stats.emojis.totalCount += emojis.length;
    }

    // Track edited messages
    if (content.includes('<This message was edited>')) {
      participant.editedCount++;
    }
  });

  // Calculate timespan
  data.timespan.durationDays = Math.ceil((data.timespan.end - data.timespan.start) / (1000 * 60 * 60 * 24));

  // Compute average response times per participant and format them for display
  data.participants.forEach(p => {
    const times = data.stats.responseTimes[p.name];
    if (times.length > 0) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      p.avgResponseTime = avg;
      p.avgResponseTimeFormatted = formatDuration(avg);
    }
  });

  renderStats();

  // Render daily message chart
  renderDailyChart(messages);
}

function getTimeOfDay(hour) {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
}

function isValidParticipant(name) {
  const invalidNames = [
    'Messages and calls',
    'Your security code',
    'You unblocked',
    'You blocked',
    'Whatsapp'
  ];
  return !invalidNames.some(invalid => name.includes(invalid));
}

function renderStats() {
  const gradient = "bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600";

  // Helper to format large numbers
  const formatNumber = num => num.toLocaleString();

  // Calculate participation percentages
  const totalMessages = data.participants.reduce((sum, p) => sum + p.messageCount, 0);

  const statsHtml = `
    <div class="max-w-7xl mx-auto px-4">
      <h1 class="${gradient} text-5xl font-bold mb-12 text-center animate-fade-in font-sans" style="animation-delay: 0ms; line-height: auto">
        Hey, ${data.participants[0].name} & ${data.participants[1].name}! Here's your chat analysis. <span class="text-white">📊</span>
      </h1>
      
      <!-- Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        ${[
      { label: 'Days Active', value: data.timespan.durationDays, color: 'from-emerald-400 to-teal-500' },
      { label: 'Total Messages', value: formatNumber(totalMessages), color: 'from-sky-400 to-blue-500' },
      { label: 'Total Words', value: formatNumber(data.raw.totalWords), color: 'from-violet-400 to-purple-500' },
      { label: 'Media Shared', value: formatNumber(data.raw.totalMedia), color: 'from-rose-400 to-pink-500' }
    ].map((item, index) => `
          <div class="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center transform hover:scale-105 transition-transform duration-300 animate-slide-up" style="animation-delay: ${index * 150}ms">
            <div class="bg-gradient-to-r ${item.color} h-2 rounded-full mb-4"></div>
            <p class="text-white/70 text-sm uppercase font-medium">${item.label}</p>
            <p class="text-2xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r ${item.color}">${item.value}</p>
          </div>
        `).join('')}
      </div>

      <!-- Detailed Stats -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Participant Rankings -->
        <div class="bg-white/5 backdrop-blur-sm rounded-xl p-6 hover:shadow-xl transition-shadow duration-300">
          <h2 class="text-xl font-bold mb-6 ${gradient} font-sans">Participant Activity</h2>
          ${data.participants
      .sort((a, b) => b.messageCount - a.messageCount)
      .map(p => {
        const percentage = Math.round((p.messageCount / totalMessages) * 100);
        return `
              <div class="mb-6 last:mb-0 animate-fade-in">
                <div class="flex justify-between items-center mb-2">
                  <h3 class="font-medium text-white">${p.name}</h3>
                  <span class="text-sm text-white/70">${percentage}% of chat</span>
                </div>
                <div class="h-2 bg-white/10 rounded-full mb-3">
                  <div class="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-1000"
                       style="width: ${percentage}%"></div>
                </div>
                <div class="space-y-1 text-white/80">
                  <div class="flex justify-between text-sm font-medium">
                    <span>Messages: ${formatNumber(p.messageCount)}</span>
                    <span>Words: ${formatNumber(p.wordCount)}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="flex items-center">
                      <span class="mr-1">😊</span> ${formatNumber(p.emojiCount)}
                    </span>
                    <span>✏️ ${formatNumber(p.editedCount)}</span>
                  </div>
                  <div class="text-sm font-medium bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                    ${EvaluateYapLevel(p.wordCount)}
                  </div>
                  <div class="text-sm">🔥 Longest streak: ${p.maxCombo} messages</div>
                  <div class="text-sm bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                    ⏱ Avg Response Time: ${p.avgResponseTimeFormatted}
                  </div>
                </div>
              </div>
            `}).join('')}
        </div>

        <!-- Activity Patterns -->
        <div class="bg-white/5 backdrop-blur-sm rounded-xl p-6 hover:shadow-xl transition-shadow duration-300">
          <h2 class="text-xl font-bold mb-6 ${gradient} font-sans">Time Distribution</h2>
          ${data.participants.map(p => {
          const maxCount = Math.max(...Object.values(p.timeDistribution));
          return `
            <div class="mb-6 last:mb-0">
              <h3 class="font-medium mb-3 text-white">${p.name}</h3>
              <div class="grid grid-cols-4 gap-2">
                ${Object.entries(p.timeDistribution).map(([time, count], index) => `
                  <div class="bg-white/5 rounded p-2 text-center transform hover:scale-105 transition-transform duration-300">
                    <div class="text-xs text-white/70 uppercase font-medium">${time}</div>
                    <div class="h-24 flex items-end justify-center mb-2">
                      <div class="w-full bg-gradient-to-t from-violet-500 to-indigo-500 rounded-t transition-all duration-1000"
                           style="height: ${(count / maxCount) * 100}%"></div>
                    </div>
                    <div class="text-lg font-medium text-white">${count}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `}).join('')}
        </div>
      </div>

      <!-- Records Section -->
      <div class="bg-white/5 backdrop-blur-sm rounded-xl p-6 mt-8 hover:shadow-xl transition-shadow duration-300">
        <h2 class="text-xl font-bold mb-4 ${gradient} font-sans">Notable Records</h2>
        <div class="text-sm space-y-2 text-white/80">
          <p class="flex items-center">
            <span class="inline-block w-2 h-2 bg-violet-500 rounded-full mr-2"></span>
            Longest message: ${formatNumber(data.stats.longestMessage.words)} words By ${data.stats.longestMessage.sender} on ${data.stats.longestMessage.date}
          </p>
          <p class="flex items-center">
            <span class="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
            Total emojis used: ${formatNumber(data.stats.emojis.totalCount)}
          </p>
        </div>
      </div>
    </div>

    <!-- Daily Message Chart -->
    <div class="max-w-7xl mx-auto px-4 mt-12">
      <h2 class="${gradient} text-2xl font-bold mb-6 text-center animate-fade-in font-sans">Daily Message Count</h2>
      <div id="dailyChart" class="backdrop-blur-sm rounded-xl p-6 hover:shadow-xl transition-shadow duration-300"></div>
    </div>
  `;

  // Add required CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slide-up {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-fade-in {
      animation: fade-in 1s ease-out forwards;
    }
    .animate-slide-up {
      animation: slide-up 0.5s ease-out forwards;
    }
  `;
  document.head.appendChild(style);

  document.getElementById("statsdata").innerHTML = statsHtml;
}

async function Process() {
  const file = document.getElementById("filepicker").files[0];
  if (file) {
    if (file.type === 'text/plain') {
      // Handle .txt files directly
      const reader = new FileReader();
      reader.onload = function (e) {
        DoStats(e.target.result);
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.zip')) {
      // Handle .zip files
      const reader = new FileReader();
      reader.onload = function (e) {
        const arrayBuffer = e.target.result;
        JSZip.loadAsync(arrayBuffer).then(function (zip) {
          zip.forEach(function (relativePath, zipEntry) {
            if (relativePath.endsWith('.txt')) {
              zipEntry.async("string").then(function (content) {
                DoStats(content);
              });
            }
          });
        });
      };
      reader.readAsArrayBuffer(file);
    }
  }
}

// Function to render a line chart with daily message counts per participant using ApexCharts
function renderDailyChart(messages) {
  // Build an object to accumulate message counts per day per sender
  const dailyCounts = {};

  messages.forEach(msg => {
    if (!msg.includes(' - ')) return;
    const [timestamp, text] = msg.split(' - ');
    if (!text || !text.includes(':')) return;
    const sender = removeEmojis(text.split(':')[0]).trim();
    // Extract date part from timestamp (format "MM/DD/YY")
    const datePart = timestamp.split(',')[0];
    if (!dailyCounts[datePart]) {
      dailyCounts[datePart] = {};
    }
    dailyCounts[datePart][sender] = (dailyCounts[datePart][sender] || 0) + 1;
  });

  // Sort dates so that the chart is rendered chronologically
  const dates = Object.keys(dailyCounts).sort((a, b) => new Date(a) - new Date(b));

  // Determine all participant names from the data
  const participantNames = data.participants.map(p => p.name);

  // Prepare series data for ApexCharts: one series per participant
  const series = participantNames.map(name => {
    const dataSeries = dates.map(date => dailyCounts[date][name] || 0);
    return { name, data: dataSeries };
  });

  // ApexCharts options for a line chart
  const options = {
    series,
    xaxis: { 
      categories: dates,
      labels: {
        style: {
          colors: '#fff' // Make x-axis labels white
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#fff' // Make y-axis labels white
        }
      }
    },
    title: { text: undefined },
    dataLabels: { enabled: false },
    colors: ['#9f7aea', '#4ade80'], // Custom colors for the lines
    chart: {
      type: 'area',
      height: 320,
      animations: {
        enabled: true,
        easing: 'easeinout',
      },
      background: '#1e293b',
      toolbar: {
        show: true,
        tools: {
          download: false,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        },
        autoSelected: 'zoom'
      },
      events: {
        dblclick: function(chartContext, seriesIndex, opts) {
          chartContext.zoomReset();
        }
      },
      foreColor: '#fff' // Make all text white
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    },
    grid: {
      borderColor: '#334155',
      strokeDashArray: 4
    },
    legend: {
      labels: {
        colors: '#fff' // Make legend text white
      }
    },
    tooltip: {
      theme: 'dark' // Dark theme for tooltips
    }
  };

  new ApexCharts(document.querySelector("#dailyChart"), options).render();
}
