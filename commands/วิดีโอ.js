const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ytdl',
  description: 'ดาวน์โหลดวิดีโอหรือไฟล์เสียงจาก YouTube',
  execute(bot) {
    // จับคำสั่ง /ytdl
    bot.onText(/\/ytdl (.+)/, async (msg, match) => {
      try {
        const chatId = msg.chat.id;
        const args = match[1].split(' '); // แยกคำสั่งและพารามิเตอร์
        const url = args[0]; // ลิงก์วิดีโอ YouTube
        const quality = args[1] || '720'; // คุณภาพ (ค่าเริ่มต้น: 720)

        // ตรวจสอบพารามิเตอร์
        if (!url || !quality) {
          return bot.sendMessage(
            chatId,
            "❌ กรุณาระบุลิงก์และคุณภาพ\n\nตัวอย่างการใช้งาน:\n/ytdl <ลิงก์> <คุณภาพ>\nคุณภาพที่รองรับ: 360, 720, 1080, mp3"
          );
        }

        // ตรวจสอบว่าลิงก์เป็น YouTube หรือไม่
        if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
          return bot.sendMessage(chatId, "❌ ลิงก์ที่ส่งมาไม่ใช่ลิงก์ YouTube");
        }

        // ตรวจสอบคุณภาพที่รองรับ
        const supportedQualities = ['360', '720', '1080', 'mp3'];
        if (!supportedQualities.includes(quality)) {
          return bot.sendMessage(
            chatId,
            "❌ คุณภาพไม่ถูกต้อง\nคุณภาพที่รองรับ: 360, 720, 1080, mp3"
          );
        }

        // แจ้งผู้ใช้ว่ากำลังดาวน์โหลด
        bot.sendMessage(chatId, "🔄 กำลังดาวน์โหลด...");

        // เรียกใช้ API เพื่อดาวน์โหลด
        const apiUrl = `https://kaiz-apis.gleeze.com/api/ytmp4?url=${encodeURIComponent(url)}&quality=${quality}`;
        const response = await axios.get(apiUrl, { responseType: 'stream' });

        // สร้างไฟล์ชั่วคราว
        const filePath = path.join(__dirname, `${chatId}_ytdl.${quality === 'mp3' ? 'mp3' : 'mp4'}`);
        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        writer.on('finish', async () => {
          // ส่งไฟล์ให้ผู้ใช้
          if (quality === 'mp3') {
            await bot.sendAudio(chatId, filePath);
          } else {
            await bot.sendVideo(chatId, filePath);
          }

          // ลบไฟล์หลังจากส่งเสร็จ
          fs.unlinkSync(filePath);
        });

        writer.on('error', (error) => {
          console.error("Error writing file:", error.message);
          bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการดาวน์โหลด");
          fs.unlinkSync(filePath); // ลบไฟล์หากเกิดข้อผิดพลาด
        });
      } catch (error) {
        console.error("Error in /ytdl command:", error.message);
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการดาวน์โหลด");
      }
    });

    // จับคำสั่ง /ytdl โดยไม่มีพารามิเตอร์
    bot.onText(/\/ytdl$/, (msg) => {
      const chatId = msg.chat.id;
      bot.sendMessage(
        chatId,
        "❌ กรุณาระบุลิงก์และคุณภาพ\n\nตัวอย่างการใช้งาน:\n/ytdl <ลิงก์> <คุณภาพ>\nคุณภาพที่รองรับ: 360, 720, 1080, mp3"
      );
    });
  },
};
