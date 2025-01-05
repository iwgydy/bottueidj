/***********************************************
 * index.js
 * ไฟล์หลักของบอท - โค้ดเฉพาะที่ใช้สร้างและรันบอท
 ***********************************************/

const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

// 1) ใส่ Token ของบอท Telegram (โปรดเก็บ Token ไว้เป็นความลับ 🔒)
const token = '7929038707:AAHZk78OcCN0Kdjs6mjAIV9DM0Qh-7iEHhs'; // แทนที่ด้วย Token จริงของคุณ

// 2) สร้าง instance ของบอท (ตั้งค่า polling ให้บอทฟังข้อความ)
const bot = new TelegramBot(token, { polling: true });

// จัดการข้อผิดพลาดในการ polling
bot.on('polling_error', (err) => console.error('⚠️ เกิดข้อผิดพลาดในการ polling ของ Telegram:', err));

console.log("🤖 บอทกำลังทำงานอยู่...");

// 3) สร้าง Collection สำหรับเก็บคำสั่ง
bot.commands = new Map();

// 4) โหลดไฟล์คำสั่งจากโฟลเดอร์ commands
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).forEach((file) => {
  if (file.endsWith('.js')) {
    // นำเข้าโมดูลคำสั่ง
    const command = require(path.join(commandsPath, file));
    // ตรวจสอบว่าไฟล์คำสั่งมีโครงสร้างถูกต้อง
    if (command.name && typeof command.execute === 'function') {
      bot.commands.set(`/${command.name}`, command.description || 'ไม่มีคำอธิบาย');
      // ส่ง instance ของบอทไปยังฟังก์ชันคำสั่งหากต้องการ
      if (typeof command.register === 'function') {
        command.register(bot);
      }
      console.log(`✅ โหลดคำสั่ง: /${command.name}`);
    } else {
      console.warn(`⚠️ คำสั่งในไฟล์ ${file} ไม่ถูกต้อง กรุณาตรวจสอบโครงสร้าง`);
    }
  }
});

// ตั้งค่าคำสั่งใน Telegram (เพื่อให้ผู้ใช้เห็นคำสั่งทั้งหมดในแอป)
bot.setMyCommands(Array.from(bot.commands.entries()).map(([command, description]) => ({
  command: command.slice(1), // เอา '/' ออก
  description: description
}))).then(() => {
  console.log('✅ ตั้งค่าคำสั่งสำหรับบอทเรียบร้อย');
}).catch((err) => {
  console.error('⚠️ เกิดข้อผิดพลาดในการตั้งค่าคำสั่งของบอท:', err);
});

// 5) การตอบกลับเมื่อผู้ใช้ส่งข้อความที่เป็นคำสั่ง
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || "";

  // ตรวจสอบว่าข้อความเป็นคำสั่งหรือไม่
  if (text.startsWith('/')) {
    // แยกคำสั่งและ arguments
    const parts = text.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    if (bot.commands.has(command)) {
      const commandName = command.slice(1); // เอา '/' ออก
      const commandModule = require(path.join(commandsPath, `${commandName}.js`));
      try {
        await commandModule.execute(bot, msg, args);
      } catch (err) {
        console.error(`⚠️ เกิดข้อผิดพลาดในการรันคำสั่ง ${command}:`, err);
        bot.sendMessage(chatId, '⚠️ เกิดข้อผิดพลาดในการประมวลผลคำสั่งของคุณ');
      }
    } else {
      // หากไม่มีคำสั่งดังกล่าว ให้ตอบกลับข้อความนี้
      bot.sendMessage(chatId, "❗️ กรุณาพิมพ์คำสั่งให้ถูกต้อง หรือพิมพ์ /ดูคำสั่งทั้งหมด 📜 เพื่อดูรายการคำสั่งที่สามารถใช้ได้");
    }
  } else {
    // หากไม่ใช่คำสั่ง ให้ตอบกลับข้อความทั่วไป หรือปล่อยว่างไว้
    // ตัวอย่างนี้จะไม่ตอบกลับข้อความที่ไม่ใช่คำสั่ง
  }
});
