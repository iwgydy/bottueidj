/***************************************************
 * commands/music.js
 * คำสั่ง /เพลง สำหรับค้นหาและดาวน์โหลดเพลงจาก YouTube
 ***************************************************/
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs-extra');
const path = require('path');

module.exports = (bot) => {
  // ----------------------------------------------------------------
  // ดักจับข้อความรูปแบบ: /เพลง <ชื่อเพลง>
  // ----------------------------------------------------------------
  bot.onText(/\/เพลง (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const songName = match[1].trim();  // ข้อความหลัง /เพลง

    if (!songName) {
      return bot.sendMessage(chatId, "โปรดระบุชื่อเพลงด้วย เช่น /เพลง ใจสั่งมา");
    }

    // แจ้งผู้ใช้ว่ากำลังค้นหา
    let searchingMsg;
    try {
      searchingMsg = await bot.sendMessage(chatId, `กำลังค้นหาเพลง: "${songName}" ...`);
    } catch (error) {
      console.error("แจ้งเตือนไม่ได้:", error);
    }

    try {
      // 1) ค้นหาเพลงบน YouTube
      const searchResults = await yts(songName);
      if (!searchResults.videos || searchResults.videos.length === 0) {
        return bot.sendMessage(chatId, "ไม่พบเพลงที่คุณต้องการค้นหา");
      }

      // 2) เลือกวิดีโอแรก
      const video = searchResults.videos[0];
      const videoUrl = video.url;
      const videoTitle = video.title;
      const videoAuthor = video.author.name;

      // 3) โฟลเดอร์ cache สำหรับเก็บไฟล์ชั่วคราว
      const cacheDir = path.join(__dirname, '..', 'cache');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir);
      }

      // 4) ตั้งชื่อไฟล์ไม่ให้ซ้ำกัน
      const fileName = `music-${Date.now()}.mp3`;
      const filePath = path.join(cacheDir, fileName);

      // 5) ดาวน์โหลดเสียง (audio only)
      const stream = ytdl(videoUrl, { filter: 'audioonly' });
      const writeStream = fs.createWriteStream(filePath);
      stream.pipe(writeStream);

      // เมื่อดาวน์โหลดเสร็จ
      stream.on('end', async () => {
        // ลบข้อความ "กำลังค้นหาเพลง" (ถ้าส่งได้)
        if (searchingMsg) {
          try {
            await bot.deleteMessage(chatId, searchingMsg.message_id);
          } catch (err) {
            // ถ้าลบไม่สำเร็จ ก็ข้ามไป
          }
        }

        // ตรวจสอบขนาดไฟล์ (Telegram ส่งได้สูงสุด ~50MB)
        const fileSize = fs.statSync(filePath).size;
        if (fileSize > 50 * 1024 * 1024) {
          fs.unlinkSync(filePath);
          return bot.sendMessage(chatId, "ไฟล์ใหญ่เกิน 50MB ไม่สามารถส่งได้");
        }

        // ส่งไฟล์ MP3 ให้ผู้ใช้
        const caption = `🎵 ชื่อเพลง: ${videoTitle}\n👤 ศิลปิน: ${videoAuthor}`;
        bot.sendAudio(chatId, filePath, {}, { caption })
          .then(() => {
            // ลบไฟล์หลังส่งเสร็จ
            fs.unlinkSync(filePath);
          })
          .catch(err => {
            console.error("ผิดพลาดขณะส่งไฟล์:", err);
            fs.unlinkSync(filePath);
            bot.sendMessage(chatId, "เกิดข้อผิดพลาดขณะส่งไฟล์เพลง");
          });
      });

      // หากเกิดข้อผิดพลาดระหว่างดาวน์โหลด
      stream.on('error', (error) => {
        console.error("ดาวน์โหลดเพลงผิดพลาด:", error);
        bot.sendMessage(chatId, "❗ เกิดข้อผิดพลาดในการดาวน์โหลดเพลง");
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });

    } catch (error) {
      console.error("ค้นหา/ดาวน์โหลดเพลงผิดพลาด:", error);
      bot.sendMessage(chatId, "เกิดข้อผิดพลาดขณะค้นหา/ดาวน์โหลดเพลง");
    }
  });

  // ----------------------------------------------------------------
  // หากพิมพ์ /เพลง แต่ไม่ได้ตามด้วยชื่อเพลง
  // ----------------------------------------------------------------
  bot.onText(/\/เพลง$/, (msg) => {
    bot.sendMessage(msg.chat.id, "โปรดระบุชื่อเพลงด้วย เช่น /เพลง ใจสั่งมา");
  });
};
