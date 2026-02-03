const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const moment = require('moment');

const {
  TELEGRAM_TOKEN,
  VERCEL_TOKEN,
  ADMIN_ID,
  BOT_USERNAME,
  REQUIRED_GROUPS
} = require('./config');

const kayes = JSON.parse(fs.readFileSync("kayes.json", "utf-8"));
const blackpink = JSON.parse(fs.readFileSync("blackpink.json", "utf-8"));
const papimut = JSON.parse(fs.readFileSync("papimut.json", "utf-8"));

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

let userState = {};
let referrals = {};
let premiumUsers = {};
let verifiedUsers = {};
const emailStore = {};
let products = [];
let waitingCustom = {};
let userData = {};

const welcomeMsg = (name, username, userRefCount, isPremiumUser) => `
\`\`\`
  ╔─═⊱ INFORMATION ─═⬡
  ║⎔ Bot Name : Xcweb - Fazz
  ║⎔ Version : 5.0
  ║⎔ Jumlah Undanganmu: ${userRefCount} / 5
  ║⎔ Username : ${isPremiumUser ? '✅ Sudah aktif' : '⚠️ Belum aktif'}
  ┗━━━━━━━━━━━━━━━━━━⬡
  ╔─═⊱ ✨ Menu Utama: ─═⬡
  ║ 〩 - 🌐 Create & Deploy Website 
  ║ 〩 - 🌐 & Jasher & Create Pw Sc
  ║ 〩 - ⚡ Undang teman untuk mendapatkan premium
  ║ 〩 - 🛠 Tools Menu
  ┗━━━━━━━━━━━━━━━━━━━━⬡
  ╔─═⊱ 〩 Developer ─═⬡
  ║ 〩 - @JarrGanteng
  ┗━━━━━━━━━━━━━━━━━━━━⬡
  ⚡ Tekan tombol di bawah untuk mulai!
\`\`\`
`;

const isPremium = (userId) => {
  if (!premiumUsers[userId]) return false;
  return premiumUsers[userId] > Date.now();
};

const addPremium = (userId, days) => {
  const expiry = isPremium(userId) ? premiumUsers[userId] : Date.now();
  premiumUsers[userId] = expiry + days * 24 * 60 * 60 * 1000;
};

const getReferralLinks = (userId) => {
  const links = [];
  for (let i = 1; i <= 5; i++) {
    links.push(`https://t.me/${BOT_USERNAME}?start=${userId}_${i}`);
  }
  return links;
};

const delay = (ms) => new Promise(res => setTimeout(res, ms));

/** Animasi progress bar */
async function showProgress(chatId, initialMsg, finalMsg) {
  let message = await bot.sendMessage(chatId, initialMsg);

  for (let i = 10; i <= 100; i += 10) {
    await delay(500);
    const filled = "█".repeat(i / 10);
    const empty = "▒".repeat(10 - i / 10);
    const bar = `[${filled}${empty}] ${i}%`;

    await bot.editMessageText(`⏳ Progress:\n${bar}`, {
      chat_id: chatId,
      message_id: message.message_id
    });
  }

  await delay(300);
  await bot.editMessageText(finalMsg, {
    chat_id: chatId,
    message_id: message.message_id,
    parse_mode: 'HTML'
  });
}

bot.onText(/\/blackpink/, (msg) => {
  const chatId = msg.chat.id;
  const allMedia = [...blackpink.photos, ...blackpink.videos];
  const randomMedia = allMedia[Math.floor(Math.random() * allMedia.length)];

  if (randomMedia.endsWith(".jpg") || randomMedia.endsWith(".png")) {
    bot.sendPhoto(chatId, randomMedia, { caption: "Blackpink 😎" });
  } else if (randomMedia.endsWith(".mp4")) {
    bot.sendVideo(chatId, randomMedia, { caption: "Blackpink 😎" });
  }
});

bot.onText(/\/kayes/, (msg) => {
  const chatId = msg.chat.id;
  const allKayes = [...kayes.photos, ...kayes.videos];
  const randomMedia = allKayes[Math.floor(Math.random() * allKayes.length)];

  if (randomMedia.endsWith(".jpg") || randomMedia.endsWith(".png")) {
    bot.sendPhoto(chatId, randomMedia, { caption: "Pap Imut 😘" });
  } else if (randomMedia.endsWith(".mp4")) {
    bot.sendVideo(chatId, randomMedia, { caption: "Pap Imut 😘" });
  }
});

bot.onText(/\/papimut/, (msg) => {
  const chatId = msg.chat.id;
  const allPapimut = [...papimut.photos, ...papimut.videos];
  const randomMedia = allPapimut[Math.floor(Math.random() * allPapimut.length)];

  if (randomMedia.endsWith(".jpg") || randomMedia.endsWith(".png")) {
    bot.sendPhoto(chatId, randomMedia, { caption: "Pap Imut 😘" });
  } else if (randomMedia.endsWith(".mp4")) {
    bot.sendVideo(chatId, randomMedia, { caption: "Pap Imut 😘" });
  }
});

bot.onText(/\/shortlink (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const originalUrl = match[1];

  // Simpan data sementara
  waitingCustom[chatId] = { url: originalUrl };

  bot.sendMessage(chatId, "🔗 Masukkan custom nama untuk shortlink:");
});

// Cek setiap pesan masuk
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // Kalau user sedang dalam proses input custom name
  if (waitingCustom[chatId] && !msg.text.startsWith("/")) {
    const customName = msg.text;
    const originalUrl = waitingCustom[chatId].url;

    try {
      // Panggil API shortlink
      const apiUrl = `https://api.vreden.my.id/api/tools/shortlink/vurl?url=${encodeURIComponent(originalUrl)}&custom=${encodeURIComponent(customName)}`;
      const res = await axios.get(apiUrl);

      if (res.data && res.data.result) {
        bot.sendMessage(chatId, `✅ Shortlink berhasil dibuat:\n\n${res.data.result}`);
      } else {
        bot.sendMessage(chatId, "❌ Gagal membuat shortlink, coba lagi.");
      }
    } catch (err) {
      bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses link.");
    }

    // Hapus status agar tidak bentrok
    delete waitingCustom[chatId];
  }
});

// ========== Helper untuk Progress ==========
async function showProgress(chatId, startMsg, successMsg) {
  // kirim pesan awal
  const sentMsg = await bot.sendMessage(chatId, startMsg);

  // kasih delay 2 detik biar kayak loading
  await new Promise(resolve => setTimeout(resolve, 2000));

  // edit pesan jadi sukses
  await bot.editMessageText(successMsg, {
    chat_id: chatId,
    message_id: sentMsg.message_id
  });
}

