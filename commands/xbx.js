const axios = require('axios');

module.exports = {
  name: 'gpt',
  description: 'คุยกับ GPT ผ่าน API',
  execute(bot) {
    bot.onText(/\/gpt (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const query = match[1]; // รับข้อความที่ผู้ใช้ป้อนตามหลังคำสั่ง /gpt

      bot.sendMessage(chatId, "🔄 กำลังส่งข้อความไปยัง GPT...");

      try {
        // เรียกใช้ API
        const apiUrl = `https://kaiz-apis.gleeze.com/api/gpt-3.5?q=${encodeURIComponent(query)}`;
        const response = await axios.get(apiUrl);

        if (response.data && response.data.response) {
          bot.sendMessage(chatId, `🤖 GPT ตอบว่า: ${response.data.response}`);
        } else {
          bot.sendMessage(chatId, "❌ ไม่สามารถดึงคำตอบจาก GPT ได้");
        }
      } catch (error) {
        console.error("Error calling GPT API:", error.message);
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับ GPT");
      }
    });
  },
};
