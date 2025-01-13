const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ytdl',
  description: 'ดาวน์โหลดวิดีโอหรือไฟล์เสียงจาก YouTube และลบข้อความ "กำลังประมวลผล" หลังจากเสร็จสิ้น พร้อมระบบหักเงิน 1 บาท',
  execute(bot) {
    // ------------------------------------------------------------------------
    // ส่วนสำหรับโหลด/บันทึกข้อมูลผู้ใช้ (สตางค์ในกระเป๋า)
    // ------------------------------------------------------------------------
    const filePath = path.join(__dirname, 'smo.json');

    function loadOrCreateFile() {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }

    function saveToFile(data) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
    // ------------------------------------------------------------------------

    // ใช้ Map เพื่อเก็บข้อมูลวิดีโอและไฟล์เสียงสำหรับแต่ละแชท (session ชั่วคราว)
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
          // ส่งข้อความ "กำลังประมวลผลลิงก์..." และเก็บ messageId
          const processingMessage = await bot.sendMessage(
            chatId, 
            "🔄 กำลังประมวลผลลิงก์..."
          );

          // เรียกใช้ API เพื่อดึงข้อมูลวิดีโอ
          const apiUrl = `https://yt-video-production.up.railway.app/ytdl?url=${encodeURIComponent(url)}`;
          const response = await axios.get(apiUrl);

          if (response.data.status === "true") {
            const { title, thumbnail, video, audio } = response.data;

            // เก็บข้อมูลวิดีโอและไฟล์เสียงใน Map
            mediaMap.set(chatId, { video, audio });

            // ส่งข้อมูลวิดีโอและปุ่มเลือกรูปแบบ
            const sentMessage = await bot.sendPhoto(chatId, thumbnail, {
              caption: `🎥 **${title}**\n\n⬇️ เลือกรูปแบบที่ต้องการดาวน์โหลด (เสีย 1 บาทเมื่อสำเร็จ):`,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "📥 ดาวน์โหลดวิดีโอ", callback_data: `video_${chatId}_${processingMessage.message_id}` },
                    { text: "🎵 ดาวน์โหลดไฟล์เสียง", callback_data: `audio_${chatId}_${processingMessage.message_id}` },
                  ],
                ],
              },
            });

            // เก็บ message_id เพื่อลบข้อความในภายหลัง
            mediaMap.set(chatId, { ...mediaMap.get(chatId), messageId: sentMessage.message_id });

            // ลบข้อความ "กำลังประมวลผลลิงก์..."
            await deleteMessageSafely(bot, chatId, processingMessage.message_id);
          } else {
            bot.sendMessage(chatId, "❌ ไม่สามารถดึงข้อมูลวิดีโอได้");
          }
        }
        // ไม่ต้องทำอะไรหากลิงก์ไม่ใช่ YouTube
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดาวน์โหลดวิดีโอ:", error.message);
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการประมวลผลคำขอของคุณ");
      }
    });

    // จับการกดปุ่ม Callback (ดาวน์โหลดวิดีโอหรือไฟล์เสียง)
    bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id;
      const data = callbackQuery.data;

      try {
        // แยก string จาก callback_data เช่น "video_CHATID_PROCESSINGMESSAGEID"
        const [type, _chatId, processingMessageId] = data.split('_');

        // ดึงข้อมูลวิดีโอและไฟล์เสียงจาก Map
        const media = mediaMap.get(chatId);
        if (!media) {
          return bot.sendMessage(chatId, "❌ ไม่พบข้อมูลวิดีโอ กรุณาลองใหม่อีกครั้ง");
        }

        // ----------------------------------------------------------------------------
        // ตรวจสอบ/โหลดข้อมูลผู้ใช้ จาก smo.json
        // ----------------------------------------------------------------------------
        const dataStore = loadOrCreateFile();
        if (!dataStore[userId]) {
          // หากไม่มีข้อมูล userId นี้ ให้เซ็ตยอดเงินเริ่มต้นเป็น 0
          dataStore[userId] = { balance: 0 };
        }
        
        // ตรวจสอบยอดเงิน ถ้าน้อยกว่า 1 บาท ให้ยกเลิก
        if (dataStore[userId].balance < 1) {
          await bot.sendMessage(chatId, "❌ ยอดเงินไม่เพียงพอ (ต้องมีอย่างน้อย 1 บาท)");
          // เคลียร์ callback นี้เพื่อให้หายค้าง
          return bot.answerCallbackQuery(callbackQuery.id);
        }
        // ----------------------------------------------------------------------------

        // ส่งข้อความ "กำลังดาวน์โหลดไฟล์..."
        const downloadingMessage = await bot.sendMessage(chatId, "🔄 กำลังดาวน์โหลดไฟล์...");

        // เลือกว่าเป็น video หรือ audio
        const fileUrl = type === 'video' ? media.video : media.audio;

        // ดาวน์โหลดไฟล์จาก URL
        const filePath = await downloadFile(fileUrl, chatId, type);

        // ส่งไฟล์กลับผู้ใช้
        if (type === 'video') {
          await bot.sendVideo(chatId, fs.createReadStream(filePath), {}, { contentType: 'video/mp4' });
        } else if (type === 'audio') {
          await bot.sendAudio(chatId, fs.createReadStream(filePath), {}, { contentType: 'audio/mpeg' });
        }

        // ลบไฟล์หลังจากส่งเสร็จ
        fs.unlinkSync(filePath);

        // ถ้าส่งไฟล์ “สำเร็จ” ถึงขั้นนี้ => หักเงิน 1 บาท
        dataStore[userId].balance -= 1;
        saveToFile(dataStore);

        // ลบข้อมูล media ออกจาก Map
        mediaMap.delete(chatId);

        // ลบข้อความ "กำลังดาวน์โหลดไฟล์..."
        await deleteMessageSafely(bot, chatId, downloadingMessage.message_id);

        // ลบข้อความ "กำลังประมวลผลลิงก์..."
        await deleteMessageSafely(bot, chatId, processingMessageId);

        // ลบข้อความ "⬇️ เลือกรูปแบบ..."
        await deleteMessageSafely(bot, chatId, callbackQuery.message.message_id);

      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์:", error.message);
        bot.sendMessage(chatId, "❌ ไม่สามารถดาวน์โหลดไฟล์ได้");

        // *** ถ้าระบบล้มเหลว => ยังไม่หักเงิน ***
        // จึงไม่มีการแก้ไข dataStore[userId].balance ที่นี่

      } finally {
        // ตอบ callback เพื่อให้ Telegram รู้ว่าเรารับ event แล้ว
        bot.answerCallbackQuery(callbackQuery.id);
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

    // ฟังก์ชันสำหรับลบข้อความอย่างปลอดภัย
    async function deleteMessageSafely(bot, chatId, messageId) {
      try {
        await bot.deleteMessage(chatId, messageId);
      } catch (error) {
        console.error("ไม่สามารถลบข้อความได้:", error.message);
      }
    }
  },
};
