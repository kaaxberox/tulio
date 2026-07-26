const puppeteer = require("puppeteer");

let browser;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });
  }
  return browser;
}

async function getFarmFromVisitId(farmId) {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    await page.setRequestInterception(true);

    let farmData = null;

    page.on("request", (req) => {
      const type = req.resourceType();

      // ❌ Block asset berat
      if (["image", "media", "font", "stylesheet"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    page.on("response", async (res) => {
      const url = res.url();

      // 🔥 Tangkap request internal yang mengandung farm data
      if (url.includes("/api/") && url.includes("land")) {
        try {
          const json = await res.json();
          farmData = json;
        } catch {}
      }
    });

    await page.goto(
      `https://sunflower-land.com/play/#/visit/${farmId}`,
      { waitUntil: "domcontentloaded", timeout: 20000 }
    );

    // Tunggu max 3 detik saja
    await page.waitForTimeout(3000);

    if (!farmData) {
      throw new Error("Data tidak ditemukan.");
    }

    return farmData;

  } finally {
    await page.close();
  }
}

module.exports = { getFarmFromVisitId };


//tandain mau di hapus nanti