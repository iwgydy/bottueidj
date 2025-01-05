/***********************************************
 * index.js
 * ไฟล์หลักของบอท - โค้ดเฉพาะที่ใช้สร้างและรันบอท
 ***********************************************/

const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

// 1) ใส่ Token ของบอท Telegram (โปรดเก็บ Token ไว้เป็นความลับ 🔒)
const token = '7929038707:AAHZk78OcCN0Kdjs6mjAIV9DM0Qh-7iEHhs';

// 2) สร้าง instance ของบอท (ตั้งค่า polling ให้บอทฟังข้อความ)
const bot = new TelegramBot(token, { polling: true });

// จัดการข้อผิดพลาดในการ polling
bot.on('polling_error', (err) => console.error('⚠️ เกิดข้อผิดพลาดในการ polling ของ Telegram:', err));

console.log("🤖 บอทกำลังทำงานอยู่...");

// 3) โหลดไฟล์คำสั่งจากโฟลเดอร์ commands
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).forEach((file) => {
  if (file.endsWith('.js')) {
    // นำเข้าโมดูลคำสั่ง
    const commandHandler = require(path.join(commandsPath, file));
    // ส่ง instance ของบอทไปยังฟังก์ชันคำสั่ง
    commandHandler(bot);
  }
});

// 4) การตอบกลับเมื่อผู้ใช้ส่งข้อความที่ไม่ใช่คำสั่ง
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || "";

  // ตรวจสอบว่าข้อความเป็นคำสั่งหรือไม่
  if (text.startsWith('/')) {
    // ตรวจสอบว่าคำสั่งนั้นมีการกำหนดไว้หรือไม่
    const command = text.split(' ')[0];
    if (!bot.commands || !bot.commands.has(command)) {
      // หากไม่มีคำสั่งดังกล่าว ให้ตอบกลับข้อความนี้
      bot.sendMessage(chatId, "❗️ กรุณาพิมพ์คำสั่งให้ถูกต้อง หรือพิมพ์ /ดูคำสั่งทั้งหมด 📜 เพื่อดูรายการคำสั่งที่สามารถใช้ได้");
    }
  } else {
    // หากไม่ใช่คำสั่ง ให้ตอบกลับข้อความทั่วไป หรือปล่อยว่างไว้
    // ตัวอย่างนี้จะไม่ตอบกลับข้อความที่ไม่ใช่คำสั่ง
  }
});
