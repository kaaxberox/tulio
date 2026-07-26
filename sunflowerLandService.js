const axios = require('axios');
const fs = require('fs');

// Fungsi untuk mendapatkan harga resource dari Sunflower Land dan update ke file JSON
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
    const data = JSON.parse(fs.readFileSync("./sflPrices.json")); // Membaca data dari sflPrices.json

    // Debugging: Tampilkan data yang diambil
    console.log("Data Resource:", data);

    // Mencocokkan resource dengan case-insensitive
    const resourceKey = Object.keys(data).find(key => key.toLowerCase() === resourceName.toLowerCase());

    if (!resourceKey) {
      console.log(`❌ Resource "${resourceName}" tidak ditemukan.`);
      return null;  // Jika resource tidak ditemukan
    }

    console.log(`💎 Resource ${resourceName} ditemukan dengan harga: ${data[resourceKey]}`);
    return data[resourceKey];  // Mengembalikan harga resource
  } catch (err) {
    console.error("❌ Error membaca file JSON:", err.message);
    return null;  // Jika terjadi error saat membaca file
  }
}

// Fungsi untuk mendapatkan harga semua resource dari file JSON dan memastikan data ditampilkan
function getAllResources() {
  try {
    const data = JSON.parse(fs.readFileSync("./sflPrices.json")); // Membaca data dari sflPrices.json

    // Debugging: Tampilkan data semua resource
    console.log("Data Semua Resource:", data);

    // Memaksa untuk menampilkan harga setiap resource
    let allResources = [];
    Object.keys(data).forEach(resourceKey => {
      allResources.push(`${resourceKey}: ${data[resourceKey]} Flower`);
    });

    if (allResources.length === 0) {
      console.log("❌ Tidak ada resource yang tersedia.");
    }

    return allResources;  // Mengembalikan daftar harga semua resource
  } catch (err) {
    console.error("❌ Error membaca file JSON:", err.message);
    return ["❌ Gagal mengambil data resource."];
  }
}

module.exports = {
  updateSFLPrices,
  getLocalResourcePrice,
  getAllResources
};
