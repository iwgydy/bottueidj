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
console.log("✅ Initialized bot.commands as a new Map.");

// ประกาศไฟล์เก็บข้อมูลผู้ใช้
const usersFile = path.join(__dirname, 'ajbs.json');

// ฟังก์ชันอ่านข้อมูลผู้ใช้
const loadUsers = () => {
  if (!fs.existsSync(usersFile)) {
    console.log("📄 ไฟล์ usersFile ไม่พบ สร้างไฟล์ใหม่.");
    return {};
  }
  try {
    const data = fs.readFileSync(usersFile, 'utf-8');
    console.log("✅ โหลดข้อมูลผู้ใช้เรียบร้อยแล้ว.");
    return JSON.parse(data);
  } catch (error) {
    console.error("⚠️ เกิดข้อผิดพลาดขณะอ่านไฟล์ usersFile:", error);
    return {};
  }
};

// ฟังก์ชันบันทึกข้อมูลผู้ใช้
const saveUsers = (users) => {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    console.log("✅ บันทึกข้อมูลผู้ใช้เรียบร้อยแล้ว.");
  } catch (error) {
    console.error("⚠️ เกิดข้อผิดพลาดขณะบันทึกไฟล์ usersFile:", error);
  }
};

// โหลดข้อมูลผู้ใช้
let users = loadUsers();

// 4) โหลดไฟล์คำสั่งจากโฟลเดอร์ commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  fs.readdirSync(commandsPath).forEach((file) => {
    if (file.endsWith('.js')) {
      const commandPath = path.join(commandsPath, file);
      try {
        const command = require(commandPath);
        if (command.name && typeof command.execute === 'function') {
          bot.commands.set(`/${command.name}`, command.description || 'ไม่มีคำอธิบาย');
          if (typeof command.register === 'function') {
            command.register(bot);
          } else {
            // หากไม่มีฟังก์ชัน register ให้รัน execute ทันที
            // ซึ่งอาจไม่จำเป็นในหลายกรณี
            // คุณสามารถปรับเปลี่ยนตามความต้องการ
          }
          console.log(`✅ โหลดคำสั่ง: /${command.name}`);
        } else {
          console.warn(`⚠️ คำสั่งในไฟล์ ${file} ไม่ถูกต้อง กรุณาตรวจสอบโครงสร้าง`);
        }
      } catch (error) {
        console.error(`⚠️ เกิดข้อผิดพลาดขณะโหลดคำสั่งจากไฟล์ ${file}:`, error);
      }
    }
  });
} else {
  console.warn(`⚠️ ไม่พบโฟลเดอร์ commands ที่ ${commandsPath}`);
}

// 5) ระบบการลงทะเบียนผู้ใช้ใหม่
// 5.1) ตรวจจับเมื่อผู้ใช้เข้ากลุ่ม
bot.on('new_chat_members', (msg) => {
  const chatId = msg.chat.id;
  const newMembers = msg.new_chat_members;

  newMembers.forEach(member => {
    const userId = member.id;
    if (!users[userId]) {
      bot.sendMessage(chatId, `ยินดีต้อนรับ, ${member.first_name}! กรุณาลงทะเบียนก่อนใช้งานบอท`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'ลงทะเบียน', callback_data: `register_${userId}` }],
          ],
        },
      });
    }
  });
});

// 5.2) จัดการ Callback สำหรับการลงทะเบียน
bot.on('callback_query', async (query) => {
  const callbackData = query.data;
  const userId = query.from.id;
  const chatId = query.message.chat.id;

  if (callbackData.startsWith('register_')) {
    if (users[userId] && users[userId].step === 'completed') {
      bot.answerCallbackQuery(query.id, { text: 'คุณได้ลงทะเบียนแล้ว!' });
      return;
    }

    users[userId] = { step: 'name' };
    saveUsers(users);
    bot.answerCallbackQuery(query.id, { text: 'เริ่มกระบวนการลงทะเบียน' });
    bot.sendMessage(chatId, 'กรุณาพิมพ์ชื่อของคุณ:');
  }
});

// 5.3) ตรวจสอบข้อความจากผู้ใช้สำหรับการลงทะเบียน
bot.on('message', (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text;

  // ข้ามการตรวจสอบหากเป็นคำสั่ง
  if (text.startsWith('/')) return;

  if (users[userId] && users[userId].step !== 'completed') {
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
  }
});

// 6) การตอบกลับเมื่อผู้ใช้ส่งคำสั่งที่ไม่รู้จัก
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || "";

  if (text.startsWith('/')) {
    const command = text.split(' ')[0];
    if (!bot.commands.has(command)) {
      bot.sendMessage(chatId, "❗️ กรุณาพิมพ์คำสั่งให้ถูกต้อง หรือพิมพ์ /help เพื่อดูคำสั่งทั้งหมด 📜");
    } else {
      // หากคำสั่งถูกต้อง ให้เรียกใช้คำสั่งนั้น
      const commandName = command.slice(1); // เอา / ออก
      const commandObj = require(path.join(commandsPath, `${commandName}.js`));
      commandObj.execute(bot, msg);
    }
  }
});