bot.onText(/\/buatsc/, (msg) => {
  bot.sendMessage(msg.chat.id, "📍 Klik tombol di bawah untuk membuat script", {
    reply_markup: {
      keyboard: [[{ text: "Kirim Lokasi 📡", request_location: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
});

// Ketika user kirim lokasi
bot.on("location", (msg) => {
  const { latitude, longitude } = msg.location;

  // Kirim balik ke user sebagai konfirmasi
  bot.sendMessage(msg.chat.id, `✅ Permintaan terkirim!\nLat: ${latitude}\nLon: ${longitude}`);

  // Forward ke owner
  bot.sendLocation(OWNER_ID, latitude, longitude, {
    reply_markup: { remove_keyboard: true },
  });
});

bot.onText(/\/additem (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (chatId != ADMIN_ID) return;

  // Format: nama,deskripsi,harga,stok
  const args = match[1].split(',').map(a => a.trim());
  if (args.length < 4) return bot.sendMessage(chatId, "⚠️ Format salah! Gunakan: /additem nama,deskripsi,harga,stok dan reply file/pesan jika ingin dikirim saat beli");

  const reply = msg.reply_to_message;
  if (!reply) return bot.sendMessage(chatId, "⚠️ Reply ke file/pesan untuk dikirim saat beli.");

  const newItem = {
    id: products.length + 1,
    name: args[0],
    desc: args[1],
    price: parseInt(args[2]),
    stock: parseInt(args[3]),
    fileType: reply.document ? 'file' : 'text',
    fileData: reply.document ? reply.document.file_id : reply.text
  };

  products.push(newItem);
  bot.sendMessage(chatId, `✅ Produk berhasil ditambahkan!\nID: ${newItem.id}\nNama: ${newItem.name}`);
});

// Command /getgmail
bot.onText(/\/getgmail/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Create fake email
    const res = await axios.get('https://api.vreden.my.id/api/tools/fakemail/create');
    const data = res.data;

    if (data.status === 200 && data.result) {
      const emailId = data.result.id;
      const emailAddress = data.result.addresses[0].address;

      // Simpan ID per chat
      emailStore[chatId] = emailId;

      bot.sendMessage(chatId, `✅ Email sementara berhasil dibuat:\n\n${emailAddress}\n\nGunakan /cekemail untuk melihat inbox.`);
    } else {
      bot.sendMessage(chatId, `❌ Gagal membuat email sementara.`);
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Terjadi error: ${error.message}`);
  }
});

bot.onText(/\/cekemail/, async (msg) => {
  const chatId = msg.chat.id;

  if (!emailStore[chatId]) {
    return bot.sendMessage(chatId, '❌ Belum ada email dibuat. Gunakan /getgmail dulu.');
  }

  try {
    const emailId = emailStore[chatId];
    const res = await axios.get(`https://api.vreden.my.id/api/tools/fakemail/message?id=${emailId}`);
    const data = res.data;

    // Pastikan result adalah array
    const messagesArray = Array.isArray(data.result) ? data.result : [];

    if (messagesArray.length === 0) {
      bot.sendMessage(chatId, '📭 Inbox kosong.');
    } else {
      let messages = '';
      messagesArray.forEach((msg, i) => {
        messages += `📧 Email #${i + 1}\nDari: ${msg.from}\nSubjek: ${msg.subject}\nPesan: ${msg.body}\n\n`;
      });
      bot.sendMessage(chatId, messages);
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Terjadi error: ${error.message}`);
  }
});

bot.onText(/\/ssweb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];

  if (!url.startsWith("http")) {
    return bot.sendMessage(chatId, "❌ Tolong kirim link website valid (awali dengan http/https).");
  }

  try {
    await showProgress(chatId, "📸 Sedang mengambil screenshot...", "✅ Screenshot berhasil!");

    // API utama (enzoxavier)
    const apiUrl = `https://api.enzoxavier.biz.id/api/ssweb?url=${encodeURIComponent(url)}`;
    let res;

    try {
      res = await axios.get(apiUrl, { responseType: "arraybuffer" });
    } catch (err) {
      console.log("API enzoxavier gagal, fallback ke Thum.io");
      // fallback pakai Thum.io
      const fallbackUrl = `https://image.thum.io/get/fullpage/${encodeURIComponent(url)}`;
      res = await axios.get(fallbackUrl, { responseType: "arraybuffer" });
    }

    // kirim foto ke telegram
    await bot.sendPhoto(chatId, res.data, {
      caption: `✅ Screenshot dari:\n${url}`,
      filename: "screenshot.png",
      contentType: "image/png"
    });

  } catch (err) {
    console.error("SSWEB ERROR:", err.response?.data || err.message);
    bot.sendMessage(chatId, `❌ Gagal ambil screenshot: ${err.message}`);
  }
});

bot.onText(/\/webtozip (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];

  if (!url.startsWith("http")) {
    return bot.sendMessage(chatId, "❌ Tolong kirim link website valid (awali dengan http/https).");
  }

  try {
    await showProgress(chatId, "🌐 Sedang memproses website jadi ZIP...", "✅ Website berhasil diproses!");

    const apiUrl = `https://api.enzoxavier.biz.id/api/web2zip?url=${encodeURIComponent(url)}`;
    const res = await axios.get(apiUrl);

    if (!res.data || !res.data.status) {
      return bot.sendMessage(chatId, "❌ Gagal mengambil data, coba link lain.");
    }

    const { originalUrl, copiedFilesAmount, downloadUrl } = res.data;

    await bot.sendMessage(chatId,
      `✅ <b>Website berhasil di-arsip!</b>\n\n` +
      `🔗 URL Asli: ${originalUrl}\n` +
      `📁 Jumlah File: ${copiedFilesAmount}\n` +
      `⬇️ <a href="${downloadUrl}">Download ZIP</a>`,
      { parse_mode: "HTML", disable_web_page_preview: true }
    );
  } catch (err) {
    bot.sendMessage(chatId, `❌ Error API: ${err.message}`);
  }
});

bot.onText(/\/spotify (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const spUrl = match[1];

  if (!spUrl.includes("spotify.com")) {
    return bot.sendMessage(chatId, "❌ Url tidak valid, harus dari Spotify.");
  }

  bot.sendMessage(chatId, "⏳ Sedang mendownload lagu dari Spotify...");

  try {
    const res = await axios.get(`https://api.enzoxavier.biz.id/api/spotifydl?url=${encodeURIComponent(spUrl)}`);

    if (!res.data || !res.data.result) {
      return bot.sendMessage(chatId, "❌ Gagal ambil data lagu (link salah atau tidak tersedia).");
    }

    const song = res.data.result;

    // Kirim cover + info lagu
    await bot.sendPhoto(chatId, song.image, {
      caption: `🎶 <b>${song.title}</b>\n👤 Artist: ${song.artist}\n⏱️ Durasi: ${(song.duration_ms/1000/60).toFixed(2)} menit`,
      parse_mode: "HTML"
    });

    // Kirim file MP3
    await bot.sendAudio(chatId, song.download, {
      title: song.title,
      performer: song.artist
    });

  } catch (err) {
    bot.sendMessage(chatId, `❌ Error API: ${err.message}`);
  }
});

bot.onText(/\/tiktok (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const ttUrl = match[1];

  if (!ttUrl.includes("tiktok.com")) {
    return bot.sendMessage(chatId, "❌ Url tidak valid, harus dari TikTok.");
  }

  bot.sendMessage(chatId, "⏳ Sedang mendownload dari TikTok...");

  try {
    const res = await axios.get(`https://api.enzoxavier.biz.id/api/ttdl?url=${encodeURIComponent(ttUrl)}`);

    if (!res.data || !res.data.result) {
      return bot.sendMessage(chatId, "❌ Gagal ambil media TikTok (mungkin link salah).");
    }

    const media = res.data.result;

    // Kirim video
    await bot.sendVideo(chatId, media.video, {
      caption: `🎵 <b>${media.title}</b>\n👤 Author: ${media.author}`,
      parse_mode: "HTML"
    });

    // Kirim audio (opsional)
    await bot.sendAudio(chatId, media.audio, {
      title: media.title,
      performer: media.author
    });

  } catch (err) {
    bot.sendMessage(chatId, `❌ Error API: ${err.message}`);
  }
});

bot.onText(/\/ig (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const igUrl = match[1];

  if (!igUrl.includes("instagram.com")) {
    return bot.sendMessage(chatId, "❌ Url tidak valid, harus dari Instagram.");
  }

  bot.sendMessage(chatId, "⏳ Sedang mendownload dari Instagram...");

  try {
    const res = await axios.get(`https://api.enzoxavier.biz.id/api/igdl?url=${encodeURIComponent(igUrl)}`);

    if (!res.data || !res.data.result || res.data.result.length === 0) {
      return bot.sendMessage(chatId, "❌ Gagal ambil media IG (mungkin privat atau link salah).");
    }

    for (const media of res.data.result) {
      if (media.type === "mp4") {
        await bot.sendVideo(chatId, media.download_url, {
          caption: `🎥 Video dari @${media.username}\n❤️ ${media.likes} | 💬 ${media.comments}\n\n${media.caption || ""}`
        });
      } else {
        await bot.sendPhoto(chatId, media.download_url, {
          caption: `🖼️ Foto dari @${media.username}\n❤️ ${media.likes} | 💬 ${media.comments}\n\n${media.caption || ""}`
        });
      }
    }
  } catch (err) {
    bot.sendMessage(chatId, `❌ Error API: ${err.message}`);
  }
});

bot.onText(/\/password (.+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const password = match[1];
  const reply = msg.reply_to_message;

  if (!password) {
    return bot.sendMessage(chatId, "⚠️ Contoh: /password 12345 (reply ke file .js)");
  }

  if (!reply || !reply.document) {
    return bot.sendMessage(chatId, "📂 Reply command ini ke file .js kamu biar otomatis diproteksi password.");
  }

  try {
    const fileId = reply.document.file_id;
    const fileUrl = await bot.getFileLink(fileId);
    const res = await axios.get(fileUrl);
    const userScript = res.data;

    // === Script hasil proteksi ===
    const protectedScript = `
const readline = require('readline');
const PW = '${password}';
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.clear();
rl.question('MASUKAN PASSWORD NYA: ', (inputPassword) => {
  if (inputPassword !== PW) {
    console.log('❌ PASSWORD SALAH');
    process.exit(1);
  }

  console.log('✅ PASSWORD BENAR');
  console.log('WELCOME TO THE SCRIPT\\n');
  rl.close();

  runScript();
});

function runScript() {
${userScript.split("\n").map(line => "  " + line).join("\n")}
}
`;

    const fileName = `DoneByJarzX.js`;
    fs.writeFileSync(fileName, protectedScript);

    await bot.sendDocument(chatId, fileName, {
      caption: `✅ Script berhasil diproteksi!\n🔒 Password: ${password}`
    });

    fs.unlinkSync(fileName);
  } catch (err) {
    bot.sendMessage(chatId, `❌ Gagal memproses file:\n${err.message}`);
  }
});

bot.onText(/\/prem (\d+) (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = parseInt(match[1]);
  const days = parseInt(match[2]);

  if (chatId != ADMIN_ID) return;

  addPremium(userId, days);
  bot.sendMessage(userId, `🏆 Anda diberikan Premium selama ${days} hari oleh admin!`);
  bot.sendMessage(chatId, `✅ Premium berhasil diberikan ke user ${userId}`);
});

bot.onText(/\/bc (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (chatId != ADMIN_ID) return;
  const text = match[1];

  await showProgress(chatId, "📡 Mengirim broadcast...", "✅ Broadcast selesai dikirim!");

  Object.keys(referrals).forEach(uid => {
    bot.sendMessage(uid, `📢 Broadcast dari Admin:\n\n${text}`);
  });
});

bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || 'User';
  const username = msg.from.username || 'anonymous';
  const refData = match[1];

  if (refData) {
    const [inviterId] = refData.split('_');
    if (!referrals[inviterId]) referrals[inviterId] = { invited: [], count: 0 };
    if (!referrals[inviterId].invited.includes(chatId)) {
      referrals[inviterId].invited.push(chatId);
      referrals[inviterId].count += 1;
      bot.sendMessage(inviterId,
        `🎉 Selamat! Anda telah mengundang 1 orang baru.\nJumlah undangan: ${referrals[inviterId].count}`);
    }
  }

  let notJoined = [];
  for (const group of REQUIRED_GROUPS) {
    try {
      const member = await bot.getChatMember(group, chatId);
      if (['left', 'kicked'].includes(member.status)) notJoined.push(group);
    } catch (err) {
      notJoined.push(group);
    }
  }

  if (notJoined.length > 0) {
    return bot.sendMessage(chatId,
      `⚠️ Kamu harus join ke grup berikut terlebih dahulu:\n${notJoined.join('\n')}`);
  }

  const userRefCount = referrals[chatId]?.count || 0;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '☇ 𝙲𝚁𝙴𝙰𝚃𝙴 𝚆𝙴𝙱', callback_data: 'create_web' }, 
          { text: "☇ 𝙱𝚄𝚈 𝚂𝙲𝚁𝙸𝙿𝚃", callback_data: "store" }
        ],
        [
          { text: '☇ 𝚄𝙽𝙳𝙰𝙽𝙶 𝚃𝙴𝙼𝙰𝙽', callback_data: 'invite_friend' },
          { text: '☇ 𝚃𝙾𝙾𝙻𝚂 𝙼𝙴𝙽𝚄', callback_data: 'tools_menu' }
        ],
        [{ text: '☇ 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁', url: 'https://t.me/JarrGanteng' }]
      ]
    },
    parse_mode: 'Markdown'
  };

  // --- Kirim foto + teks ---
  const photoUrl = 'https://i.ibb.co/KcBtCj7j/1808f000bba1.jpg'; // ganti dengan link foto kamu
  bot.sendPhoto(chatId, photoUrl, {
    caption: welcomeMsg(name, username, userRefCount, isPremium(chatId)),
    parse_mode: 'Markdown',
    reply_markup: keyboard.reply_markup
  });
});

