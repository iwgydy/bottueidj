const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'downloadtiktok',
  description: 'ดาวน์โหลดวิดีโอ TikTok จากลิงก์ที่ผู้ใช้ส่งมา (เสีย 1 บาทเมื่อสำเร็จ)',
  execute(bot) {
    const activeDownloads = new Map(); // ใช้เก็บสถานะการใช้งานของแต่ละผู้ใช้

    // -----------------------------
    // ส่วนจัดการยอดเงินใน smo.json
    // -----------------------------
    const filePath = path.join(__dirname, 'smo.json');

    // โหลดหรือสร้างไฟล์ smo.json
    function loadOrCreateFile() {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }

    // บันทึกข้อมูลลง smo.json
    function saveToFile(data) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // จับคำสั่ง /downloadtiktok
    bot.onText(/\/downloadtiktok/, (msg) => {
      try {
        const userId = msg.from.id;
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
        const userId = msg.from.id;
        const chatId = msg.chat.id;

        // หากผู้ใช้อยู่ในสถานะ download TikTok
        if (activeDownloads.has(userId)) {
          const url = msg.text; // ลิงก์ที่ผู้ใช้ส่งมา

          // ตรวจสอบว่าสตริงมีคำว่า "tiktok.com"
          if (url && url.includes("tiktok.com")) {
            // โหลดข้อมูลยอดเงิน
            const dataStore = loadOrCreateFile();

            // ถ้าไม่เคยมีข้อมูลของ user นี้มาก่อน ให้กำหนดเริ่มต้น
            if (!dataStore[userId]) {
              dataStore[userId] = { balance: 0 };
            }

            // ตรวจสอบว่า user มีเงิน >= 1 บาทหรือไม่
            if (dataStore[userId].balance < 1) {
              bot.sendMessage(chatId, "❌ ยอดเงินไม่เพียงพอ (ต้องมีอย่างน้อย 1 บาท)");
              // ยกเลิกสถานะดาวน์โหลด
              activeDownloads.delete(userId);
              return;
            }

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

              // ***** ดาวน์โหลดเสร็จสิ้น => หักเงิน 1 บาท *****
              dataStore[userId].balance -= 1;
              saveToFile(dataStore);

              // แจ้งว่าดาวน์โหลดเสร็จและหักเงินแล้ว
              bot.sendMessage(
                chatId,
                `✅ ดาวน์โหลดวิดีโอ TikTok เสร็จสิ้น (หักเงิน 1 บาท)\n` +
                `ยอดเงินคงเหลือ: ${dataStore[userId].balance.toFixed(2)} บาท`
              );

              // หยุดการทำงานหลังจากดาวน์โหลดเสร็จ
              activeDownloads.delete(userId);

            } else {
              bot.sendMessage(chatId, "❌ ไม่สามารถดาวน์โหลดวิดีโอ TikTok ได้");
              activeDownloads.delete(userId);
            }

          } else {
            bot.sendMessage(chatId, "❌ ลิงก์ที่ส่งมาไม่ใช่ลิงก์ TikTok กรุณาส่งลิงก์ที่ถูกต้อง");
            activeDownloads.delete(userId);
          }
        }
      } catch (error) {
        console.error("Error in TikTok download process:", error.message);
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการดาวน์โหลดวิดีโอ TikTok");
        activeDownloads.delete(msg.from.id);
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
