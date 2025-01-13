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
bot.on('polling_error', (err) => {
  console.error('⚠️ เกิดข้อผิดพลาดในการ polling ของ Telegram:', err);
});

console.log("🤖 บอทกำลังทำงานอยู่...");

// 3) สร้าง Collection สำหรับเก็บคำสั่ง
bot.commands = new Map();

// 4) โหลดไฟล์คำสั่งจากโฟลเดอร์ commands
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).forEach((file) => {
  if (file.endsWith('.js')) {
    // นำเข้าโมดูลคำสั่ง
    const commandModule = require(path.join(commandsPath, file));
    // ตรวจสอบว่าไฟล์คำสั่งมีโครงสร้างถูกต้อง
    if (commandModule.name && typeof commandModule.execute === 'function') {
      // บันทึกชื่อคำสั่งใน Map ไว้ตรวจสอบตอนที่ผู้ใช้พิมพ์คำสั่ง
      bot.commands.set(`/${commandModule.name}`, commandModule.description || 'ไม่มีคำอธิบาย');

      // ถ้าในโมดูลมีฟังก์ชัน register ให้เรียกใช้ (เช่นใช้ regex ฟังข้อความ)
      if (typeof commandModule.register === 'function') {
        commandModule.register(bot);
      } else {
        // ถ้าไม่มี register ก็เรียก execute ไปเลย
        commandModule.execute(bot);
      }
      console.log(`✅ โหลดคำสั่ง: /${commandModule.name}`);
    } else {
      console.warn(`⚠️ คำสั่งในไฟล์ ${file} ไม่ถูกต้อง กรุณาตรวจสอบโครงสร้าง`);
    }
  }
});

// 5) การตอบกลับเมื่อผู้ใช้ส่งข้อความที่ไม่ใช่คำสั่ง หรือพิมพ์คำสั่งที่ไม่มี
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  let text = msg.text || "";

  // ถ้าข้อความขึ้นต้นด้วยเครื่องหมาย '/'
  if (text.startsWith('/')) {
    // ตัดส่วนหลังช่องว่างเผื่อมีพารามิเตอร์ (เช่น "/freemoney 123")
    let command = text.split(' ')[0];

    // หากเป็น "/freemoney@ชื่อบอท" ให้ตัด '@...' ออก
    if (command.includes('@')) {
      command = command.split('@')[0]; 
    }

    // ตรวจสอบว่าคำสั่งนั้นมีการกำหนดไว้ใน bot.commands หรือไม่
    if (!bot.commands.has(command)) {
      // หากไม่มีคำสั่งดังกล่าว ให้ตอบกลับ
      bot.sendMessage(
        chatId, 
        "❗️ กรุณาพิมพ์คำสั่งให้ถูกต้อง หรือพิมพ์ /ดูคำสั่งทั้งหมด 📜 เพื่อดูรายการคำสั่งที่สามารถใช้ได้"
      );
      return;
    }

    // ถ้ามีคำสั่งแล้ว ก็ไม่ต้องทำอะไรเพิ่มที่นี่ (เพราะไป handle ในไฟล์ commands/*.js)
    // หรือจะตอบอย่างอื่นเพิ่มก็ได้ตามต้องการ
  } else {
    // หากไม่ใช่คำสั่ง สามารถทำอย่างอื่นได้ตามต้องการ
    // ตัวอย่างนี้จะไม่ตอบกลับข้อความที่ไม่ใช่คำสั่ง
  }
});
