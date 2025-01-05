// commands/เพลง.js

const ytdl = require('ytdl-core');
const yts = require('yt-search');

module.exports = {
  name: 'เพลง', // ชื่อคำสั่ง (ไม่ต้องมี /)
  description: 'ค้นหาเพลงจาก YouTube โดยใช้ชื่อเพลงที่ระบุ',
  execute: (bot) => {
    // จับคำสั่ง /เพลง <ชื่อเพลง>
    bot.onText(/^\/เพลง(?:@\w+)?\s+(.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const songName = match[1].trim();

      if (!songName) {
        return bot.sendMessage(
          chatId,
          "❗ กรุณาใส่ชื่อเพลงที่ต้องการค้นหา เช่น `/เพลง เพลงรักเธอทั้งหมดของหัวใจ`",
          { parse_mode: "Markdown" }
        );
      }

      // แจ้งว่ากำลังค้นหา
      let searchingMsg;
      try {
        searchingMsg = await bot.sendMessage(chatId, `🔍 กำลังค้นหาเพลง: "${songName}" ...`);
      } catch (error) {
        console.error("ส่งข้อความแจ้งสถานะไม่สำเร็จ:", error);
      }

      try {
        // ค้นหาเพลงด้วย yt-search
        const searchResult = await yts(songName);
        const video = searchResult.videos.length > 0 ? searchResult.videos[0] : null;

        if (!video) {
          if (searchingMsg) {
            try {
              await bot.deleteMessage(chatId, searchingMsg.message_id);
            } catch (err) {
              console.error("ลบข้อความกำลังค้นหาไม่สำเร็จ:", err.message);
            }
          }
          return bot.sendMessage(chatId, `❗ ไม่พบเพลงที่เกี่ยวข้องกับ "${songName}"`);
        }

        const videoInfo = `
🎵 *ชื่อเพลง*: ${video.title}
👤 *ผู้สร้าง*: ${video.author.name}
🕒 *ระยะเวลา*: ${video.timestamp}
🔗 *ลิงก์เพลง*: [YouTube](${video.url})
        `.trim();

        // ตรวจสอบขนาดไฟล์เสียงไม่เกิน 50MB
        const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

        // สร้างสตรีมเสียงจาก YouTube พร้อมตั้งค่า headers
        const audioStream = ytdl(video.url, {
          filter: 'audioonly',
          quality: 'highestaudio',
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                            'Chrome/58.0.3029.110 Safari/537.3',
              // คุณสามารถเพิ่ม headers อื่นๆ ที่จำเป็นได้ที่นี่
            }
          }
        });

        let totalSize = 0;
        let canSendAudio = true;

        // สร้าง PassThrough stream เพื่อตรวจสอบขนาดไฟล์
        const { PassThrough } = require('stream');
        const passThrough = new PassThrough();

        audioStream.on('data', (chunk) => {
          totalSize += chunk.length;
          console.log(`ดาวน์โหลดไฟล์เสียงแล้ว ${totalSize} bytes`);
          if (totalSize > MAX_AUDIO_SIZE) {
            canSendAudio = false;
            audioStream.destroy(); // หยุดการดาวน์โหลด
            passThrough.destroy(); // หยุดสตรีม
            bot.sendMessage(
              chatId,
              `${videoInfo}\n\n❗ ไฟล์เสียงมีขนาดใหญ่เกินไปที่จะส่ง (มากกว่า 50MB)`,
              { parse_mode: "Markdown" }
            ).catch(err => console.error("ส่งข้อความข้อผิดพลาดไม่สำเร็จ:", err.message));
          }
        });

        audioStream.pipe(passThrough);

        audioStream.on('error', async (err) => {
          console.error("❌ เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์เสียง:", err.message);
          if (searchingMsg) {
            try {
              await bot.deleteMessage(chatId, searchingMsg.message_id);
            } catch (err) {
              console.error("ลบข้อความกำลังค้นหาไม่สำเร็จ:", err.message);
            }
          }
          bot.sendMessage(
            chatId,
            "❗ เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์เสียง กรุณาลองใหม่ภายหลัง",
            { parse_mode: "Markdown" }
          ).catch(err => console.error("ส่งข้อความข้อผิดพลาดไม่สำเร็จ:", err.message));
        });

        // เมื่อสตรีมสิ้นสุด
        audioStream.on('end', async () => {
          if (canSendAudio) {
            // ลบ "กำลังค้นหา"
            if (searchingMsg) {
              try {
                await bot.deleteMessage(chatId, searchingMsg.message_id);
              } catch (err) {
                console.error("ลบข้อความกำลังค้นหาไม่สำเร็จ:", err.message);
              }
            }

            // ส่งไฟล์เสียง
            bot.sendAudio(chatId, passThrough, {
              caption: videoInfo,
              parse_mode: "Markdown",
              title: video.title,
              performer: video.author.name,
            }).catch(err => {
              console.error("ส่งไฟล์เสียงไม่สำเร็จ:", err.message);
              bot.sendMessage(
                chatId,
                `${videoInfo}\n\n❌ ไม่สามารถส่งไฟล์เสียงได้ (ขนาดไฟล์ใหญ่เกินไปหรือเกิดข้อผิดพลาด)`,
                { parse_mode: "Markdown" }
              ).catch(err => console.error("ส่งข้อความข้อผิดพลาดไม่สำเร็จ:", err.message));
            });
          }
        });

      } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการค้นหาเพลง:", error.message);

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
          "❗ ไม่สามารถค้นหาเพลงได้ในขณะนี้ กรุณาลองใหม่ภายหลัง",
          { parse_mode: "Markdown" }
        ).catch(err => console.error("ส่งข้อความข้อผิดพลาดไม่สำเร็จ:", err.message));
      }
    });

    // จับคำสั่ง /เพลง โดยไม่ระบุชื่อเพลง
    bot.onText(/^\/เพลง(?:@\w+)?$/, (msg) => {
      bot.sendMessage(
        msg.chat.id,
        "❗ กรุณาใส่ชื่อเพลงที่ต้องการค้นหา\n\nตัวอย่าง: `/เพลง เพลงรักเธอทั้งหมดของหัวใจ`",
        { parse_mode: "Markdown" }
      ).catch(err => console.error("ส่งข้อความข้อผิดพลาดไม่สำเร็จ:", err.message));
    });
  }
};