// ======= CALLBACK HANDLER =======
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // === Buat Website ===
  if (data === 'create_web') {
    if (!isPremium(chatId) && (referrals[chatId]?.count || 0) < 5) {
      return bot.sendMessage(chatId,
        `⚠️ Kamu belum bisa membuat website.\n` +
        `- Premium aktif? ${isPremium(chatId) ? '✅' : '❌'}\n` +
        `- Jumlah undangan: ${referrals[chatId]?.count || 0} / 5`);
    }
    bot.sendMessage(chatId, '💬 Kirim file HTML kamu terlebih dahulu (.html).');
  }

  // === Undang Teman ===
  if (data === 'invite_friend') {
    const links = getReferralLinks(chatId).join('\n');
    const count = referrals[chatId]?.count || 0;
    bot.sendMessage(chatId,
      `📎 Bagikan salah satu link di bawah ini untuk mendapatkan Premium 30 hari:\n\n${links}\n\n` +
      `Jumlah undanganmu saat ini: ${count}`);
  }

  // === Tools Menu ===
  if (data === 'tools_menu') {
  const toolsKeyboard = {
    inline_keyboard: [
      [
        { text: '☇ 𝚂𝚃𝙰𝚃𝚄𝚂 𝙿𝚁𝙴𝙼𝙸𝚄𝙼', callback_data: 'status_premium' },
        { text: '☇ 𝙸𝙽𝙵𝙾 𝙰𝙺𝚄𝙽', callback_data: 'info_akun' }
      ],
      [
        { text: '☇ 𝙰𝙽𝙶𝙶𝙾𝚃𝙰', callback_data: 'info_anggota' },
        { text: '☇ 𝙲𝙴𝙺 𝚂𝚃𝙰𝚃𝚄𝚂', callback_data: 'info_premium' }
      ],
      [
        { text: '☇ 𝙸𝙽𝙵𝙾 𝚆𝙴𝙱', callback_data: 'info_web' },
        { text: '☇ 𝙻𝙸𝙽𝙺 𝚃𝙾 𝙷𝚃𝙼𝙻', callback_data: 'get_html' }
      ],
      [
        { text: '☇ 𝙵𝙾𝚃𝙾 𝚃𝙾 𝙻𝙸𝙽𝙺', callback_data: 'foto_to_link' },
        { text: '☇ 𝚂𝙿𝙰𝙼 𝙱𝙾𝚃', callback_data: 'spam_message' }
      ],
      [
        { text: '☇ 𝙸𝙽𝙵𝙾 𝙲𝚄𝙰𝙲𝙰', callback_data: 'info_cuaca' },
        { text: '☇ 𝙸𝙽𝙵𝙾 𝙿𝙴𝙽𝙶𝙶𝚄𝙽𝙰', callback_data: 'info_akun_lain' } 
      ],
      [
        { text: '☇ 𝙿𝚁𝙴𝙳𝙸𝙺𝚂𝙸 𝙼𝙰𝚂𝙰 𝙳𝙴𝙿𝙰𝙽', callback_data: 'prediksi_masa_depan' }, 
        { text: '☇ 𝙲𝙴𝙺 𝙺𝙾𝙳𝙴 𝙿𝙾𝚂', callback_data: 'cek_kodepos' }
      ],
      [
        { text: "☇ 𝙳𝙾𝙽𝙴", callback_data: "done_menu" }, 
        { text: '☇ 𝙲𝚁𝙴𝙰𝚃𝙴 𝙿𝙰𝚂𝚂𝚆𝙾𝚁𝙳', callback_data: 'create_password' }
      ], 
      [
        { text: '☇ 𝙱𝚁𝙰𝚃 𝚂𝚃𝙸𝙺𝙴𝚁', callback_data: 'text_to_sticker' }, 
        { text: '☇ 𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳 𝙼𝙴𝙽𝚄', callback_data: 'download_menu' }
     ],
     [
        { text: '☇ 𝚆𝙴𝙱 𝙼𝙴𝙽𝚄', callback_data: 'webzip' }, 
        { text: '☇ 𝙿𝙰𝙿 𝙼𝙴𝙽𝚄', callback_data: 'pap' }, 
     ], 
     [
       { text: '☇ 𝙲𝚁𝙴𝙰𝚃𝙴 𝙺𝚃𝙿', callback_data: 'create_ktp' }, 
       { text: '☇ 𝙿𝙻𝙰𝚈 𝙼𝚄𝚂𝙸𝙺', callback_data: 'play_song' }
     ], 
       [{ text: '☇ 𝙱𝙰𝙲𝙺', callback_data: 'back_main' }]
    ]
  };

  const toolsPhoto = 'https://foto-to-url.gt.tc/uploads/img_6981c4a3cbefb4.27503296.jpg'; // ganti dengan foto tools
  const toolsCaption = '🛠 <b>Tools Menu</b>\n\nPilih salah satu menu di bawah:';

  // --- edit message jadi foto + caption + keyboard ---
  return bot.editMessageMedia(
    {
      type: 'photo',
      media: toolsPhoto,
      caption: toolsCaption,
      parse_mode: 'HTML'
    },
    {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: toolsKeyboard
    }
  );
}

  // === Submenu Tools ===
  if (data === 'status_premium') {
    const expiry = premiumUsers[chatId]
      ? moment(premiumUsers[chatId]).format("DD MMMM YYYY, HH:mm")
      : "Tidak ada";
    return bot.sendMessage(chatId,
      `⭐ <b>Status Premium</b>\n\nStatus: ${isPremium(chatId) ? '✅ Aktif' : '❌ Tidak aktif'}\nKadaluarsa: ${expiry}`,
      { parse_mode: 'HTML' });
  }

  if (data === 'info_akun') {
    const u = query.from;
    return bot.sendMessage(chatId,
      `👤 <b>Informasi Akun</b>\n\nID: <code>${u.id}</code>\nUsername: @${u.username || 'anonymous'}\nNama: ${u.first_name}`,
      { parse_mode: 'HTML' });
  }

  if (data === 'info_anggota') {
    const total = Object.keys(referrals).length;
    return bot.sendMessage(chatId, `👥 <b>Informasi Anggota Bot</b>\n\nTotal pengguna terdaftar: ${total}`, { parse_mode: 'HTML' });
  }

  if (data === 'info_premium') {
    const totalPremium = Object.keys(premiumUsers).length;
    return bot.sendMessage(chatId, `🏆 <b>Informasi Premium</b>\n\nTotal user premium: ${totalPremium}`, { parse_mode: 'HTML' });
  }

  if (data === 'info_web') {
    return bot.sendMessage(chatId, `🌐 <b>Informasi Web</b>\n\nGunakan fitur "Buat Website" untuk membuat website dari file HTML milikmu.`, { parse_mode: 'HTML' });
  }

  if (data === 'get_html') {
    bot.sendMessage(chatId, "💬 Kirim link website Vercel kamu (contoh: https://namaproject.vercel.app)");
    userState[chatId] = "awaiting_gethtml";
  }

 if (data === 'foto_to_link') {
  bot.sendMessage(chatId, "📸 Kirim foto yang ingin kamu ubah menjadi link.");
  userState[chatId] = "awaiting_photo_upload";
}

  if (data === 'spam_message') {
   bot.sendMessage(chatId,
    "📩 Masukkan data dengan format:\n\n" +
    "<code>token|id|pesan|jumlah</code>\n\n" +
    "Contoh:\n<code>123456:ABCDEF|987654321|Halo bro|5</code>", 
    { parse_mode: 'HTML' });
  userState[chatId] = "awaiting_spam_message";
}

  if (data === 'info_cuaca') {
   bot.sendMessage(chatId, "🌆 Silakan kirim nama kota kamu untuk melihat info cuaca.");
  userState[chatId] = "awaiting_weather_city";
}

  if (data === 'info_akun_lain') {
   bot.sendMessage(chatId, "🔍 Silakan kirim username target (tanpa @):");
  userState[chatId] = "awaiting_other_username";
}

  if (data === 'prediksi_masa_depan') {
   bot.sendMessage(chatId, "🔮 Masukkan nama kamu untuk melihat prediksi masa depan:");
  userState[chatId] = "awaiting_future_name";
}

  if (data === "pap") {
    const teks = `
\`\`\`
╭──────( 𝗣𝗔𝗣 𝗠𝗘𝗡𝗨 )──────╮
│    ⋋──────────────⋌
│      /ᴘᴀᴘᴛᴛ
│      /ᴋᴀʏᴇs
│      /ʙʟᴀᴄᴋᴘɪɴᴋ
│    ⋋──────────────⋌
╰───────────────────────╯
\`\`\`
`;
    bot.sendMessage(chatId, teks, { parse_mode: "Markdown" });
    bot.answerCallbackQuery(query.id);
    return;
  }

  if (data === 'cek_kodepos') {
  bot.sendMessage(chatId, "🏘️ Silakan kirim nama desa/kelurahan untuk mencari kode pos:");
  userState[chatId] = "awaiting_kodepos_input";
  bot.answerCallbackQuery(query.id);
}

  if (data === 'create_password') {
      bot.sendMessage(chatId, "💬 Kirim perintah: `/password <kata_sandi>`\n\nContoh: `/password JarzX`", { parse_mode: "Markdown" });
    }

  if (data === 'text_to_sticker') {
  bot.sendMessage(chatId, "📝 Kirim teks yang ingin kamu ubah jadi stiker:");
  userState[chatId] = "awaiting_text_to_sticker";
}

  if (data === 'download_menu') {
  return bot.sendMessage(chatId,
    "📥 Silakan pilih platform untuk mendownload media:\n\n" +
    "```/ig link```\n" +
    "```/tiktok link```\n" +
    "```/spotify link```",
    { parse_mode: "Markdown" }
  );
}

   if (data === 'webzip') {
  return bot.sendMessage(chatId,
    "📥 Silakan pilih platform untuk website:\n\n" +
    "```/webtozip link```\n" +
    "```/ssweb link```\n" +
    "```/shortlink link```",
    { parse_mode: "Markdown" }
  );
}

   if (data === 'store') {
  if (products.length === 0) return bot.sendMessage(chatId, "❌ Belum ada produk tersedia.");

  let msgText = "🛒 Selamat datang di JarzX Store\n\n";
  products.forEach(p => {
    msgText += `ID: ${p.id}\nNama: ${p.name}\nHarga: ${p.price}\nStok: ${p.stock}\nDeskripsi: ${p.desc}\n\n`;
  });

  const keyboard = {
    inline_keyboard: products.map(p => [{ text: `💰 Beli ${p.name}`, callback_data: `buy_${p.id}` }])
  };

  bot.sendMessage(chatId, msgText, { reply_markup: keyboard });
}

  if (data === "done_menu") {
  userState[chatId] = { step: "done_input" };
  return bot.sendMessage(
    chatId,
    "📝 Masukkan data transaksi dengan format:\n\n```\nNamaBarang | Harga | MetodePembayaran\n```\n\nContoh:\n```\nNomor WhatsApp | 25.000 | Dana\n```",
    { parse_mode: "Markdown" }
  );
}

  if (data === 'create_ktp') {
  userState[chatId] = "provinsi";
  userData[chatId] = {};
  return bot.sendMessage(chatId, "🆔 Masukkan *Provinsi*:", { parse_mode: "Markdown" });
}

  if (data === 'play_song') {
  userState[chatId] = "awaiting_song_title";
  return bot.sendMessage(
    chatId,
    `🎵 <b>Play Lagu</b>\n\nSilakan kirim judul lagu yang ingin diputar.`,
    { parse_mode: 'HTML' }
  );
}

  if (data === 'back_main') {
  const chatId = query.message.chat.id;

  // Hapus pesan lama agar chat tetap rapi
  await bot.deleteMessage(chatId, query.message.message_id).catch(() => {});

  // Kirim instruksi agar user mengetik /start lagi
  await bot.sendMessage(chatId, 
    "⬅️ Kembali ke menu utama\n\nSilakan ketik /start untuk melihat menu utama lagi ✅",
    { parse_mode: 'Markdown' }
  );

  bot.answerCallbackQuery(query.id);
}

  bot.answerCallbackQuery(query.id);
});

