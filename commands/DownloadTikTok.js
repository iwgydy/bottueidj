const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'downloadtiktok',
  description: 'ดาวน์โหลดวิดีโอ TikTok จากลิงก์ที่ผู้ใช้ส่งมา',
  execute(bot) {
    const activeDownloads = new Map(); // ใช้เก็บสถานะการใช้งานของแต่ละผู้ใช้

    // จับคำสั่ง /downloadtiktok
    bot.onText(/\/downloadtiktok/, (msg) => {
      try {
        const userId = msg.from.id; // ใช้ ID ผู้ใช้แทน ID แชท
        const chatId = msg.chat.id;

        // ตั้งสถานะให้ผู้ใช้นี้สามารถส่งลิงก์ TikTok ได้
        activeDownloads.set(userId, chatId);

        // แจ้งผู้ใช้ให้ส่งลิงก์ TikTok
        bot.sendMessage(chatId, "📥 กรุณาวางลิงก์ TikTok ที่ต้องการดาวน์โหลด:");
      } catch (error) {
        console.error("Error in /downloadtiktok command:", error.message);
      }
    });

    // รับข้อความที่ผู้ใช้ส่งมา
    bot.on('message', async (msg) => {
      try {
        const userId = msg.from.id; // ใช้ ID ผู้ใช้แทน ID แชท
        const chatId = msg.chat.id;

        // หากผู้ใช้นี้อยู่ในสถานะใช้งาน TikTok Download
        if (activeDownloads.has(userId)) {
          const url = msg.text; // ลิงก์ที่ผู้ใช้ส่งมา

          // ตรวจสอบว่าลิงก์เป็น TikTok หรือไม่
          if (url && url.includes("tiktok.com")) {
            bot.sendMessage(chatId, "🔄 กำลังดาวน์โหลดวิดีโอ TikTok...");

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
              const videoPath = await downloadVideo(videoUrl, userId);
              await bot.sendVideo(chatId, videoPath);

              // ลบไฟล์วิดีโอหลังจากส่งเสร็จ
              fs.unlinkSync(videoPath);

              // หยุดการทำงานหลังจากดาวน์โหลดเสร็จ
              activeDownloads.delete(userId);
              bot.sendMessage(chatId, "✅ ดาวน์โหลดวิดีโอ TikTok เสร็จสิ้น");
            } else {
              bot.sendMessage(chatId, "❌ ไม่สามารถดาวน์โหลดวิดีโอ TikTok ได้");
              activeDownloads.delete(userId); // หยุดการทำงานหากเกิดข้อผิดพลาด
            }
          } else {
            bot.sendMessage(chatId, "❌ ลิงก์ที่ส่งมาไม่ใช่ลิงก์ TikTok กรุณาส่งลิงก์ที่ถูกต้อง");
            activeDownloads.delete(userId); // หยุดการทำงานหากลิงก์ไม่ถูกต้อง
          }
        }
      } catch (error) {
        console.error("Error in TikTok download process:", error.message);
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการดาวน์โหลดวิดีโอ TikTok");
        activeDownloads.delete(userId); // หยุดการทำงานหากเกิดข้อผิดพลาด
      }
    });

    // ฟังก์ชันสำหรับดาวน์โหลดวิดีโอ
    async function downloadVideo(videoUrl, userId) {
      const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream',
      });

      const videoPath = path.join(__dirname, `${userId}_tiktok.mp4`);
      const writer = fs.createWriteStream(videoPath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(videoPath));
        writer.on('error', reject);
      });
    }
  },
};
