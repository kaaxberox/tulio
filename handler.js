const { askAI } = require("./aiService");
const { getLocalResourcePrice, getAllResources } = require("./sunflowerLandService");  // Mengimpor fungsi untuk mendapatkan semua resource
const { findCrypto } = require("./crypto");
const { getFullFarmData, formatFullData } = require("./sunflowerLandFullAccountService");
const farms = require("./farmList");

const fs = require("fs");


async function handleMessage(input) {
  const lower = input.toLowerCase();

  // Menggunakan OpenRouter untuk mendeteksi konteks
  const context = await askAI(input);  // OpenRouter mendeteksi konteks
  
console.log("RAW CONTEXT RESPONSE:", context); // ← TARUH DI SINI
  const cleanContext = context.replace(/^"|"$/g, '').trim();  // Menghapus kutip di context

  console.log("Detected Context:", cleanContext);  // Debugging: Menampilkan konteks yang terdeteksi

  if (cleanContext === "resource") {

  const lowerInput = input.toLowerCase();

  // 🔥 Kalau minta semua
  if (
    lowerInput.includes("semua") &&
    lowerInput.includes("resource")
  ) {
    const allResources = getAllResources();
    return `🔍 Berikut semua resource:\n\n${allResources.join("\n")}`;
  }

  // 🔥 Ambil semua resource dari JSON
  const allResources = JSON.parse(fs.readFileSync("./sflPrices.json"));

  const foundKey = Object.keys(allResources).find(key =>
    lowerInput.includes(key.toLowerCase())
  );

  if (foundKey) {
    const price = getLocalResourcePrice(foundKey);
    return `💎 Harga ${foundKey}: ${price} Flower`;
  }

  return "❌ Resource tidak ditemukan di Sunflower Land.";
}



  // ================================
// 3️⃣ Jika Terkait Harga Cryptocurrency (Dari hasil AI)
// ================================
if (cleanContext === "cryptocurrency") {
  const crypto = await findCrypto(input);  // Mengambil harga cryptocurrency

  if (crypto) {
    const priceUsd = Number(crypto.priceUsd || 0);
    const priceIdr = Number(crypto.priceIdr || 0);
    const change = Number(crypto.change || 0);

    const trend = change > 0 ? "📈 Naik" : change < 0 ? "📉 Turun" : "⚖️ Stabil";

    let analysis = `${crypto.name} (${crypto.symbol}) saat ini dihargai 💵 $${priceUsd.toFixed(2)}.\n` +
      `Harga saat ini menunjukkan perubahan sebesar ${change.toFixed(2)}% dalam 24 jam terakhir.\n` +
      `Jika dilihat dalam tren jangka pendek, harga ${change > 0 ? 'telah naik' : change < 0 ? 'telah turun' : 'tetap stabil'}.\n` +
      `Pada saat ini, harga di pasar IDR adalah 💰 Rp${priceIdr.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}. \n` +
      `Ini menunjukkan pergerakan yang signifikan bagi investor jangka pendek.\n` +
      `Secara keseluruhan, ${crypto.name} masih menunjukkan ${change > 0 ? 'pertumbuhan yang positif' : change < 0 ? 'penurunan' : 'kestabilan'} dalam harga.`;

    const response = (
      `📊 *${crypto.name}* (${crypto.symbol})\n` +
      `💵 Harga USD: $${priceUsd.toLocaleString("en-US")}\n` +
      `💰 Harga IDR: Rp${priceIdr.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}\n` +
      `🔺 Perubahan 24H: ${change.toFixed(2)}%\n` +
      ` Tren: ${trend}\n\n` +
      `📝 *Analisis*:\n${analysis}`
    );
    console.log("Response (Crypto):", response);  // Debugging: Tampilkan respons
    return response;
  } else {
    const response = "❌ Coin tidak ditemukan di database CoinGecko.";
    console.log("Response (Crypto):", response);  // Debugging: Tampilkan respons
    return response;
  }
}



if (cleanContext === "farm_account") {

  const lowerInput = input.toLowerCase();

  // 🔥 Bersihkan tanda baca & pecah kata
  const words = lowerInput
    .replace(/[^\w\s]/g, "")
    .split(/\s+/);

  let selectedFarm;

  // =====================================
  // 1️⃣ CARI BERDASARKAN NAMA
  // =====================================
  selectedFarm = farms.find(f =>
    words.includes(f.name.toLowerCase())
  );

  // =====================================
  // 2️⃣ CARI BERDASARKAN ID (farmId / nftId)
  // =====================================
  if (!selectedFarm) {

    const match = lowerInput.match(/\d+/);

    if (match) {
      const inputId = match[0];

      selectedFarm = farms.find(f => f.id === inputId);

      // 🔥 Kalau ID tidak ada di farmList → tetap izinkan cek langsung
      if (!selectedFarm) {
        try {
          const data = await getFullFarmData(inputId);
          return formatFullData(data);
        } catch {
          return "❌ Farm tidak ditemukan.";
        }
      }
    }
  }

  // =====================================
  // 3️⃣ RANDOM JIKA TIDAK SEBUT APA-APA
  // =====================================
  if (!selectedFarm) {
    const randomIndex = Math.floor(Math.random() * farms.length);
    selectedFarm = farms[randomIndex];
  }

  // =====================================
  // 4️⃣ AMBIL DATA FARM
  // =====================================
  try {
    const data = await getFullFarmData(selectedFarm.id);
    return formatFullData(data);
  } catch (err) {
    console.log("ERROR:", err.response?.data || err.message);
    return "❌ Farm tidak ditemukan atau API error.";
  }
}





  // ================================
  // 3️⃣ Jika Tidak Berkaitan dengan Cryptocurrency atau Resource
  // ================================
  // Kirimkan ke OpenRouter untuk percakapan bebas
  return await askAI(input);  // Menggunakan OpenRouter untuk percakapan bebas
}

module.exports = { handleMessage };