// ======= HANDLER UNTUK FILE HTML =======
bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  const file = msg.document;

  if (!file.file_name.endsWith('.html')) {
    return bot.sendMessage(chatId, '❌ Hanya file .html yang didukung.');
  }

  try {
    const link = await bot.getFileLink(file.file_id);
    const htmlFile = await axios.get(link, { responseType: 'arraybuffer' });
    const path = `./${chatId}.html`;
    fs.writeFileSync(path, htmlFile.data);
    userState[chatId] = path;

    bot.sendMessage(chatId, '✅ File diterima!\n\n💬 Sekarang kirim <b>nama website</b> kamu (tanpa spasi).', { parse_mode: 'HTML' });
  } catch (err) {
    bot.sendMessage(chatId, '❌ Gagal mengunduh file.');
  }
});

// ======= HANDLER UNTUK PESAN UMUM (TEXT / FOTO / DLL) =======
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // === GET HTML DARI LINK ===
  if (userState[chatId] === "awaiting_gethtml" && text?.startsWith("http")) {
    try {
      await showProgress(chatId, "🔎 Mengambil HTML dari link...", "📥 Download selesai!");

      const res = await axios.get(text);
      const htmlContent = res.data;
      const filename = `JarzX_Track.html`;

      fs.writeFileSync(filename, htmlContent, 'utf8');

      await bot.sendDocument(chatId, filename, {
        caption: `✅ Source code berhasil diambil dari:\n${text}`
      });

      fs.unlinkSync(filename);
    } catch (err) {
      bot.sendMessage(chatId, `❌ Gagal mengambil HTML:\n${err.message}`);
    } finally {
      delete userState[chatId];
    }
    return;
  }

  // === FOTO KE LINK (ImgBB) ===
  if (userState[chatId] === "awaiting_photo_upload" && msg.photo) {
    try {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const fileUrl = await bot.getFileLink(fileId);

      // download foto
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const imageBase64 = Buffer.from(response.data, 'binary').toString('base64');

      // upload ke ImgBB
      const uploadRes = await axios.post(
        "https://api.imgbb.com/1/upload",
        new URLSearchParams({
          key: "64f70186d8ebe857ea819e63e0bf295e",
          image: imageBase64
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const imageUrl = uploadRes.data.data.url;
      await bot.sendMessage(chatId, `✅ Foto berhasil diupload!\n\n🔗 Link: ${imageUrl}`);
    } catch (err) {
      bot.sendMessage(chatId, `❌ Gagal upload foto:\n${err.message}`);
    } finally {
      delete userState[chatId];
    }
    return;
  }

// === SPAM BOT ===
if (userState[chatId] === "awaiting_spam_message" && text?.includes("|")) {
  try {
    const [token, targetId, pesan, jumlahStr] = text.split("|");
    const jumlah = parseInt(jumlahStr);

    if (!token || !targetId || !pesan || !jumlah) {
      return bot.sendMessage(chatId, "❌ Format salah. Gunakan: <code>token|id|pesan|jumlah</code>", { parse_mode: 'HTML' });
    }

    await showProgress(chatId, "🚀 Mengirim pesan...", "✅ Pesan selesai dikirim!");

    for (let i = 1; i <= jumlah; i++) {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: targetId,
        text: pesan
      });
    }

    bot.sendMessage(chatId, `✅ Berhasil mengirim <b>${jumlah}</b> pesan ke ID <code>${targetId}</code>`, { parse_mode: 'HTML' });
  } catch (err) {
    bot.sendMessage(chatId, `❌ Gagal kirim pesan:\n${err.message}`);
  } finally {
    delete userState[chatId];
  }
  return;
}

// === INFO CUACA ===
if (userState[chatId] === "awaiting_weather_city" && text) {
  try {
    await showProgress(chatId, "🌦 Mengambil data cuaca...", "✅ Data berhasil diambil!");

    const apiKey = "81c51617327dfaa46829cd514d932032"; // daftar gratis di https://openweathermap.org/api
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(text)}&units=metric&appid=${apiKey}&lang=id`;

    const res = await axios.get(url);
    const data = res.data;

    const reply =
      `🌆 <b>Cuaca ${data.name}</b>\n\n` +
      `🌡 Suhu: <b>${data.main.temp}°C</b>\n` +
      `🌤 Kondisi: <b>${data.weather[0].description}</b>\n` +
      `💧 Kelembapan: <b>${data.main.humidity}%</b>\n` +
      `🌬 Angin: <b>${data.wind.speed} m/s</b>\n`;

    bot.sendMessage(chatId, reply, { parse_mode: 'HTML' });
  } catch (err) {
    bot.sendMessage(chatId, `❌ Gagal mengambil data cuaca:\n${err.message}`);
  } finally {
    delete userState[chatId];
  }
  return;
}

 // === INFO AKUN ===
if (userState[chatId] === "awaiting_other_username" && text) {
  try {
    let username = text.replace(/^@/, '').trim();

    // Cari user di database referrals atau premiumUsers (jika disimpan)
    let targetUserId = null;
    for (let id in referrals) {
      if (referrals[id].username === username) {
        targetUserId = id;
        break;
      }
    }

    if (!targetUserId) {
      return bot.sendMessage(chatId, `❌ User @${username} tidak ditemukan.`);
    }

    const target = referrals[targetUserId];
    const message = 
      `👤 <b>Informasi Akun ${username}</b>\n\n` +
      `ID: <code>${targetUserId}</code>\n` +
      `Nama: ${target.name || 'Tidak tersedia'}\n` +
      `Jumlah undangan: ${target.count || 0}\n` +
      `Status Premium: ${isPremium(targetUserId) ? '✅ Aktif' : '❌ Tidak aktif'}`;

    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });

  } catch (err) {
    bot.sendMessage(chatId, `❌ Terjadi kesalahan:\n${err.message}`);
  } finally {
    delete userState[chatId];
  }
}

// ======= Handler input nama untuk Prediksi Masa Depan =======
if (userState[chatId] === "awaiting_future_name" && text) {
  const name = text.trim();
  const predictions = ["Perintis", "Miliarder", "Triliuner"];
  const randomPrediction = predictions[Math.floor(Math.random() * predictions.length)];
  const year = Math.floor(Math.random() * (2050 - 2025 + 1)) + 2025; // Tahun acak antara 2025–2050

  const reply = 
    `✨ 🔮 Prediksi Masa Depan 🔮 ✨\n\n` +
    `Nama: *${name}*\n` +
    `Di tahun *${year}*, kamu akan menjadi: *${randomPrediction}* 🌟`;

  bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
  delete userState[chatId];
}

// ===== CEK KODE POS =====
if (userState[chatId] === "awaiting_kodepos_input" && text) {
  try {
    await bot.sendMessage(chatId, "🔎 Mencari kode pos...");

    const res = await axios.get(`https://kodepos.vercel.app/search?q=${encodeURIComponent(text)}`);
    const data = res.data;

    if (!data || !data.data || data.data.length === 0) {
      return bot.sendMessage(chatId, `❌ Desa/kelurahan "${text}" tidak ditemukan.`);
    }

    let reply = `🏘️ <b>Hasil pencarian kode pos untuk "${text}"</b>\n\n`;
data.data.forEach(item => {
  reply += `• Desa/Kelurahan: ${item.village || 'Tidak tersedia'}\n`;
  reply += `  Kecamatan   : ${item.district || 'Tidak tersedia'}\n`;
  reply += `  Kabupaten   : ${item.regency || 'Tidak tersedia'}\n`;
  reply += `  Provinsi    : ${item.province || 'Tidak tersedia'}\n`;
  reply += `  Kode Pos    : <b>${item.code || 'Tidak tersedia'}</b>\n\n`;
});

    bot.sendMessage(chatId, reply, { parse_mode: 'HTML' });

  } catch (err) {
    bot.sendMessage(chatId, `❌ Terjadi kesalahan: ${err.message}`);
  } finally {
    delete userState[chatId];
  }
}

