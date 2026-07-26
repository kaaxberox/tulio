const axios = require("axios");

async function getFullCoinData(coinId) {
  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coinId}`
    );

    const data = res.data;

    return {
      name: data.name,
      symbol: data.symbol.toUpperCase(),
      description: data.description?.en || "",
      rank: data.market_cap_rank,
      homepage: data.links?.homepage?.[0] || null,
      genesis: data.genesis_date || "Tidak diketahui",
      marketCap: data.market_data?.market_cap?.usd || 0,
      circulating: data.market_data?.circulating_supply || 0
    };

  } catch {
    return null;
  }
}

module.exports = { getFullCoinData };
