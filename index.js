/***********************************************
 * index.js
 ***********************************************/

const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

// ใส่ Token ของบอท Telegram
const token = '7929038707:AAHZk78OcCN0Kdjs6mjAIV9DM0Qh-7iEHhs'; // แทนที่ด้วย Token จริงของคุณ

// สร้าง instance ของบอท
const bot = new TelegramBot(token, { polling: true });

// จัดการข้อผิดพลาดในการ polling
bot.on('polling_error', (err) => console.error('⚠️ เกิดข้อผิดพลาด:', err));

// ประกาศไฟล์เก็บข้อมูลผู้ใช้
const usersFile = path.join(__dirname, 'ajbs.json');

// ฟังก์ชันอ่านข้อมูลผู้ใช้
const loadUsers = () => {
  if (!fs.existsSync(usersFile)) return {};
  return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
};

// ฟังก์ชันบันทึกข้อมูลผู้ใช้
const saveUsers = (users) => {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};

// โหลดข้อมูลผู้ใช้
let users = loadUsers();

console.log("🤖 บอทกำลังทำงานอยู่...");

// 1) ตรวจจับเมื่อผู้ใช้เข้ากลุ่ม
bot.on('new_chat_members', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!users[userId]) {
    bot.sendMessage(chatId, `ยินดีต้อนรับ, กรุณาลงทะเบียนก่อนใช้งานบอท`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ลงทะเบียน', callback_data: 'register' }],
        ],
      },
    });
  }
});

// 2) จัดการ Callback สำหรับการลงทะเบียน
bot.on('callback_query', async (query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;

  if (query.data === 'register') {
    if (users[userId]) {
      bot.sendMessage(chatId, 'คุณได้ลงทะเบียนแล้ว!');
    } else {
      users[userId] = { step: 'name' };
      saveUsers(users);
      bot.sendMessage(chatId, 'กรุณาพิมพ์ชื่อของคุณ:');
    }
  }
});

// 3) ตรวจสอบข้อความจากผู้ใช้
bot.on('message', (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!users[userId]) {
    bot.sendMessage(chatId, 'กรุณาลงทะเบียนก่อนใช้งานบอท', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ลงทะเบียน', callback_data: 'register' }],
        ],
      },
    });
    return;
  }

  const user = users[userId];

  if (user.step === 'name') {
    users[userId].name = text;
    users[userId].step = 'age';
    saveUsers(users);
    bot.sendMessage(chatId, 'กรุณาพิมพ์อายุของคุณ:');
  } else if (user.step === 'age') {
    if (isNaN(text)) {
      bot.sendMessage(chatId, 'กรุณาพิมพ์ตัวเลขเท่านั้นสำหรับอายุ!');
      return;
    }
    users[userId].age = parseInt(text, 10);
    users[userId].step = 'facebook';
    saveUsers(users);
    bot.sendMessage(chatId, 'กรุณาวางลิ้งค์ Facebook ของคุณ:');
  } else if (user.step === 'facebook') {
    if (!text.startsWith('http')) {
      bot.sendMessage(chatId, 'กรุณาวางลิ้งค์ Facebook ที่ถูกต้อง!');
      return;
    }
    users[userId].facebook = text;
    users[userId].step = 'completed';
    saveUsers(users);
    bot.sendMessage(chatId, '✅ คุณลงทะเบียนเสร็จเรียบร้อยแล้ว! คุณสามารถใช้งานบอทได้แล้วตอนนี้ 🎉');
  }
});

// 4) โหลดไฟล์คำสั่งจากโฟลเดอร์ commands
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
      console.warn(`⚠️ คำสั่งในไฟล์ ${file} ไม่ถูกต้อง`);
    }
  }
});

// 5) การตอบกลับเมื่อผู้ใช้ส่งข้อความที่ไม่ใช่คำสั่ง
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || "";

  if (text.startsWith('/')) {
    const command = text.split(' ')[0];
    if (!bot.commands.has(command)) {
      bot.sendMessage(chatId, "❗️ กรุณาพิมพ์คำสั่งให้ถูกต้อง หรือพิมพ์ /help เพื่อดูคำสั่งทั้งหมด 📜");
    }
  }
});
