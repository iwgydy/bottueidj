const axios = require('axios');

module.exports = {
  name: 'searchmusic',
  description: 'ค้นหาเพลงจาก YouTube โดยใช้คำค้นหาหรือลิงก์',
  execute(bot) {
    // จับคำสั่ง /searchmusic
    bot.onText(/\/searchmusic (.+)/, async (msg, match) => {
      try {
        const chatId = msg.chat.id;
        const query = match[1]; // รับคำค้นหาจากผู้ใช้

        // เรียกใช้ API เพื่อค้นหาเพลง
        const apiUrl = `https://kaiz-apis.gleeze.com/api/ytsearch?q=${encodeURIComponent(query)}`;
        const response = await axios.get(apiUrl);

        if (response.data && response.data.results) {
          const results = response.data.results;

          // ส่งผลลัพธ์ให้ผู้ใช้
          let message = "🎵 ผลการค้นหาเพลง:\n\n";
          results.forEach((result, index) => {
            message += `${index + 1}. **${result.title}**\n`;
            message += `👤 ผู้สร้าง: ${result.author}\n`;
            message += `⏳ ความยาว: ${result.duration}\n`;
            message += `🔗 ลิงก์: [คลิกที่นี่](${result.url})\n\n`;
          });

          // ส่งข้อความพร้อมกับรูปแบบ Markdown
          await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } else {
          bot.sendMessage(chatId, "❌ ไม่พบผลลัพธ์จากการค้นหา");
        }
      } catch (error) {
        console.error("Error in /searchmusic command:", error.message);
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการค้นหาเพลง");
      }
    });

    // จับคำสั่ง /searchmusic โดยไม่มีคำค้นหา
    bot.onText(/\/searchmusic$/, (msg) => {
      const chatId = msg.chat.id;
      bot.sendMessage(chatId, "❌ กรุณาระบุคำค้นหา เช่น /searchmusic <คำค้นหา>");
    });
  },
};
