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

// 3) สร้าง Collection สำหรับเก็บคำสั่งและผู้ใช้
bot.commands = new Map();
const users = new Map(); // สำหรับเก็บสถานะการลงทะเบียน

// 4) โหลดไฟล์คำสั่งจากโฟลเดอร์ commands
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).forEach((file) => {
  if (file.endsWith('.js')) {
    // นำเข้าโมดูลคำสั่ง
    const command = require(path.join(commandsPath, file));
    // ตรวจสอบว่าไฟล์คำสั่งมีโครงสร้างถูกต้อง
    if (command.name && typeof command.execute === 'function') {
      bot.commands.set(`/${command.name}`, command);
      console.log(`✅ โหลดคำสั่ง: /${command.name}`);
    } else {
      console.warn(`⚠️ คำสั่งในไฟล์ ${file} ไม่ถูกต้อง กรุณาตรวจสอบโครงสร้าง`);
    }
  }
});

// 5) โหลดข้อมูลผู้ใช้จากไฟล์ ajbs.json
const dataFilePath = path.join(__dirname, 'ajbs.json');
let userData = {};
if (fs.existsSync(dataFilePath)) {
  const data = fs.readFileSync(dataFilePath);
  userData = JSON.parse(data);
} else {
  fs.writeFileSync(dataFilePath, JSON.stringify(userData, null, 2));
}

// ฟังก์ชันในการบันทึกข้อมูลผู้ใช้
const saveUserData = () => {
  fs.writeFileSync(dataFilePath, JSON.stringify(userData, null, 2));
};

// 6) ฟังก์ชันการตรวจสอบการลงทะเบียน
const isRegistered = (userId) => {
  return userData[userId];
};

// 7) ฟังก์ชันการเริ่มต้นการลงทะเบียน
const startRegistration = (chatId) => {
  const welcomeMessage = "👋 ยินดีต้อนรับ! กรุณากดปุ่มด้านล่างเพื่อเริ่มการลงทะเบียน";
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "ลงทะเบียน", callback_data: "register" }]
      ]
    }
  };
  bot.sendMessage(chatId, welcomeMessage, options);
};

// 8) การจัดการ callback_query สำหรับปุ่มลงทะเบียน
bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const userId = callbackQuery.from.id;

  if (callbackQuery.data === 'register') {
    users.set(userId, { step: 'askName' });
    await bot.sendMessage(userId, "กรุณาพิมพ์ชื่อของคุณ:");
  }

  bot.answerCallbackQuery(callbackQuery.id);
});

// 9) การจัดการข้อความสำหรับการลงทะเบียน
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text ? msg.text.trim() : "";

  // ถ้าผู้ใช้ยังไม่ลงทะเบียน
  if (!isRegistered(userId)) {
    // ถ้ามีสถานะการลงทะเบียน
    if (users.has(userId)) {
      const userState = users.get(userId);

      switch (userState.step) {
        case 'askName':
          userData[userId] = { name: text };
          saveUserData();
          users.set(userId, { step: 'askAge' });
          await bot.sendMessage(userId, "กรุณาพิมพ์อายุของคุณ:");
          break;

        case 'askAge':
          const age = parseInt(text);
          if (isNaN(age) || age <= 0) {
            await bot.sendMessage(userId, "❌ กรุณาพิมพ์อายุที่ถูกต้อง (เป็นตัวเลข):");
          } else {
            userData[userId].age = age;
            saveUserData();
            users.set(userId, { step: 'askFacebook' });
            await bot.sendMessage(userId, "กรุณาวางลิ้งค์เฟสบุ๊คของคุณ:");
          }
          break;

        case 'askFacebook':
          // คุณอาจต้องการตรวจสอบว่าเป็นลิ้งค์เฟสบุ๊คจริง
          userData[userId].facebook = text;
          saveUserData();
          users.delete(userId);
          await bot.sendMessage(userId, "✅ คุณลงทะเบียนเรียบร้อยแล้ว! คุณสามารถใช้งานบอทได้แล้ว 🎉");
          break;

        default:
          users.delete(userId);
          await bot.sendMessage(userId, "เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง.");
      }
    } else {
      // ถ้าไม่มีการลงทะเบียนและข้อความไม่ใช่คำสั่ง
      if (text.startsWith('/')) {
        const command = text.split(' ')[0];
        if (bot.commands.has(command)) {
          if (command === '/register') {
            startRegistration(chatId);
          } else {
            await bot.sendMessage(chatId, "❗️ กรุณาลงทะเบียนก่อนใช้งานบอท");
          }
        } else {
          await bot.sendMessage(chatId, "❗️ กรุณาพิมพ์คำสั่งให้ถูกต้อง หรือพิมพ์ /register เพื่อเริ่มการลงทะเบียน");
        }
      } else {
        // ไม่ใช่คำสั่งและยังไม่ลงทะเบียน
        await startRegistration(chatId);
      }
    }
  } else {
    // ผู้ใช้ได้ลงทะเบียนแล้ว ให้ดำเนินการกับคำสั่งต่าง ๆ
    if (text.startsWith('/')) {
      const command = text.split(' ')[0];
      if (bot.commands.has(command)) {
        const cmd = bot.commands.get(command);
        cmd.execute(bot, msg, userData[userId]);
      } else {
        await bot.sendMessage(chatId, "❗️ กรุณาพิมพ์คำสั่งให้ถูกต้อง หรือพิมพ์ /ดูคำสั่งทั้งหมด 📜 เพื่อดูรายการคำสั่งที่สามารถใช้ได้");
      }
    } else {
      // หากไม่ใช่คำสั่ง ให้ตอบกลับหรือปล่อยว่างไว้
      // ตัวอย่างนี้จะไม่ตอบกลับข้อความที่ไม่ใช่คำสั่ง
    }
  }
});

// 10) การจัดการเมื่อมีผู้ใช้ใหม่เข้ามาในกลุ่ม
bot.on('new_chat_members', (msg) => {
  msg.new_chat_members.forEach((newMember) => {
    const userId = newMember.id;
    const chatId = msg.chat.id;

    if (!isRegistered(userId)) {
      startRegistration(chatId);
    }
  });
});
