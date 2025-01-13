/***********************************************
 * index.js
 * ไฟล์หลักของบอท - โค้ดเฉพาะที่ใช้สร้างและรันบอท
 ***********************************************/

const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

// 1) ใส่ Token ของบอท Telegram (โปรดเก็บ Token ไว้เป็นความลับ 🔒)
const token = '7929038707:AAHZk78OcCN0Kdjs6mjAIV9DM0Qh-7iEHhs'; // <<-- แทนที่ด้วย Token จริงของคุณ

// 2) สร้าง instance ของบอท (ตั้งค่า polling ให้บอทฟังข้อความ)
const bot = new TelegramBot(token, { polling: true });

// จัดการข้อผิดพลาดในการ polling
bot.on('polling_error', (err) => console.error('⚠️ เกิดข้อผิดพลาดในการ polling ของ Telegram:', err));

console.log("🤖 บอทกำลังทำงานอยู่...");

// 3) สร้าง Collection (Map) สำหรับเก็บชื่อคำสั่งและคำอธิบาย
bot.commands = new Map();

// 4) โหลดไฟล์คำสั่งจากโฟลเดอร์ commands
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).forEach((file) => {
  if (file.endsWith('.js')) {
    // นำเข้าโมดูลคำสั่ง
    const command = require(path.join(commandsPath, file));
    
    // ตรวจสอบว่าไฟล์คำสั่งมีโครงสร้างถูกต้อง
    if (command.name && typeof command.execute === 'function') {
      // เก็บคำสั่งและคำอธิบาย (เพื่อใช้ตรวจสอบในภายหลัง)
      bot.commands.set(`/${command.name}`, command.description || 'ไม่มีคำอธิบาย');
      
      // หากมีฟังก์ชัน register ให้เรียกก่อน (สำหรับตั้งค่า listener เฉพาะคำสั่งนั้น ๆ)
      if (typeof command.register === 'function') {
        command.register(bot);
      }
      console.log(`✅ โหลดคำสั่ง: /${command.name}`);
    } else {
      console.warn(`⚠️ คำสั่งในไฟล์ ${file} ไม่ถูกต้อง กรุณาตรวจสอบโครงสร้าง`);
    }
  }
});

// 5) การตอบกลับเมื่อผู้ใช้ส่งข้อความ
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || "";

  // ตรวจสอบว่าข้อความเป็นคำสั่งหรือไม่ (ขึ้นต้นด้วย '/')
  if (text.startsWith('/')) {
    // แยกคำสั่งออกมา (ตัด @username ทิ้งถ้ามี)
    const rawCommand = text.split(' ')[0];  // เช่น "/freemoney@MyBotUsername"
    const [cmdBase] = rawCommand.split('@'); // จะได้ "/freemoney"

    // เช็คว่าคำสั่ง (เช่น "/freemoney") อยู่ใน bot.commands หรือไม่
    if (!bot.commands.has(cmdBase)) {
      return bot.sendMessage(
        chatId,
        "❗️ กรุณาพิมพ์คำสั่งให้ถูกต้อง หรือพิมพ์ /ดูคำสั่งทั้งหมด 📜 เพื่อดูรายการคำสั่งที่สามารถใช้ได้"
      );
    }

    // ถ้ามีคำสั่ง cmdBase ใน bot.commands 
    // --- ตัวอย่างเรียกใช้ execute (ถ้าต้องการให้ execute ตรงนี้):
    try {
      // dynamic require ไฟล์คำสั่ง จากชื่อ cmdBase (เช่น "/freemoney" -> "freemoney.js")
      const commandName = cmdBase.replace('/', ''); // เช่น "freemoney"
      const commandModule = require(path.join(commandsPath, commandName));

      // เรียกฟังก์ชัน execute ของคำสั่ง พร้อมส่ง bot และ msg
      commandModule.execute(bot, msg);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการเรียก execute command:", error);
      bot.sendMessage(chatId, "ขออภัย เกิดข้อผิดพลาดภายในบอท");
    }

  } else {
    // ถ้าไม่ใช่คำสั่ง บอทนี้จะไม่ตอบกลับ (หรือจะเพิ่มฟังก์ชันตอบกลับเองก็ได้)
  }
});
