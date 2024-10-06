particlesJS.load("particles-js", "particles.json", function () {
  console.log("callback - particles.js config loaded");
});

function daysBetween(time) {
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
  if (words < 200) return "Starter Yapper";
  if (words < 1600) return "Basic Yapper";
  if (words < 2900) return "Mid Yapper";
  if (words < 5100) return "Expert Yapper";
  if (words < 17000) return "Level 10 Yapper";
  return `"Please Shut the hell up🙏"`;
}

let data;
let people = [];
async function DoStats(content) {
  document.getElementById("fileuploader").style.display = "none";
  document.getElementById("texthead").style.display = "none";

  data = {
    person1: {
      name: "",
      message_count: 0,
      media: 0,
      hearts: 0,
      words: 0,
      yap_level: "",
      edited: 0,
      max_combo: 0
    },
    person2: {
      name: "",
      message_count: 0,
      media: 0,
      hearts: 0,
      words: 0,
      yap_level: "",
      edited: 0,
      max_combo: 0
    },
    raw: {
      messages: [],
    },
    time: {
      first: {
        day: 0,
        month: 0,
        year: 0,
      },
      last: {
        day: 0,
        month: 0,
        year: 0,
      },
    },
    stats: {
      hearts: {
        more: {
          name: "",
          count: 0,
        },
        less: {
          name: "",
          count: 0,
        },
      },
      first_msg: {
        name: "",
        formatted_date: "",
      },
      combo: {
        name: "",
        amount: 0
      }
    },
  };

  const splitted = content.split("\n");
  
  for (const message of splitted) {
    data.raw.messages.push(message);

    if (message.includes(" - ")) {
      const name = message.split(" - ")[1].split(":")[0];
      const date = message.split(" - ")[0];

      data.time.last.day = parseInt(message.split(" - ")[0].split("/")[0]);
      data.time.last.month = parseInt(message.split(" - ")[0].split("/")[1]);
      data.time.last.year = parseInt(message.split(" - ")[0].split("/")[2]);

      if (people.length === 2) {
        data.person1.name = people[0];
        data.person2.name = people[1];
      } else {
        if (!name.startsWith("Messages and calls")) {
          if (!name.startsWith("Your security code")) {
            if (!name.startsWith("You unblocked")) {
              if (!name.startsWith("You blocked")) {
                if (!name.includes("is a contact")) {
                  if (!name.includes("Whatsapp")) {
                    if (message.split(" - ")[1].includes(":")) {
                      if (!people.includes(name)) people.push(name);
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (message.includes(data.person1.name)) {
        if (data.person1.earliest_message === "") {
          data.person1.earliest_message = `${parseInt(
            date.split("/")[0]
          )}/${parseInt(date.split("/")[1])}/${parseInt(date.split("/")[2])}`;
        }
        if (message.includes("<This message was edited>")) {
          data.person1.edited++
        }

        data.person1.message_count++;
        data.person1.words = data.person1.words + message.split(" - ")[1].split(" ").length;
        if (message.includes("<Media omitted>")) data.person1.media++;
        data.person1.hearts += (
          message.match(new RegExp("❤️", "g")) || []
        ).length;
        data.person1.hearts += (
          message.match(new RegExp("😍", "g")) || []
        ).length;
      }

      if (message.includes(data.person2.name)) {
        if (data.person2.earliest_message === "") {
          data.person2.earliest_message = `${parseInt(
            date.split("/")[0]
          )}/${parseInt(date.split("/")[1])}/${parseInt(date.split("/")[2])}`;
        }
        if (message.includes("<This message was edited>")) {
          data.person2.edited++
        }
        data.person2.message_count++;
        data.person2.words = data.person2.words + message.split(" - ")[1].split(" ").length;
        if (message.includes("<Media omitted>")) data.person2.media++;
        data.person2.hearts += (
          message.match(new RegExp("❤️", "g")) || []
        ).length;
        data.person2.hearts += (
          message.match(new RegExp("😍", "g")) || []
        ).length;
      }

      if (data.time.first.day === 0) {
        data.time.first.day = parseInt(date.split("/")[0]);
        data.time.first.month = parseInt(date.split("/")[1]);
        data.time.first.year = parseInt(date.split("/")[2]);
      }

      if (data.stats.first_msg.name === "") {
        if (people.includes(name)) {
          data.stats.first_msg.name = removeEmojis(name).trim();
          data.stats.first_msg.formatted_date = `${parseInt(
            date.split("/")[0]
          )}/${parseInt(date.split("/")[1])}/${parseInt(date.split("/")[2])}`;
        }
      }
    }
  }


  let heart_text = ``;
  let edited_text = ``;
  let sub_heart_text = `Seemed to 
  <span class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-700">LOOOOOVVEEEEEEE</span>
  the 😍/❤️ Emoji.`;
  const gradient =
    "bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-500";

  data.person1.name = removeEmojis(data.person1.name);
  data.person2.name = removeEmojis(data.person2.name);

  data.person1.name = data.person1.name.trim()
  data.person2.name = data.person2.name.trim()

  if (data.person1.hearts > data.person2.hearts) {
    data.stats.hearts.more = {
      name: data.person1.name,
      count: data.person1.hearts,
    };
  } else {
    data.stats.hearts.more = {
      name: data.person2.name,
      count: data.person2.hearts,
    };
  }

  if (data.person1.edited != 0 && data.person2.edited != 0) {
    edited_text = `<p class="text-gray-400 mt-6"><span class="text-lg font-bold ${gradient}">${data.person1.name}</span> edited <span class="text-lg font-bold ${gradient}">${data.person1.edited}</span> Messages. <br>
    Where <span class="text-lg font-bold ${gradient}">${data.person2.name}</span> edited just around <span class="text-lg font-bold ${gradient}">${data.person2.edited}</span> Messages.</p>`
  }

  const b2bmsg = countConsecutiveMessages(splitted);
  data.person1.max_combo = b2bmsg[`${data.person1.name}`]
  data.person2.max_combo = b2bmsg[`${data.person2.name}`]
  if (data.person1.max_combo > data.person2.max_combo) {
    data.stats.combo = {
      name: data.person1.name,
      amount: data.person1.max_combo
    }
  } else {
    data.stats.combo = {
      name: data.person2.name,
      amount: data.person2.max_combo
    }
  }

  if (data.person1.hearts != 0 && data.person2.hearts != 0) {
    heart_text = `<p class="text-gray-400 mt-6">
  <span class="text-lg font-bold ${gradient}">${data.stats.hearts.more.name}</span> 
  ${sub_heart_text} They sent it 
  <span class="text-lg font-bold ${gradient}">${data.stats.hearts.more.count}</span> 
  Times</p>`;
  }

  data.person1.yap_level = EvaluateYapLevel(data.person1.words);
  data.person2.yap_level = EvaluateYapLevel(data.person2.words);

  const total_days = daysBetween(data.time);

  const newdata = `
  <h1 class="${gradient} text-5xl font-bold">Well hello there, ${data.person1.name} & ${data.person2.name}<span class="text-white">👋</span></h1>
  <p class="text-gray-200 mt-3 mb-4 text-2xl">Lets look at your Stats.</p>
  <p class="text-gray-400 mt-2">Over the course of
  <span class="text-lg font-bold ${gradient}">${total_days}</span>
  Days you both sent around 
  <span class="text-lg font-bold ${gradient}">${data.raw.messages.length}</span>
  Messages. Thats
  <span class="text-lg font-bold ${gradient}">${Math.round(data.raw.messages.length / total_days)}</span>
  Messages a Day...
  </p>
  
  <p class="text-gray-400 mt-4">While ${data.person1.name} sent 
  <span class="text-lg font-bold ${gradient}">${data.person1.message_count}</span> 
  Messages and 
  <span class="text-lg font-bold ${gradient}">${data.person1.media}</span> 
  Media Files <br>
  ${data.person2.name} sent 
  <span class="text-lg font-bold ${gradient}">${data.person2.message_count}</span>
  Messages and 
  <span class="text-lg font-bold ${gradient}">${data.person2.media}</span>
  Media Files</p>

  ${edited_text}

  <p class="text-gray-400 mt-6">Your Converstation, wich was started by 
  <span class="text-lg font-bold ${gradient}">${data.stats.first_msg.name}</span>
  on 
  <span class="text-lg font-bold ${gradient}">${data.time.first.day}/${data.time.first.month}/${data.time.first.year}</span>
  continiued on until
  <span class="text-lg font-bold ${gradient}">${data.time.last.day}/${data.time.last.month}/${data.time.last.year}</span> 
  </p>

  ${heart_text}

  <p class="text-gray-400 mt-6">
  <span class="text-lg font-bold ${gradient}">${data.person1.words + data.person2.words}</span> Words later, here we are...<br> 
  Dear <span class="text-lg font-bold ${gradient}">${data.person1.name}</span>, you said <span class="text-lg font-bold ${gradient}">${data.person1.words}</span> Words.
  <span class="text-lg font-bold ${gradient}">${data.person2.name}</span> on the other hand said <span class="text-lg font-bold ${gradient}">${data.person2.words}</span> Words.
  
  <br><br><span class="text-blue-500 mt-6 mb-6">Wich brings us to...</span><br><br>
  
  <span class="text-lg font-bold ${gradient}">${data.person1.name},${data.person2.name}</span>. The biggest (non media) back-to-back messaging streak goes to🥁🥁🥁 <br> 
  <span class="text-lg font-bold ${gradient}">${data.stats.combo.name}</span> with <span class="text-lg font-bold ${gradient}">${data.stats.combo.amount}</span> B2B Messages
  </p>

  <h3 class="mt-12 text-2xl text-white font-bold">Congrats, you both now know your stats with eachother...</h3>
  <p class="text-gray-400 text-lg mt-2">Why don't you take a screenshot and send it to them?</p>

  `;
  document.getElementById("statsdata").innerHTML = newdata;
}

async function Process() {
  const file = document.getElementById("filepicker").files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const arrayBuffer = e.target.result;
      JSZip.loadAsync(arrayBuffer).then(function (zip) {
        zip.forEach(function (relativePath, zipEntry) {
          zipEntry.async("string").then(function (content) {
            DoStats(content);
          });
        });
      });
    };
    reader.readAsArrayBuffer(file);
  }
}
