const Parser = require("rss-parser");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const parser = new Parser();

const accounts = [
  { name: "Sunflower Land", url: "https://nitter.net/0xSunflowerLand/rss" },
  { name: "RollerCoin", url: "https://nitter.net/rollercoin_com/rss" },
  { name: "Chainers", url: "https://nitter.net/chainersgame/rss" },
  { name: "Crypto Wave", url: "https://nitter.net/CryptoWaveID/rss" }
];

const LAST_TWEET_FILE = "./lastTweets.json";

function loadLastTweets() {
  if (fs.existsSync(LAST_TWEET_FILE)) {
    return JSON.parse(fs.readFileSync(LAST_TWEET_FILE));
  }
  return {};
}

function saveLastTweets(data) {
  fs.writeFileSync(LAST_TWEET_FILE, JSON.stringify(data, null, 2));
}

let lastTweets = loadLastTweets();

function cleanHTML(text) {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function extractImage(item) {
  if (!item) return null;

  if (item.enclosure?.url) return item.enclosure.url;

  if (item["media:content"]?.length > 0)
    return item["media:content"][0].url;

  if (item.content) {
    const match = item.content.match(/src="([^"]+)"/);
    if (match) return match[1];
  }

  return null;
}

function formatTanggalIndo(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }) + " WIB";
}

// 🔥 Translate kecuali Crypto Wave
async function translateToIndo(text, accountName) {
  if (!text || text.length < 5) return text;
  if (accountName === "Crypto Wave") return text;

  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Terjemahkan ke Bahasa Indonesia secara natural tanpa tambahan."
          },
          { role: "user", content: text }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.data?.choices?.[0]?.message?.content?.trim() || text;

  } catch {
    return text;
  }
}

async function checkXNews() {
  let results = [];

  for (const acc of accounts) {
    try {
      console.log("Checking", acc.name);

      const feed = await parser.parseURL(acc.url);
      if (!feed.items.length) continue;

      if (!lastTweets[acc.name]) lastTweets[acc.name] = [];

      for (let i = 0; i < feed.items.length; i++) {

        const item = feed.items[i];

        if (lastTweets[acc.name].includes(item.link)) continue;

        let image = extractImage(item);

        let text = cleanHTML(item.title || "");
        if (item.content) {
          text += "\n\n" + cleanHTML(item.content);
        }
        text = text.trim();

        // ==========================================
        // 🔥 SUPER FIX CRYPTO WAVE THREAD
        // ==========================================
        if (acc.name === "Crypto Wave") {

          const mainId = item.link.split("/status/")[1];

          if (!text || text.length < 5) {

            for (let j = i + 1; j < feed.items.length; j++) {

              const reply = feed.items[j];

              if (!reply.link.includes(mainId)) continue;

              let replyText = cleanHTML(reply.title || "");
              if (reply.content) {
                replyText += "\n\n" + cleanHTML(reply.content);
              }

              replyText = replyText.trim();

              if (replyText.length > 20) {
                text = replyText;
                break;
              }
            }
          }

          if (!text || text.length < 5) continue;
        }

        // ==========================================
        // Jika cuma gambar → cari teks reply (akun lain juga)
        // ==========================================
        if (image && text.length < 10) {
          for (let j = i + 1; j < feed.items.length; j++) {

            const reply = feed.items[j];

            let replyText = cleanHTML(reply.title || "");
            if (reply.content) {
              replyText += "\n\n" + cleanHTML(reply.content);
            }

            replyText = replyText.trim();

            if (replyText.length > 15) {
              text = replyText;
              break;
            }
          }
        }

        if (!text || text.length < 5) continue;

        // 🔥 Translate kecuali Crypto Wave
        text = await translateToIndo(text, acc.name);

        const message =
`📰 *${acc.name}*

📢 ${text}

🔗 Link:
${item.link}

🗓 Tanggal:
${formatTanggalIndo(item.pubDate)}`;

        results.push({
          text: message,
          image: image || null
        });

        lastTweets[acc.name].push(item.link);
        break; // hanya kirim 1 news per akun
      }

    } catch (err) {
      console.log("Error", acc.name, err.message);
    }
  }

  saveLastTweets(lastTweets);
  return results;
}

module.exports = checkXNews;
