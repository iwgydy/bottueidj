const fs = require('fs');
const path = require('path');

// สร้างโฟลเดอร์ data หากยังไม่มี
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// ไฟล์เก็บข้อมูลเงินของผู้ใช้
const dataFilePath = path.join(dataDir, 'sndjw.json');

// ฟังก์ชันโหลดข้อมูลจากไฟล์
function loadData() {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify({}));
  }
  const rawData = fs.readFileSync(dataFilePath);
  return JSON.parse(rawData);
}

// ฟังก์ชันบันทึกข้อมูลลงไฟล์
function saveData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

// ID ของแอดมิน
const ADMIN_ID = 7520172820;

// เก็บสถานะการรอใส่จำนวนเงิน
const pendingGenerations = new Map();

module.exports = {
  name: 'money', // ชื่อคำสั่งเป็นภาษาอังกฤษ
  description: 'ดูยอดเงินของคุณ (ภาษาไทย)', // คำอธิบายเป็นภาษาไทย
  execute(bot) {
    // จับคำสั่ง /money
    bot.onText(/\/money/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      // ตรวจสอบว่าเป็นแอดมินหรือไม่
      if (userId === ADMIN_ID) {
        // แสดงปุ่มสำหรับแอดมิน (ดูเงินและเสกเงิน)
        bot.sendMessage(chatId, 'เลือกการดำเนินการ:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'ดูเงิน', callback_data: 'view_balance' }],
              [{ text: 'เสกเงิน', callback_data: 'generate_money' }],
            ],
          },
        });
      } else {
        // สำหรับผู้ใช้ทั่วไป แสดงยอดเงินปกติ
        showBalance(bot, chatId, userId);
      }
    });

    // จับการกดปุ่ม Callback Query
    bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id;
      const data = callbackQuery.data;

      // ตรวจสอบว่าเป็นแอดมินหรือไม่
      if (userId !== ADMIN_ID) {
        return bot.answerCallbackQuery(callbackQuery.id, { text: 'คุณไม่มีสิทธิ์ใช้งานฟังก์ชันนี้' });
      }

      // ตรวจสอบการดำเนินการ
      if (data === 'view_balance') {
        // แสดงยอดเงิน
        showBalance(bot, chatId, userId);
      } else if (data === 'generate_money') {
        // ถามจำนวนเงินที่ต้องการเสก
        bot.sendMessage(chatId, 'กรุณาใส่จำนวนเงินที่ต้องการเสก:');
        // เก็บสถานะการรอใส่จำนวนเงิน
        pendingGenerations.set(chatId, true);
      }

      // ตอบกลับ Callback Query
      bot.answerCallbackQuery(callbackQuery.id);
    });

    // จับข้อความที่ผู้ใช้ส่งมา (สำหรับการเสกเงิน)
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = msg.text;

      // ตรวจสอบว่าผู้ใช้เป็นแอดมินและกำลังรอใส่จำนวนเงินหรือไม่
      if (userId === ADMIN_ID && pendingGenerations.get(chatId)) {
        // ลบสถานะการรอใส่จำนวนเงิน
        pendingGenerations.delete(chatId);

        // ตรวจสอบว่าข้อความเป็นตัวเลขหรือไม่
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0) {
          return bot.sendMessage(chatId, '❌ กรุณาใส่จำนวนเงินที่ถูกต้อง (ต้องเป็นตัวเลขและมากกว่า 0)');
        }

        // เสกเงิน
        generateMoney(bot, chatId, userId, amount);
      }
    });
  },
};

// ฟังก์ชันแสดงยอดเงิน
function showBalance(bot, chatId, userId) {
  const data = loadData();
  if (!data[userId]) {
    data[userId] = { balance: 0 };
    saveData(data);
  }
  const balance = data[userId].balance;
  bot.sendMessage(chatId, `💰 ยอดเงินปัจจุบันของคุณ: ${formatMoney(balance)}`);
}

// ฟังก์ชันเสกเงิน (เฉพาะแอดมิน)
function generateMoney(bot, chatId, userId, amount) {
  const data = loadData();
  if (!data[userId]) {
    data[userId] = { balance: 0 };
  }

  // เสกเงินตามจำนวนที่ระบุ
  data[userId].balance += amount;
  saveData(data);

  bot.sendMessage(chatId, `✨ คุณได้เสกเงิน ${formatMoney(amount)} เรียบร้อย!\n💰 ยอดเงินปัจจุบัน: ${formatMoney(data[userId].balance)}`);
}

// ฟังก์ชันจัดรูปแบบเงิน (ภาษาไทย)
function formatMoney(amount) {
  const baht = Math.floor(amount);
  const satang = Math.round((amount - baht) * 100);
  return `${baht} บาท ${satang} สตางค์`;
}
