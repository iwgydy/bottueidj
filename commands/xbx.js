const axios = require('axios');

module.exports = {
  name: 'gpt',
  description: 'คุยกับ GPT ต่อเนื่องได้ 5 นาที',
  execute(bot) {
    const activeChats = new Map(); // ใช้เก็บสถานะการใช้งานของแต่ละแชท

    bot.onText(/\/gpt (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const query = match[1]; // ข้อความที่ผู้ใช้ส่งหลังคำสั่ง /gpt

      // ตั้งสถานะให้แชทนี้ใช้งาน GPT ได้ต่อเนื่อง
      activeChats.set(chatId, Date.now());

      // ส่งข้อความไปยัง GPT
      await sendMessageToGPT(bot, chatId, query);

      // ลบสถานะหลังจาก 5 นาที
      setTimeout(() => {
        activeChats.delete(chatId);
      }, 5 * 60 * 1000);
    });

    // รับข้อความที่ไม่ได้เริ่มต้นด้วย /
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;

      // หากแชทนี้อยู่ในสถานะใช้งาน GPT ต่อเนื่อง
      if (activeChats.has(chatId)) {
        const query = msg.text; // ข้อความที่ผู้ใช้ส่งมา
        await sendMessageToGPT(bot, chatId, query);
      }
    });

    // ฟังก์ชันสำหรับส่งข้อความไปยัง GPT
    async function sendMessageToGPT(bot, chatId, query, imageUrl = null) {
      bot.sendMessage(chatId, "🔄 กำลังส่งข้อความไปยัง GPT...");

      try {
        const apiUrl = `https://kaiz-apis.gleeze.com/api/gpt-4o-pro`;
        const params = {
          q: query,
          uid: chatId, // ใช้ chatId เป็น uid
          imageUrl: imageUrl || "สวัสดี", // หากไม่มี imageUrl ให้ส่ง "สวัสดี" เป็นค่าเริ่มต้น
        };

        const response = await axios.get(apiUrl, { params });

        if (response.data && response.data.response) {
          bot.sendMessage(chatId, `🤖 GPT ตอบว่า: ${response.data.response}`);
        } else {
          bot.sendMessage(chatId, "❌ ไม่สามารถดึงคำตอบจาก GPT ได้");
        }
      } catch (error) {
        console.error("Error calling GPT API:", error.message);
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับ GPT");
      }
    }
  },
};