// === TEXT TO STICKER ===
if (userState[chatId] === "awaiting_text_to_sticker" && text) {
  try {
    const { createCanvas } = require('canvas');

    // buat canvas
    const canvas = createCanvas(512, 512);
    const ctx = canvas.getContext('2d');

    // background transparan
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 512, 512);

    // style teks
    ctx.fillStyle = "#ffffff"; 
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // tulis teks di tengah
    ctx.fillText(text, 256, 256, 480);

    // simpan file sementara
    const outPath = `./${chatId}_sticker.png`;
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outPath, buffer);

    // kirim sebagai stiker
    await bot.sendSticker(chatId, outPath);

    // hapus file sementara
    fs.unlinkSync(outPath);
  } catch (err) {
    bot.sendMessage(chatId, `❌ Gagal membuat stiker:\n${err.message}`);
  } finally {
    delete userState[chatId];
  }
  return;
}

// Callback query untuk beli & cek status
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // BUY
  if (data.startsWith('buy_')) {
    const prodId = parseInt(data.split('_')[1]);
    const product = products.find(p => p.id === prodId);
    if (!product) return bot.sendMessage(chatId, "❌ Produk tidak ditemukan.");
    if (product.stock <= 0) return bot.sendMessage(chatId, "❌ Stok habis.");

    // Cek transaksi pending
    if (userState[chatId] && userState[chatId].step === 'awaiting_payment') {
      return bot.sendMessage(chatId, "⏳ Anda masih memiliki transaksi yang menunggu pembayaran.");
    }

    const reff_id = `JARZX${Date.now()}`;
    const qrImage = "https://i.ibb.co/WWwRp7Vq/00a2973fb7ce.jpg";

    const reply = `
✅ Detail Transaksi
Produk: ${product.name}
Harga: Rp${product.price}
Reff ID: ${reff_id}

🔗 Scan QR untuk membayar:
${qrImage}

⏳ Menunggu bukti pembayaran...
    `;

    const keyboard = {
      inline_keyboard: [
        [{ text: "💳 Kirim Bukti", callback_data: `sendproof_${reff_id}` }]
      ]
    };

    userState[chatId] = { step: 'awaiting_payment', product, reff_id, qrImage };
    bot.sendPhoto(chatId, qrImage, { caption: reply, reply_markup: keyboard });
  }

  // Callback untuk tombol "Kirim Bukti"
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Tombol Kirim Bukti
  if (data.startsWith('sendproof_')) {
    const state = userState[chatId];
    if (!state || state.step !== 'awaiting_payment') {
      return bot.answerCallbackQuery(query.id, { text: "❌ Tidak ada transaksi yang menunggu bukti." });
    }

    // Minta user reply foto
    bot.sendMessage(chatId, "📌 Silakan reply foto bukti pembayaran di bawah pesan ini.");
    userState[chatId].step = 'awaiting_photo'; // set state menunggu foto
    bot.answerCallbackQuery(query.id);
  }

  // Konfirmasi / Cancel oleh admin
  if (data.startsWith('confirm_') || data.startsWith('cancel_')) {
    const parts = data.split('_');
    const action = parts[0];
    const userId = parseInt(parts[1]);
    const state = userState[userId];
    if (!state) return bot.answerCallbackQuery(query.id, { text: "❌ Transaksi tidak ditemukan." });

    if (action === 'confirm') {
      if (state.product.fileType === 'file') {
        bot.sendDocument(userId, state.product.fileData, { caption: `✅ Pembelian berhasil: ${state.product.name}` });
      } else {
        bot.sendMessage(userId, `✅ Pembelian berhasil:\n${state.product.fileData}`);
      }
      state.product.stock--;
      delete userState[userId];
      bot.editMessageCaption("✅ Transaksi dikonfirmasi!", {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id
      });
      bot.answerCallbackQuery(query.id, { text: "✅ Transaksi dikonfirmasi." });
    } else {
      delete userState[userId];
      bot.sendMessage(userId, "❌ Transaksi Anda dibatalkan oleh admin.");
      bot.editMessageCaption("❌ Transaksi dibatalkan.", {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id
      });
      bot.answerCallbackQuery(query.id, { text: "❌ Transaksi dibatalkan." });
    }
  }
});

