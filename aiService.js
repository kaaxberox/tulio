require("dotenv").config();

const axios = require("axios");
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Fungsi untuk mendapatkan penjelasan dari AI
async function askAI(prompt) {
  try {
    const lowerCasePrompt = prompt.toLowerCase();

    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
Anda adalah asisten cerdas yang terampil dalam cryptocurrency dan Sunflower Land.

Jika pengguna menanyakan harga resource Sunflower Land 
(seperti stone, wood, gold, harga semua resource, dll),
balas hanya dengan: resource

Jika pengguna menanyakan harga cryptocurrency 
(seperti bitcoin, ethereum, dll),
balas hanya dengan: cryptocurrency

Jika pengguna menanyakan tentang akun/farm/id farm/nft id Sunflower Land,
balas hanya dengan: farm_account

Jika pertanyaan tidak termasuk kategori di atas,
jawab secara normal dan natural seperti AI biasa.

JANGAN menjelaskan kategori.
Jika mengembalikan kategori, jawab hanya satu kata saja.
`,
          },
          { role: "user", content: lowerCasePrompt },
        ],
        temperature: 0.5,
        max_tokens: 100,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost",
          "X-Title": "p2ecryptobot"
        },
      }
    );

    let cleanResponse = res.data.choices[0].message.content.trim();

    cleanResponse = cleanResponse.replace(/^"|"$/g, '').trim();
    cleanResponse = cleanResponse.replace(/[.,!?]$/, '').trim();

    return cleanResponse;

  } catch (err) {
    console.log("OPENROUTER ERROR:", err.response?.data || err.message);
    return "❌ AI sedang bermasalah.";
  }
}

module.exports = { askAI };
