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

// 3) โหลดข้อมูลผู้ใช้งานที่ลงทะเบียน
const userDataFile = path.join(__dirname, 'ajbs.json');
let userData = fs.existsSync(userDataFile) ? JSON.parse(fs.readFileSync(userDataFile)) : {};

// 4) ฟังก์ชันบันทึกข้อมูลผู้ใช้
function saveUserData() {
  fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));
}

// 5) ตรวจสอบและลงทะเบียนผู้ใช้ใหม่
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!userData[userId]) {
    userData[userId] = { step: 'register' }; // กำหนดสถานะการลงทะเบียนเริ่มต้น
    saveUserData();

    bot.sendMessage(chatId, '👋 ยินดีต้อนรับ! กรุณากดปุ่มด้านล่างเพื่อลงทะเบียนก่อนใช้งานบอท', {
      reply_markup: {
        inline_keyboard: [[{ text: 'ลงทะเบียน', callback_data: 'register' }]]
      }
    });
    return;
  }

  const user = userData[userId];
  if (user.step === 'register') {
    bot.sendMessage(chatId, '⛔️ คุณยังไม่ได้ลงทะเบียน กรุณากดปุ่มลงทะเบียนเพื่อเริ่มต้นใช้งาน!');
    return;
  }

  // ตรวจสอบว่าข้อความเป็นคำสั่งหรือไม่
  const text = msg.text || '';
  if (text.startsWith('/')) {
    const command = text.split(' ')[0];
    if (!bot.commands.has(command)) {
      bot.sendMessage(chatId, "❗️ กรุณาพิมพ์คำสั่งให้ถูกต้อง หรือพิมพ์ /ดูคำสั่งทั้งหมด 📜 เพื่อดูรายการคำสั่งที่สามารถใช้ได้");
    }
  }
});

// 6) การจัดการ callback สำหรับการลงทะเบียน
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;

  if (callbackQuery.data === 'register') {
    userData[userId] = { step: 'name' };
    saveUserData();

    bot.sendMessage(chatId, 'กรุณาพิมพ์ชื่อของคุณ:');
  }
});

// 7) ตรวจสอบขั้นตอนการลงทะเบียน
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const user = userData[userId];

  if (user && user.step) {
    switch (user.step) {
      case 'name':
        user.name = msg.text;
        user.step = 'age';
        saveUserData();
        bot.sendMessage(chatId, 'กรุณาพิมพ์อายุของคุณ:');
        break;

      case 'age':
        user.age = msg.text;
        user.step = 'facebook';
        saveUserData();
        bot.sendMessage(chatId, 'กรุณาวางลิ้งค์ Facebook ของคุณ:');
        break;

      case 'facebook':
        user.facebook = msg.text;
        user.step = 'registered';
        saveUserData();
        bot.sendMessage(chatId, '✅ คุณลงทะเบียนเรียบร้อยแล้ว! คุณสามารถใช้งานบอทได้ทันที');
        break;

      default:
        bot.sendMessage(chatId, '⛔️ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง!');
    }
    return;
  }
});

// 8) โหลดไฟล์คำสั่งจากโฟลเดอร์ commands
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).forEach((file) => {
  if (file.endsWith('.js')) {
    const command = require(path.join(commandsPath, file));
    if (command.name && typeof command.execute === 'function') {
      bot.commands.set(`/${command.name}`, command.description || 'ไม่มีคำอธิบาย');
      if (typeof command.register === 'function') {
        command.register(bot);
      } else {
        command.execute(bot);
      }
      console.log(`✅ โหลดคำสั่ง: /${command.name}`);
    } else {
      console.warn(`⚠️ คำสั่งในไฟล์ ${file} ไม่ถูกต้อง กรุณาตรวจสอบโครงสร้าง`);
    }
  }
});