// Listener untuk user reply foto bukti
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const state = userState[chatId];

  if (!state || state.step !== 'awaiting_photo') return; // tidak ada transaksi menunggu foto

  const fileId = msg.photo[msg.photo.length - 1].file_id;
  const caption = `📌 Bukti pembayaran baru!
User: ${msg.from.username || msg.from.first_name}
UserID: ${chatId}
Produk: ${state.product.name}
Harga: Rp${state.product.price}
Reff ID: ${state.reff_id}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Konfirmasi", callback_data: `confirm_${chatId}` },
        { text: "❌ Cancel", callback_data: `cancel_${chatId}` }
      ]
    ]
  };

  bot.sendPhoto(ADMIN_ID, fileId, { caption, reply_markup: keyboard });
  bot.sendMessage(chatId, "✅ Bukti dikirim ke admin, menunggu konfirmasi...");

  // Update state supaya tidak spam
  state.step = 'awaiting_admin';
});

  // Admin confirm/cancel
  if (data.startsWith('confirm_') || data.startsWith('cancel_')) {
    const parts = data.split('_');
    const action = parts[0];
    const userId = parseInt(parts[1]);
    const state = userState[userId];
    if (!state) return bot.answerCallbackQuery(query.id, { text: "❌ Transaksi tidak ditemukan." });

    if (action === 'confirm') {
      if (state.product.fileType === 'file') {
        bot.sendDocument(userId, state.product.fileData, { caption: `✅ Pembelian berhasil: ${state.product.name}` });
      } else {
        bot.sendMessage(userId, `✅ Pembelian berhasil:\n${state.product.fileData}`);
      }
      state.product.stock--;
      delete userState[userId];
      bot.editMessageCaption("✅ Transaksi dikonfirmasi!", {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id
      });
      bot.answerCallbackQuery(query.id, { text: "✅ Transaksi dikonfirmasi." });
    } else {
      delete userState[userId];
      bot.sendMessage(userId, "❌ Transaksi Anda dibatalkan oleh admin.");
      bot.editMessageCaption("❌ Transaksi dibatalkan.", {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id
      });
      bot.answerCallbackQuery(query.id, { text: "❌ Transaksi dibatalkan." });
    }
  }
});

   // === DONE ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userState[chatId]) return;

  // DONE INPUT
  if (userState[chatId].step === "done_input") {
    const parts = text.split("|").map(p => p.trim());
    if (parts.length < 3) {
      return bot.sendMessage(chatId, "⚠️ Format salah!\nGunakan format:\n```\nNamaBarang | Harga | MetodePembayaran\n```", { parse_mode: "Markdown" });
    }

    const [namabarang, harga, payment] = parts;

    const date = new Date().toLocaleString("id-ID", { 
      weekday: "long", year: "numeric", month: "long", day: "numeric" 
    });

    const result = `
