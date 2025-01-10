const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ytdl',
  description: 'ดาวน์โหลดวิดีโอหรือไฟล์เสียงจาก YouTube พร้อมการจัดการข้อผิดพลาดแบบไฮเทค',
  execute(bot) {
    // ใช้ Map เพื่อเก็บข้อมูลวิดีโอและไฟล์เสียงสำหรับแต่ละแชท
    const mediaMap = new Map();

    // จับคำสั่ง /ytdl
    bot.onText(/\/ytdl/, (msg) => {
      const chatId = msg.chat.id;
      bot.sendMessage(chatId, "📥 กรุณาวางลิงก์ YouTube ที่ต้องการดาวน์โหลด:");
    });

    // รับลิงก์ YouTube ที่ผู้ใช้ส่งมา
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const url = msg.text;

      try {
        // ตรวจสอบว่าลิงก์เป็น YouTube หรือไม่
        if (url && (url.includes("youtube.com") || url.includes("youtu.be"))) {
          bot.sendMessage(chatId, "🔄 กำลังประมวลผลลิงก์...");

          // เรียกใช้ API เพื่อดึงข้อมูลวิดีโอ
          const apiUrl = `https://yt-video-production.up.railway.app/ytdl?url=${encodeURIComponent(url)}`;
          const response = await axios.get(apiUrl);

          if (response.data.status === "true") {
            const { title, thumbnail, video, audio } = response.data;

            // เก็บข้อมูลวิดีโอและไฟล์เสียงใน Map
            mediaMap.set(chatId, { video, audio });

            // ส่งข้อมูลวิดีโอและปุ่มเลือกรูปแบบ
            await bot.sendPhoto(chatId, thumbnail, {
              caption: `🎥 **${title}**\n\n⬇️ เลือกรูปแบบที่ต้องการดาวน์โหลด:`,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "📥 ดาวน์โหลดวิดีโอ", callback_data: `video_${chatId}` },
                    { text: "🎵 ดาวน์โหลดไฟล์เสียง", callback_data: `audio_${chatId}` },
                  ],
                ],
              },
            });
          } else {
            sendError(chatId, "API ไม่สามารถดึงข้อมูลวิดีโอได้");
          }
        } else {
          sendError(chatId, "ลิงก์ที่ส่งมาไม่ใช่ลิงก์ YouTube");
        }
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดาวน์โหลดวิดีโอ:", error.message);
        sendError(chatId, "เกิดข้อผิดพลาดในการประมวลผลคำขอของคุณ");
      }
    });

    // จับการกดปุ่ม Callback (ดาวน์โหลดวิดีโอหรือไฟล์เสียง)
    bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;

      try {
        const [type, id] = data.split('_');

        // ดึงข้อมูลวิดีโอและไฟล์เสียงจาก Map
        const media = mediaMap.get(chatId);
        if (!media) {
          return sendError(chatId, "ไม่พบข้อมูลวิดีโอ กรุณาลองใหม่อีกครั้ง");
        }

        const fileUrl = type === 'video' ? media.video : media.audio;

        // แจ้งผู้ใช้ว่ากำลังดาวน์โหลด
        bot.sendMessage(chatId, "🔄 กำลังดาวน์โหลดไฟล์...");

        // ดาวน์โหลดและส่งไฟล์
        const filePath = await downloadFile(fileUrl, chatId, type);
        if (type === 'video') {
          await bot.sendVideo(chatId, filePath);
        } else if (type === 'audio') {
          await bot.sendAudio(chatId, filePath);
        }

        // ลบไฟล์หลังจากส่งเสร็จ
        fs.unlinkSync(filePath);
        mediaMap.delete(chatId); // ลบข้อมูลหลังจากดาวน์โหลดเสร็จ
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์:", error.message);
        sendError(chatId, "ไม่สามารถดาวน์โหลดไฟล์ได้");
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

    // ฟังก์ชันสำหรับส่งข้อความผิดพลาดแบบไฮเทค
    function sendError(chatId, errorMessage) {
      const currentDate = new Date().toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      });
      const currentTime = new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const errorDetails = `
📅 **วันที่:** ${currentDate}
⏰ **เวลา:** ${currentTime}
💡 **ข้อผิดพลาด:** ${errorMessage}
      `;

      bot.sendMessage(chatId, `❌ ระบบขัดข้อง\n\n${errorDetails}`);
    }
  },
};
