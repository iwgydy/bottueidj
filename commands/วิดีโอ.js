const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ytdl',
  description: 'ดาวน์โหลดวิดีโอหรือไฟล์เสียงจาก YouTube',
  execute(bot) {
    // จับคำสั่ง /ytdl
    bot.onText(/\/ytdl/, (msg) => {
      const chatId = msg.chat.id;
      bot.sendMessage(chatId, "📥 กรุณาวางลิงก์ YouTube ที่ต้องการดาวน์โหลด:");
    });

    // รับลิงก์ YouTube ที่ผู้ใช้ส่งมา
    bot.on('message', async (msg) => {
      try {
        const chatId = msg.chat.id;
        const url = msg.text; // ลิงก์ที่ผู้ใช้ส่งมา

        // ตรวจสอบว่าลิงก์เป็น YouTube หรือไม่
        if (url && (url.includes("youtube.com") || url.includes("youtu.be"))) {
          // แจ้งผู้ใช้ว่ากำลังประมวลผล
          bot.sendMessage(chatId, "🔄 กำลังประมวลผลลิงก์...");

          // เรียกใช้ API เพื่อดึงข้อมูลวิดีโอ
          const apiUrl = `https://yt-video-production.up.railway.app/ytdl?url=${encodeURIComponent(url)}`;
          const response = await axios.get(apiUrl);

          // ตรวจสอบผลลัพธ์จาก API
          if (response.data.status === "true") {
            const { title, thumbnail, video, audio } = response.data;

            // ส่งข้อมูลวิดีโอและปุ่มเลือกรูปแบบ
            await bot.sendPhoto(chatId, thumbnail, {
              caption: `🎥 **${title}**\n\n⬇️ เลือกรูปแบบที่ต้องการดาวน์โหลด:`,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "📥 ดาวน์โหลดวิดีโอ", callback_data: `video_${video}` },
                    { text: "🎵 ดาวน์โหลดไฟล์เสียง", callback_data: `audio_${audio}` },
                  ],
                ],
              },
            });
          } else {
            bot.sendMessage(chatId, "❌ ไม่สามารถดาวน์โหลดวิดีโอได้");
          }
        }
      } catch (error) {
        console.error("Error in YouTube download process:", error.message);
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการดาวน์โหลด");
      }
    });

    // จับการกดปุ่ม Callback (ดาวน์โหลดวิดีโอหรือไฟล์เสียง)
    bot.on('callback_query', async (callbackQuery) => {
      try {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data; // ข้อมูล callback_data
        const [type, fileUrl] = data.split('_'); // แยกประเภทและลิงก์ไฟล์

        // แจ้งผู้ใช้ว่ากำลังดาวน์โหลด
        bot.sendMessage(chatId, "🔄 กำลังดาวน์โหลดไฟล์...");

        // ดาวน์โหลดไฟล์
        const filePath = await downloadFile(fileUrl, chatId, type);
        if (type === 'video') {
          await bot.sendVideo(chatId, filePath);
        } else if (type === 'audio') {
          await bot.sendAudio(chatId, filePath);
        }

        // ลบไฟล์หลังจากส่งเสร็จ
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error("Error in callback query:", error.message);
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์");
      }
    });

    // ฟังก์ชันสำหรับดาวน์โหลดไฟล์
    async function downloadFile(fileUrl, chatId, type) {
      const response = await axios({
        method: 'GET',
        url: fileUrl,
        responseType: 'stream',
      });

      const fileExtension = type === 'video' ? 'mp4' : 'mp3';
      const filePath = path.join(__dirname, `${chatId}_${type}.${fileExtension}`);
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });
    }
  },
};