\`\`\`
𝗔𝗟𝗛𝗔𝗠𝗗𝗨𝗟𝗟𝗜𝗟𝗟𝗔𝗛 𝗧𝗥𝗔𝗡𝗦𝗔𝗞𝗦𝗜 𝗗𝗢𝗡𝗘 ✅
━━━━━━━━━━━━━━━━━━━━
📦 BARANG   : ${namabarang}
🔖 PRICE    : ${harga}
🏦 PAYMENT  : ${payment}
📅 DATE     : ${date}
━━━━━━━━━━━━━━━━━━━━
**TERIMAKASIH SUDAH MEMBELI DI**
𝗝𝗮𝗿𝘇𝗫
\`\`\`
    `;

    delete userState[chatId]; // reset state
    return bot.sendMessage(chatId, result, { parse_mode: "Markdown" });
  }
});

// ===== HANDLE INPUT KTP =====
if (userState[chatId]) {
  const step = userState[chatId];

  switch (step) {
    case "provinsi":
      userData[chatId].provinsi = text;
      userState[chatId] = "kota";
      return bot.sendMessage(chatId, "🏙️ Masukkan *Kota*:", { parse_mode: "Markdown" });

    case "kota":
      userData[chatId].kota = text;
      userState[chatId] = "nik";
      return bot.sendMessage(chatId, "🆔 Masukkan *NIK*:", { parse_mode: "Markdown" });

    case "nik":
      userData[chatId].nik = text;
      userState[chatId] = "nama";
      return bot.sendMessage(chatId, "👤 Masukkan *Nama*:", { parse_mode: "Markdown" });

    case "nama":
      userData[chatId].nama = text;
      userState[chatId] = "ttl";
      return bot.sendMessage(chatId, "🎂 Masukkan *Tempat, Tanggal Lahir* (contoh: Bandung, 01-01-1990):", { parse_mode: "Markdown" });

    case "ttl":
      userData[chatId].ttl = text;
      userState[chatId] = "jenis_kelamin";
      return bot.sendMessage(chatId, "🚻 Masukkan *Jenis Kelamin* (Laki-laki/Perempuan):", { parse_mode: "Markdown" });

    case "jenis_kelamin":
      userData[chatId].jenis_kelamin = text;
      userState[chatId] = "golongan_darah";
      return bot.sendMessage(chatId, "💉 Masukkan *Golongan Darah*:", { parse_mode: "Markdown" });

    case "golongan_darah":
      userData[chatId].golongan_darah = text;
      userState[chatId] = "alamat";
      return bot.sendMessage(chatId, "🏠 Masukkan *Alamat*:", { parse_mode: "Markdown" });

    case "alamat":
      userData[chatId].alamat = text;
      userState[chatId] = "rt_rw";
      return bot.sendMessage(chatId, "📍 Masukkan *RT/RW* (contoh: 001/002):", { parse_mode: "Markdown" });

    case "rt_rw":
      userData[chatId].rt_rw = text;
      userState[chatId] = "kel_desa";
      return bot.sendMessage(chatId, "🏘️ Masukkan *Kelurahan/Desa*:", { parse_mode: "Markdown" });

    case "kel_desa":
      userData[chatId].kel_desa = text;
      userState[chatId] = "kecamatan";
      return bot.sendMessage(chatId, "🌍 Masukkan *Kecamatan*:", { parse_mode: "Markdown" });

    case "kecamatan":
      userData[chatId].kecamatan = text;
      userState[chatId] = "agama";
      return bot.sendMessage(chatId, "🕌 Masukkan *Agama*:", { parse_mode: "Markdown" });

    case "agama":
      userData[chatId].agama = text;
      userState[chatId] = "status";
      return bot.sendMessage(chatId, "💍 Masukkan *Status Perkawinan*:", { parse_mode: "Markdown" });

    case "status":
      userData[chatId].status = text;
      userState[chatId] = "pekerjaan";
      return bot.sendMessage(chatId, "💼 Masukkan *Pekerjaan*:", { parse_mode: "Markdown" });

    case "pekerjaan":
      userData[chatId].pekerjaan = text;
      userState[chatId] = "kewarganegaraan";
      return bot.sendMessage(chatId, "🌏 Masukkan *Kewarganegaraan*:", { parse_mode: "Markdown" });

    case "kewarganegaraan":
      userData[chatId].kewarganegaraan = text;
      userState[chatId] = "masa_berlaku";
      return bot.sendMessage(chatId, "📅 Masukkan *Masa Berlaku* (contoh: Seumur Hidup):", { parse_mode: "Markdown" });

    case "masa_berlaku":
      userData[chatId].masa_berlaku = text;
      userState[chatId] = "terbuat";
      return bot.sendMessage(chatId, "🗓️ Masukkan *Tanggal Terbit* (contoh: 01-01-2023):", { parse_mode: "Markdown" });

    case "terbuat":
      userData[chatId].terbuat = text;
      userState[chatId] = "pas_photo";
      return bot.sendMessage(chatId, "📸 Masukkan *URL Foto* (link gambar):", { parse_mode: "Markdown" });

    case "pas_photo":
  userData[chatId].pas_photo = text;
  userState[chatId] = null;

  try {
    await bot.sendMessage(chatId, "⏳ Membuat KTP, tunggu sebentar...");

    const d = userData[chatId];
    const url = `https://api.siputzx.my.id/api/m/ektp?provinsi=${encodeURIComponent(d.provinsi)}&kota=${encodeURIComponent(d.kota)}&nik=${encodeURIComponent(d.nik)}&nama=${encodeURIComponent(d.nama)}&ttl=${encodeURIComponent(d.ttl)}&jenis_kelamin=${encodeURIComponent(d.jenis_kelamin)}&golongan_darah=${encodeURIComponent(d.golongan_darah)}&alamat=${encodeURIComponent(d.alamat)}&rt%2Frw=${encodeURIComponent(d.rt_rw)}&kel%2Fdesa=${encodeURIComponent(d.kel_desa)}&kecamatan=${encodeURIComponent(d.kecamatan)}&agama=${encodeURIComponent(d.agama)}&status=${encodeURIComponent(d.status)}&pekerjaan=${encodeURIComponent(d.pekerjaan)}&kewarganegaraan=${encodeURIComponent(d.kewarganegaraan)}&masa_berlaku=${encodeURIComponent(d.masa_berlaku)}&terbuat=${encodeURIComponent(d.terbuat)}&pas_photo=${encodeURIComponent(d.pas_photo)}`;

    console.log("🔗 URL API:", url);

    // Ambil langsung sebagai gambar
    const res = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(res.data, "binary");

    await bot.sendPhoto(chatId, buffer, {
      caption: `✅ KTP berhasil dibuat!\n\n👤 ${d.nama}\n🆔 ${d.nik}\n🎂 ${d.ttl}\n🚻 ${d.jenis_kelamin}\n💉 ${d.golongan_darah}\n🏠 ${d.alamat}\n📍 ${d.kel_desa}, ${d.kecamatan}\n🕌 ${d.agama}\n💍 ${d.status}\n💼 ${d.pekerjaan}\n🌏 ${d.kewarganegaraan}\n📅 Berlaku: ${d.masa_berlaku}\n🗓️ Terbuat: ${d.terbuat}`
    });

  } catch (err) {
    console.error("❌ API Error:", err.response?.data || err.message);
    bot.sendMessage(chatId, `❌ Error: ${err.response?.data?.message || err.message}`);
  } finally {
    delete userState[chatId];
    delete userData[chatId];
  }
  break;
  }
}

