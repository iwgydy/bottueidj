// commands/tiksearch.js

const axios = require('axios');

module.exports = {
  name: 'ค้นหา', // ชื่อคำสั่ง (ไม่ต้องมี /)
  description: 'ค้นหาวิดีโอ TikTok ผ่าน API โดยใช้คำค้นที่ระบุ',
  execute: (bot) => {
    // ------------------------------------------------------------
    // 1) หากพิมพ์ /ค้นหา แต่ไม่มีคำค้น
    // ------------------------------------------------------------
    bot.onText(/^\/ค้นหา(?:@\w+)?$/, (msg) => {
      bot.sendMessage(
        msg.chat.id,
        "❗ โปรดระบุคำค้นหาด้วย\n\nตัวอย่าง: `/ค้นหา ปรารถนาสิ่งใด`",
        { parse_mode: "Markdown" }
      );
    });

    // ------------------------------------------------------------
    // 2) คำสั่ง /ค้นหา <คำค้น>
    // ------------------------------------------------------------
    bot.onText(/^\/ค้นหา(?:@\w+)?\s+(.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const query = match[1].trim();

      if (!query) {
        return bot.sendMessage(
          chatId,
          "❗ กรุณาระบุคำที่ต้องการค้นหา เช่น `/ค้นหา ปรารถนาสิ่งใด`",
          { parse_mode: "Markdown" }
        );
      }

      // แจ้งว่ากำลังค้นหา
      let searchingMsg;
      try {
        searchingMsg = await bot.sendMessage(chatId, `🔍 กำลังค้นหา: "${query}" ...`);
      } catch (error) {
        console.error("ส่งข้อความแจ้งสถานะไม่สำเร็จ:", error);
      }

      // เรียกใช้ API
      const apiUrl = `https://kaiz-apis.gleeze.com/api/tiksearch?search=${encodeURIComponent(query)}`;

      try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        // ตรวจสอบผลลัพธ์
        if (!data?.data?.videos || data.data.videos.length === 0) {
          if (searchingMsg) {
            // ลบ "กำลังค้นหา"
            try {
              await bot.deleteMessage(chatId, searchingMsg.message_id);
            } catch (err) {
              console.error("ลบข้อความกำลังค้นหาไม่สำเร็จ:", err.message);
            }
          }
          return bot.sendMessage(chatId, `❗ ไม่พบวิดีโอที่เกี่ยวข้องกับ "${query}"`);
        }

        // เลือกวิดีโอแรก
        const video = data.data.videos[0];
        const videoInfo = `
🎥 *ชื่อวิดีโอ*: ${video.title}
👤 *ผู้สร้าง*: ${video.author.nickname} (@${video.author.unique_id})
🌟 *ยอดถูกใจ*: ${video.digg_count}
💬 *ความคิดเห็น*: ${video.comment_count}
🔗 *ลิงก์วิดีโอ*: [TikTok](https://www.tiktok.com/@${video.author.unique_id}/video/${video.video_id})
        `.trim();

        // พยายามดาวน์โหลดไฟล์วิดีโอ (ถ้าใหญ่มากส่งไม่ผ่าน)
        let videoBuffer;
        try {
          const vidRes = await axios({
            url: video.play,
            method: 'GET',
            responseType: 'arraybuffer',
          });
          videoBuffer = vidRes.data;
        } catch (err) {
          console.error("❌ เกิดข้อผิดพลาดในการดึงไฟล์วิดีโอ:", err.message);
          // ลบ "กำลังค้นหา"
          if (searchingMsg) {
            try {
              await bot.deleteMessage(chatId, searchingMsg.message_id);
            } catch (err) {
              console.error("ลบข้อความกำลังค้นหาไม่สำเร็จ:", err.message);
            }
          }
          // ส่งเฉพาะข้อมูลตัวอักษร
          return bot.sendMessage(chatId, videoInfo, { parse_mode: "Markdown" });
        }

        // ลบ "กำลังค้นหา"
        if (searchingMsg) {
          try {
            await bot.deleteMessage(chatId, searchingMsg.message_id);
          } catch (err) {
            console.error("ลบข้อความกำลังค้นหาไม่สำเร็จ:", err.message);
          }
        }

        // ส่งวิดีโอ + ข้อความ (ถ้าไฟล์ > 50MB จะส่งไม่ได้)
        bot.sendVideo(chatId, videoBuffer, {
          caption: videoInfo,
          parse_mode: "Markdown"
        }).catch(err => {
          console.error("ส่งวิดีโอไม่สำเร็จ:", err.message);
          bot.sendMessage(
            chatId,
            `${videoInfo}\n\n❌ วิดีโอส่งไม่สำเร็จ`,
            { parse_mode: "Markdown" }
          );
        });

      } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการเรียก API:", error.message);

        // ลบ "กำลังค้นหา"
        if (searchingMsg) {
          try { 
            await bot.deleteMessage(chatId, searchingMsg.message_id); 
          } catch (err) {
            console.error("ลบข้อความกำลังค้นหาไม่สำเร็จ:", err.message);
          }
        }

        return bot.sendMessage(
          chatId,
          "❗ ไม่สามารถค้นหาวิดีโอได้ในขณะนี้ กรุณาลองใหม่ภายหลัง"
        );
      }
    });
  }
};
