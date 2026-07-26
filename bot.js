require("dotenv").config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const checkXNews = require("./xNewsService");
const qrcode = require("qrcode-terminal");
const pino = require("pino");

const { handleMessage } = require("./handler");
const { loadCoinDatabase } = require("./crypto");
const { updateSFLPrices } = require("./sunflowerLandService");

async function updatePricesPeriodically() {
  setInterval(async () => {
    console.log("Updating Sunflower Land resource prices...");
    await updateSFLPrices();
    console.log("SFL prices updated.");
  }, 3600000);
}

async function startBot() {
  console.log("Updating Sunflower Land resource prices...");
  await updateSFLPrices();
  console.log("SFL prices updated.");

  updatePricesPeriodically();

  console.log("Loading coin database...");
  await loadCoinDatabase();
  console.log("Coin database loaded.");

  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);
  let newsIntervalStarted = false;

  sock.ev.on("connection.update", async (update) => {

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.clear();
      console.log("Scan QR:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.clear();
      console.log("Bot Online");

      const GROUP_ID = "120363348984597473@g.us";

      const firstNews = await checkXNews();
      console.log("FIRST NEWS:", firstNews);

      if (firstNews.length > 0) {
        for (const item of firstNews) {

          if (item.image && item.image.startsWith("http")) {

            await sock.sendMessage(GROUP_ID, {
              image: { url: item.image },
              caption: item.text
            });

          } else {

            await sock.sendMessage(GROUP_ID, {
              text: item.text
            });

          }

        }
      }

      if (!newsIntervalStarted) {
        newsIntervalStarted = true;

        setInterval(async () => {
          const news = await checkXNews();

          if (news.length > 0) {
            for (const item of news) {

              if (item.image && item.image.startsWith("http")) {

                await sock.sendMessage(GROUP_ID, {
                  image: { url: item.image },
                  caption: item.text
                });

              } else {

                await sock.sendMessage(GROUP_ID, {
                  text: item.text
                });

              }

            }
          }
        }, 300000);
      }
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("Reconnecting...");
        startBot();
      } else {
        console.log("Logged out.");
      }
    }
  });

  

  sock.ev.on("messages.upsert", async (m) => {
    console.log("PESAN MASUK TERDETEKSI");
    try {
      const msg = m.messages[0];
      
      if (!msg.message || msg.key.fromMe) return;
      

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text;

      if (!text || !text.startsWith("!p2ecryptobot")) return;

      const input = text.replace("!p2ecryptobot", "").trim();
      if (!input) return;

      await sock.sendPresenceUpdate("composing", msg.key.remoteJid);

      const reply = await handleMessage(input);

      await sock.sendMessage(
        msg.key.remoteJid,
        { text: reply },
        { quoted: msg }
      );
    } catch (err) {
      console.log("Message error:", err.message);
    }
  });

}

startBot();
