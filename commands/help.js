const fs = require('fs');
const path = require('path');

module.exports = (bot) => {
  bot.onText(/\/ดูคำสั่งทั้งหมด/, (msg) => {
    const chatId = msg.chat.id;

    try {
      // อ่านรายชื่อไฟล์ในโฟลเดอร์ commands
      const commandsPath = path.join(__dirname);
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

      // สร้างข้อความคำสั่งทั้งหมด
      let commandList = "📋 รายชื่อคำสั่งทั้งหมด:\n\n";
      for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.config && command.config.name) {
          commandList += `• /${command.config.name} - ${command.config.description || "ไม่มีคำอธิบาย"}\n`;
        }
      }

      // ส่งข้อความกลับไปให้ผู้ใช้
      bot.sendMessage(chatId, commandList.trim());
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการดึงคำสั่ง:", error.message);
      bot.sendMessage(chatId, "❗ ไม่สามารถดึงรายชื่อคำสั่งได้ในขณะนี้");
    }
  });
};
