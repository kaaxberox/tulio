const axios = require("axios");
const Fuse = require("fuse.js");

let coinList = [];
let fuse = null;
let lastRequestTime = 0;

// ================= POPULAR SYMBOL OVERRIDE =================
const symbolPriority = {
    pol: "polygon",           // Prioritaskan 'pol' untuk Polygon (MATIC)
    polygon: "ex-matic",   // Prioritaskan 'matic' untuk Polygon (MATIC)
    btc: "bitcoin",
    eth: "ethereum",
    bnb: "binancecoin",
    xrp: "ripple",
    sol: "solana",
    ada: "cardano",
    doge: "dogecoin",
    trx: "tron"
};

// ================= RATE LIMIT =================
async function delayIfNeeded() {
    const now = Date.now();
    if (now - lastRequestTime < 1200) {
        await new Promise(r => setTimeout(r, 1200));
    }
    lastRequestTime = Date.now();
}

// ================= FETCH USD TO IDR EXCHANGE RATE =================
async function getUsdToIdrRate() {
    try {
        const res = await axios.get("https://api.exchangerate-api.com/v4/latest/USD");
        return res.data.rates.IDR;
    } catch (error) {
        console.log("Error fetching USD to IDR rate:", error);
        return 15000;  // Default fallback to 1 USD = 15,000 IDR
    }
}

// ================= FETCH PRICE =================
async function fetchPrice(coin) {
    await delayIfNeeded();

    // Fetch the price in USD from CoinGecko
    const res = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd&include_24hr_change=true`
    );

    const data = res.data[coin.id];
    if (!data) return null;

    // Convert USD to IDR
    const usdToIdr = await getUsdToIdrRate();
    const priceInIdr = data.usd * usdToIdr;

    return {
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        priceUsd: data.usd,
        priceIdr: priceInIdr,
        change: data.usd_24h_change ?? null
    };
}

// ================= FIND COIN =================
async function findCrypto(text) {
    const words = cleanInput(text);
    if (!words.length) return null;

    const fullSentence = words.join(" ");

    // 1️⃣ Exact Symbol Strict
    for (let word of words) {
        if (/^[a-z]{2,5}$/.test(word)) {
            const symbolMatch = getBestSymbolMatch(word);
            if (symbolMatch) {
                return await fetchPrice(symbolMatch);
            }
        }
    }

    // 2️⃣ Exact Full Name
    const exactName = coinList.find(c => c.name.toLowerCase() === fullSentence);
    if (exactName) {
        return await fetchPrice(exactName);
    }

    // 3️⃣ Exact Word Name
    for (let word of words) {
        const exactWord = coinList.find(c => c.name.toLowerCase() === word);
        if (exactWord) {
            return await fetchPrice(exactWord);
        }
    }

    // 4️⃣ Super Strict Fuzzy Search
    if (fullSentence.length > 4) {
        const result = fuse.search(fullSentence);
        if (result.length) {
            const candidate = result[0].item;
            if (candidate.name.toLowerCase().includes(fullSentence)) {
                return await fetchPrice(candidate);
            }
        }
    }

    return null;
}

// ================= LOAD DATABASE =================
async function loadCoinDatabase() {
    console.log("Loading full coin database...");

    const res = await axios.get("https://api.coingecko.com/api/v3/coins/list");
    coinList = res.data;

    // Filter CoinGecko to include only Polygon (MATIC)
    const polygon = coinList.find(c => c.id === 'polygon'); // Filter Polygon by ID
    console.log("Polygon (MATIC) found in coinList:", polygon);

    fuse = new Fuse(coinList, {
        keys: ["name"],
        threshold: 0.10,   // sangat ketat
        ignoreLocation: true
    });

    console.log("Total coins loaded:", coinList.length);
}

// ================= PICK BEST SYMBOL MATCH =================
function getBestSymbolMatch(symbol) {
    const s = symbol.toLowerCase();

    // Prioritas manual untuk 'pol' dan 'matic'
    if (symbolPriority[s]) {
        const exact = coinList.find(c => c.id === symbolPriority[s]);
        if (exact) return exact;
    }

    // Cek dulu kalau ada yang cocok dengan symbol + name (contoh: "pol" → matic-network dulu)
    const priorityMatches = coinList.filter(c => (
        (s === "pol" && c.id === "polygon") || // khusus override untuk 'pol' jadi 'polygon' (Polygon MATIC)
        c.symbol.toLowerCase() === s
    ));
    if (priorityMatches.length) {
        return priorityMatches[0];
    }

    // Jika tidak ditemukan, fallback biasa
    const matches = coinList.filter(c => c.symbol.toLowerCase() === s);
    if (!matches.length) return null;
    if (matches.length === 1) return matches[0];

    // Pilih yang ID paling pendek (biasanya coin utama)
    matches.sort((a, b) => a.id.length - b.id.length);
    return matches[0];
}

// ================= CLEAN INPUT =================
const stopWords = [
    "harga", "price", "cek", "berapa", "coin",
    "market", "hari", "ini", "dong",
    "coba", "kan", "tolong", "lihat",
    "sih", "ya", "sekarang", "apa",
    "itu", "nilai", "update"
];

function cleanInput(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .split(" ")
        .filter(word => word && !stopWords.includes(word));
}

module.exports = { loadCoinDatabase, findCrypto };
