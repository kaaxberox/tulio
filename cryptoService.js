const axios = require('axios');
const fs = require('fs');

// Fungsi untuk mendapatkan harga resource dari Sunflower Land
async function updateSFLPrices() {
  try {
    const response = await axios.get('https://sfl.world/api/v1/prices');
    const prices = response.data.data.p2p;

    // Simpan harga resource ke file JSON
    fs.writeFileSync(
      "./sflPrices.json",
      JSON.stringify(prices, null, 2)
    );

    console.log("✅ SFL prices updated");
  } catch (err) {
    console.error("❌ Gagal update SFL:", err.message);
  }
}

// Fungsi untuk mendapatkan harga resource tertentu dari file JSON
function getLocalResourcePrice(resourceName) {
  try {
    const data = JSON.parse(fs.readFileSync("./sflPrices.json"));

    const resourceKey = Object.keys(data).find(key => key.toLowerCase() === resourceName.toLowerCase());

    if (!resourceKey) return null;

    return data[resourceKey];
  } catch {
    return null;
  }
}

module.exports = {
  updateSFLPrices,
  getLocalResourcePrice
};
