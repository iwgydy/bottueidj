const fs = require("fs");
const path = require("path");

module.exports = (bot) => {
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;

    // อ่านไฟล์ในโฟลเดอร์ commands
    const commandsPath = path.join(__dirname);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    // สร้างข้อความแสดงคำสั่งทั้งหมด
    let helpMessage = "📖 **คำสั่งทั้งหมดที่สามารถใช้งานได้:**\n\n";
    commandFiles.forEach((file) => {
      const commandName = file.replace(".js", "");
      helpMessage += `• /${commandName}\n`;
    });

    // ส่งข้อความคำสั่งทั้งหมดให้ผู้ใช้
    bot.sendMessage(chatId, helpMessage, { parse_mode: "Markdown" });
  });
};
