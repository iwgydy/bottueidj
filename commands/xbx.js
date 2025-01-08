const axios = require('axios');

module.exports = {
  name: 'gpt',
  description: 'คุยกับ GPT ต่อเนื่องได้ 5 นาที และจดจำข้อความเดิม',
  execute(bot) {
    const activeChats = new Map(); // เก็บสถานะการใช้งานของแต่ละแชท
    const chatHistories = new Map(); // เก็บประวัติการสนทนาของแต่ละแชท

    bot.onText(/\/gpt (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const query = match[1]; // ข้อความที่ผู้ใช้ส่งหลังคำสั่ง /gpt

      // ตั้งสถานะให้แชทนี้ใช้งาน GPT ได้ต่อเนื่อง
      activeChats.set(chatId, Date.now());

      // ส่งข้อความไปยัง GPT พร้อมกับประวัติการสนทนา
      await sendMessageToGPT(bot, chatId, query);

      // ลบสถานะหลังจาก 5 นาที
      setTimeout(() => {
        activeChats.delete(chatId);
        chatHistories.delete(chatId); // ลบประวัติการสนทนาด้วย
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
    async function sendMessageToGPT(bot, chatId, query) {
      bot.sendMessage(chatId, "🔄 กำลังส่งข้อความไปยัง GPT...");

      try {
        // ดึงประวัติการสนทนาจาก Map
        const history = chatHistories.get(chatId) || [];
        history.push({ role: 'user', content: query }); // เพิ่มข้อความผู้ใช้ลงในประวัติ

        const apiUrl = `https://kaiz-apis.gleeze.com/api/gpt-4o-pro`;
        const params = {
          q: query,
          uid: chatId, // ใช้ chatId เป็น uid
          imageUrl: "สวัสดี", // หากไม่มี imageUrl ให้ส่ง "สวัสดี" เป็นค่าเริ่มต้น
          history: JSON.stringify(history), // ส่งประวัติการสนทนาไปด้วย
        };

        const response = await axios.get(apiUrl, { params });

        if (response.data && response.data.response) {
          const gptResponse = response.data.response;
          bot.sendMessage(chatId, `🤖 GPT ตอบว่า: ${gptResponse}`);

          // เพิ่มคำตอบของ GPT ลงในประวัติการสนทนา
          history.push({ role: 'assistant', content: gptResponse });
          chatHistories.set(chatId, history); // อัปเดตประวัติการสนทนา
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
