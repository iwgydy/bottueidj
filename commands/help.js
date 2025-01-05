// commands/viewCommands.js

module.exports = {
  name: 'ดูคำสั่งทั้งหมด',
  description: 'แสดงรายการคำสั่งทั้งหมดที่มีอยู่ในบอท',
  execute: (bot) => {
    bot.onText(/^\/ดูคำสั่งทั้งหมด(?:@\w+)?$/, (msg) => {
      const chatId = msg.chat.id;
      if (bot.commands.size === 0) {
        bot.sendMessage(chatId, "⚠️ ยังไม่มีคำสั่งใด ๆ ที่ถูกเพิ่มเข้าไปในบอท");
        return;
      }

      let response = "📜 **รายการคำสั่งทั้งหมด:**\n\n";
      bot.commands.forEach((description, command) => {
        response += `• *${command}*: ${description}\n`;
      });

      bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
    });
  }
};
