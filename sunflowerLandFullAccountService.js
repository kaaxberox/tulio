const axios = require("axios");

require("dotenv").config();
const farms = require("./farmList");

const BASE_URL = "https://sfl.world/api";


// ====================================
// 🔥 FIX TOKEN BISA NAMA ATAU ID
// ====================================
function getTokenByFarmId(input) {
  const farm = farms.find(f =>
    String(f.id) === String(input) ||
    f.name.toLowerCase() === String(input).toLowerCase()
  );

  if (!farm) return null;

  const name = farm.name.toLowerCase();

  if (name === "hani") return process.env.SFL_TOKEN_HANI;
  if (name === "ayun") return process.env.SFL_TOKEN_AYUN;
  if (name === "chanra") return process.env.SFL_TOKEN_CHANRA;
  if (name === "rafi") return process.env.SFL_TOKEN_RAFI;
  if (name === "thohir") return process.env.SFL_TOKEN_THOHIR;

  return null;
}


/**
 * Ambil semua data farm berdasarkan NFT ID atau NAMA
 */
async function getFullFarmData(id) {

  const farmFromName = farms.find(f =>
    f.name.toLowerCase() === String(id).toLowerCase()
  );

  if (farmFromName) {
    id = farmFromName.id;
  }

  try {

    // ==========================
    // 1️⃣ Coba sebagai farmId
    // ==========================
    try {
      const infoRes = await axios.get(
        `${BASE_URL}/v1/land/info/farm_id/${id}`
      );

      const landRes = await axios.get(
        `${BASE_URL}/v1.1/land/${id}`
      );

      return {
        account: infoRes.data,
        farm: landRes.data
      };

    } catch (err) {}

    // ==========================
    // 2️⃣ Coba sebagai NFT ID
    // ==========================
    try {
      const infoRes = await axios.get(
        `${BASE_URL}/v1/land/info/nft_id/${id}`
      );

      const landRes = await axios.get(
        `${BASE_URL}/v1.1/land/${id}`
      );

      return {
        account: infoRes.data,
        farm: landRes.data
      };

    } catch (err) {}

    // ==========================
    // 3️⃣ Fallback ke JWT (JWS)
    // ==========================
    const token = getTokenByFarmId(id);

    if (token) {
      try {

        const visitRes = await axios.get(
          `https://api.sunflower-land.com/visit/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "User-Agent": "Mozilla/5.0",
              "Accept": "application/json",
              "Origin": "https://sunflower-land.com",
              "Referer": "https://sunflower-land.com/"
            }
          }
        );

        const raw = visitRes.data;

        const farmState =
          raw?.visitedFarmState ||
          raw?.state ||
          raw?.farm ||
          {};

        return {
          farm: {
            achievements:
              farmState?.achievements ||
              farmState?.bumpkin?.achievements ||
              {},

            inventory:
              farmState?.inventory ||
              {},

            skills:
              farmState?.bumpkin?.skills ||
              {}
          }
        };

      } catch (visitErr) {
        console.log(
          "JWT VISIT ERROR:",
          visitErr.response?.data || visitErr.message
        );
      }
    }

    throw new Error("ID tidak dikenali.");

  } catch (err) {
    console.log("FINAL ERROR:", err.message);
    throw new Error("Farm tidak ditemukan.");
  }
}




 


function formatFullData(data) {
  if (!data) return "Data farm tidak ditemukan.";

  const account = data.account || {};
  const farm = data.farm || {};

  const LINE = "════════════════════";

  let text = "🌻 SUNFLOWER LAND FARM 🌻\n";
  text += LINE + "\n\n";

  // ===== ACCOUNT INFO =====
  text += LINE + "\n";
  text += "👤 ACCOUNT INFO\n\n";

  Object.entries(account).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      text += key + " : " + value + "\n";
    }
  });

  text += "\n";

  function getEmoji(key) {
    const k = key.toLowerCase();

    if (k.includes("land")) return "🌍";
    if (k.includes("bumpkin")) return "🧑‍🌾";
    if (k.includes("skill")) return "🧠";
    if (k.includes("vip")) return "💎";
    if (k.includes("ban")) return "🚫";
    if (k.includes("legacy")) return "📜";
    if (k.includes("level")) return "⭐";
    if (k.includes("balance")) return "💰";

    return "📁";
  }

  function formatTitle(key) {
    return key.replace(/_/g, " ").toUpperCase();
  }

  function renderSection(title, value) {
    text += LINE + "\n";
    text += getEmoji(title) + " " + formatTitle(title) + "\n\n";

    if (Array.isArray(value)) {
      if (value.length === 0) {
        text += "Empty\n";
      } else {
        value.forEach((item, i) => {
          text += "[" + i + "] " + JSON.stringify(item) + "\n";
        });
      }
    }

    else if (typeof value === "object" && value !== null) {
      Object.entries(value).forEach(([key, val]) => {

        if (val === null || val === undefined) return;

        if (typeof val === "object") {
          renderSection(key, val);
        } else {
          text += key + " : " + val + "\n";
        }

      });
    }

    text += "\n";
  }

  // ===== FARM DATA =====
  Object.entries(farm).forEach(([key, value]) => {
    renderSection(key, value); // 🔥 SEKARANG ARRAY JUGA JADI SECTION
  });

  return text.trim();
}






module.exports = {
  getFullFarmData,
  formatFullData,
};
