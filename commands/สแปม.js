module.exports = {
  name: 'spam',
  description: 'ส่งข้อความสแปมในกลุ่ม (เฉพาะแอดมิน)',
  execute(bot) {
    bot.onText(/\/spam (.+) (\d+)/, (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      const text = match[1]; // ข้อความที่ต้องการส่ง
      const count = parseInt(match[2], 10); // จำนวนครั้งที่จะส่งข้อความ

      // ตรวจสอบสิทธิ์แอดมิน
      bot.getChatAdministrators(chatId).then((admins) => {
        const isAdmin = admins.some((admin) => admin.user.id === userId);

        if (!isAdmin) {
          return bot.sendMessage(chatId, "❌ คุณต้องเป็นแอดมินของกลุ่มเพื่อใช้คำสั่งนี้!");
        }

        if (count > 1000) {
          return bot.sendMessage(chatId, "❌ จำนวนครั้งในการสแปมต้องไม่เกิน 1000 ครั้ง!");
        }

        bot.sendMessage(chatId, `✅ เริ่มส่งข้อความจำนวน ${count} ครั้ง...`);

        for (let i = 0; i < count; i++) {
          bot.sendMessage(chatId, text).catch((err) => {
            console.error("❌ เกิดข้อผิดพลาดในการส่งข้อความ:", err.message);
          });
        }

        bot.sendMessage(chatId, "✅ การสแปมข้อความเสร็จสิ้น!");
      }).catch((error) => {
        console.error("❌ เกิดข้อผิดพลาดในการตรวจสอบแอดมิน:", error.message);
        bot.sendMessage(chatId, "❌ ไม่สามารถตรวจสอบสถานะแอดมินได้!");
      });
    });
  },
};
