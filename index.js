/***********************************************
 * index.js
 * ไฟล์หลักของบอท - โค้ดเฉพาะที่ใช้สร้างและรันบอท
 ***********************************************/
 
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

// 1) ใส่ Token ของบอท Telegram
const token = 'YOUR_TELEGRAM_BOT_TOKEN';

// 2) สร้าง instance ของบอท (ตั้งค่า polling ให้บอทฟังข้อความ)
const bot = new TelegramBot(token, { polling: true });

bot.on('polling_error', (err) => console.error('Telegram polling error:', err));
console.log("Bot is up and running...");

// 3) โหลดไฟล์คำสั่งจากโฟลเดอร์ commands
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).forEach((file) => {
  if (file.endsWith('.js')) {
    // ดึงฟังก์ชันจากไฟล์คำสั่ง
    const commandHandler = require(path.join(commandsPath, file));
    // เรียกใช้ฟังก์ชัน พร้อมส่ง bot เข้าไป
    commandHandler(bot);
  }
});

// 4) ตัวอย่าง: หากต้องการให้บอทตอบข้อความทั่ว ๆ ไป (ที่ไม่ใช่คำสั่ง)
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || "";

  // หากไม่ใช่คำสั่ง (ไม่ขึ้นต้นด้วย '/')
  if (!text.startsWith('/')) {
    // จะตอบกลับไปแบบนี้ (ปรับแก้ได้ตามต้องการ)
    bot.sendMessage(chatId, "สวัสดี! ลองพิมพ์ /start หรือ /เพลง ชื่อเพลง ได้เลย");
  }
});