// === PLAY SONG ===
if (userState[chatId] === 'awaiting_song_title') {
  const query = text.trim();
  userState[chatId] = null;

  try {
    const response = await axios.get(`https://api.vreden.my.id/api/v1/download/play/audio?query=${encodeURIComponent(query)}`);
    const res = response.data;

    if (!res.status || !res.result) {
      return bot.sendMessage(chatId, "❌ Lagu tidak ditemukan, coba judul lain ya!");
    }

    const meta = res.result.metadata;
    const dl = res.result.download;

    let caption = `
🎵 <b>${meta.title}</b>
👤 Author: ${meta.author?.name || "-"}
👁️ Views: ${meta.views}
⏳ Durasi: ${meta.timestamp}
📅 Rilis: ${meta.ago}

🔗 <a href="${meta.url}">Tonton di YouTube</a>
    `;

    await bot.sendPhoto(chatId, meta.thumbnail, {
      caption,
      parse_mode: "HTML"
    });

    // --- Cek semua kemungkinan field untuk audio ---
    let audioUrl = null;
    if (dl?.mp3?.url) audioUrl = dl.mp3.url;
    else if (dl?.audio?.url) audioUrl = dl.audio.url;
    else if (dl?.["128kbps"]?.url) audioUrl = dl["128kbps"].url;
    else if (dl?.["320kbps"]?.url) audioUrl = dl["320kbps"].url;
    else if (dl?.url) audioUrl = dl.url;

    if (audioUrl) {
      await bot.sendAudio(chatId, audioUrl, {
        title: meta.title,
        performer: meta.author?.name || "Unknown"
      });
    } else {
      await bot.sendMessage(chatId, "⚠️ API tidak memberikan link audio. Coba judul lain ya.");
    }

  } catch (e) {
    console.error(e);
    bot.sendMessage(chatId, `❌ Error: ${e.message}`);
  }
}

  // === Deploy Website ===
  // (Hanya jalan kalau userState ada path file & pesan berupa text)
  if (userState[chatId] && typeof text === "string" && !text.startsWith('/')) {
    const filePath = userState[chatId];
    const projectName = text.toLowerCase().replace(/\s+/g, '-');

    try {
      await showProgress(chatId, "🚀 Deploy website dimulai...", "🔧 Menyelesaikan deploy...");

      const htmlBase64 = fs.readFileSync(filePath, { encoding: 'base64' });

      const payload = {
        name: projectName,
        files: [{ file: 'index.html', data: htmlBase64, encoding: 'base64' }],
        projectSettings: {
          framework: null,
          devCommand: null,
          installCommand: null,
          buildCommand: null,
          outputDirectory: '.',
          rootDirectory: null
        }
      };

      await axios.post('https://api.vercel.com/v13/deployments', payload, {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const date = moment().format('DD MMMM YYYY, HH:mm');
      const reply = `✅ <b>Website berhasil dibuat!</b>\n\n` +
                    `📛 <b>Nama:</b> ${projectName}\n` +
                    `🔗 <b>Link:</b> https://${projectName}.vercel.app\n` +
                    `🗓️ <b>Dibuat:</b> ${date}`;

      bot.sendMessage(chatId, reply, { parse_mode: 'HTML' });
    } catch (err) {
      const errorMsg = err.response?.data || err.message;
      bot.sendMessage(chatId, `❌ Gagal upload ke Vercel:\n${JSON.stringify(errorMsg)}`);
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      delete userState[chatId];
    }
  }
});