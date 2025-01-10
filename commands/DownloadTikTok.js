const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'downloadtiktok',
  description: 'ดาวน์โหลดวิดีโอ TikTok จากลิงก์ที่ผู้ใช้ส่งมา',
  execute(bot) {
    const activeDownloads = new Map(); // ใช้เก็บสถานะการใช้งานของแต่ละแชท

    bot.onText(/\/DownloadTikTok/, (msg) => {
      const chatId = msg.chat.id;

      // ตั้งสถานะให้แชทนี้สามารถส่งลิงก์ TikTok ได้ภายใน 1 วัน
      activeDownloads.set(chatId, Date.now());

      // แจ้งผู้ใช้ให้ส่งลิงก์ TikTok
      bot.sendMessage(chatId, "📥 กรุณาวางลิงก์ TikTok ที่ต้องการดาวน์โหลด:");

      // ลบสถานะหลังจาก 1 วัน
      setTimeout(() => {
        activeDownloads.delete(chatId);
        bot.sendMessage(chatId, "⏳ เวลาสำหรับการดาวน์โหลด TikTok หมดอายุแล้ว กรุณาใช้คำสั่ง /DownloadTikTok อีกครั้ง");
      }, 24 * 60 * 60 * 1000); // 1 วัน
    });

    // รับข้อความที่ผู้ใช้ส่งมา
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;

      // หากแชทนี้อยู่ในสถานะใช้งาน TikTok Download
      if (activeDownloads.has(chatId)) {
        const url = msg.text; // ลิงก์ที่ผู้ใช้ส่งมา

        // ตรวจสอบว่าลิงก์เป็น TikTok หรือไม่
        if (url.includes("tiktok.com")) {
          bot.sendMessage(chatId, "🔄 กำลังดาวน์โหลดวิดีโอ TikTok...");

          try {
            // เรียกใช้ API เพื่อดาวน์โหลดวิดีโอ
            const apiUrl = `https://kaiz-apis.gleeze.com/api/tiktok-dl?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl);

            if (response.data && response.data.url) {
              const videoUrl = response.data.url;
              const thumbnailUrl = response.data.thumbnail;
              const title = response.data.title;

              // ส่ง thumbnail และข้อมูลวิดีโอให้ผู้ใช้
              await bot.sendPhoto(chatId, thumbnailUrl, {
                caption: `📽️ **${title}**\n\n⬇️ กำลังดาวน์โหลดวิดีโอ...`,
              });

              // ดาวน์โหลดวิดีโอและส่งให้ผู้ใช้
              const videoPath = await downloadVideo(videoUrl, chatId);
              await bot.sendVideo(chatId, videoPath);

              // ลบไฟล์วิดีโอหลังจากส่งเสร็จ
              fs.unlinkSync(videoPath);
            } else {
              bot.sendMessage(chatId, "❌ ไม่สามารถดาวน์โหลดวิดีโอ TikTok ได้");
            }
          } catch (error) {
            console.error("Error downloading TikTok video:", error.message);
            bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการดาวน์โหลดวิดีโอ TikTok");
          }
        } else {
          bot.sendMessage(chatId, "❌ ลิงก์ที่ส่งมาไม่ใช่ลิงก์ TikTok กรุณาส่งลิงก์ที่ถูกต้อง");
        }
      }
    });

    // ฟังก์ชันสำหรับดาวน์โหลดวิดีโอ
    async function downloadVideo(videoUrl, chatId) {
      const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream',
      });

      const videoPath = path.join(__dirname, `${chatId}_tiktok.mp4`);
      const writer = fs.createWriteStream(videoPath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(videoPath));
        writer.on('error', reject);
      });
    }
  },
};
