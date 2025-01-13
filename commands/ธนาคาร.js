const fs = require('fs');
const path = require('path');

// ฟังก์ชันสร้างเลขบัญชีจำลอง (6 หลัก) ตามใจชอบ
function generateAccountNumber() {
  return Math.floor(100000 + Math.random() * 900000).toString(); 
  // เช่นได้ '123456' - 6 หลัก
}

module.exports = {
  name: 'bank',
  description: 'ระบบธนาคาร: ฝาก ถอน ดูยอดเงิน โอนให้ผู้อื่นผ่านเลขบัญชี',
  execute(bot) {
    const filePath = path.join(__dirname, 'smo.json');
    
    // เก็บสถานะของแต่ละผู้ใช้
    // โครงสร้าง เช่น states[userId] = { action: '...', step: 0, etc. }
    const states = {};

    // โหลดหรือสร้างไฟล์ smo.json
    function loadOrCreateFile() {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
      }
      const data = fs.readFileSync(filePath);
      return JSON.parse(data);
    }

    // บันทึกข้อมูลลงใน smo.json
    function saveToFile(data) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // ฟังก์ชันแสดงยอดเงิน
    function showInfo(userData) {
      return `เลขบัญชี: ${userData.account}\n` +
             `💼 กระเป๋า: ${userData.wallet.toFixed(2)} บาท\n` +
             `🏦 ธนาคาร: ${userData.bank.toFixed(2)} บาท`;
    }

    // เมื่อพิมพ์ /bank (จะแสดง Inline Keyboard)
    bot.onText(/\/bank/, (msg) => {
      const chatId = msg.chat.id;

      // สร้างปุ่ม Inline Keyboard
      const options = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'ดูยอดเงิน (Info)', callback_data: 'bank_info' },
            ],
            [
              { text: 'ฝากเงิน (Deposit)', callback_data: 'bank_deposit' },
              { text: 'ถอนเงิน (Withdraw)', callback_data: 'bank_withdraw' },
            ],
            [
              { text: 'โอน (Transfer)', callback_data: 'bank_transfer' },
            ]
          ],
        },
      };

      bot.sendMessage(chatId, "คุณต้องการทำรายการอะไร?", options);
    });

    // จัดการ Callback จากปุ่ม
    bot.on('callback_query', async (callbackQuery) => {
      const action = callbackQuery.data; // bank_info, bank_deposit, bank_withdraw, bank_transfer
      const userId = callbackQuery.from.id;
      const message = callbackQuery.message;
      const chatId = message.chat.id;

      // โหลดข้อมูลจากไฟล์
      const data = loadOrCreateFile();

      // ถ้าไม่มีข้อมูลผู้ใช้ สร้างใหม่
      if (!data[userId]) {
        data[userId] = {
          account: generateAccountNumber(),
          wallet: 10,
          bank: 0
        };
        saveToFile(data);
      }
      const userData = data[userId];

      // ตอบ Callback
      bot.answerCallbackQuery(callbackQuery.id);

      // เคลียร์สถานะเก่า
      if (states[userId]) delete states[userId];

      if (action === 'bank_info') {
        // แสดงยอดเงิน
        bot.sendMessage(chatId, `ℹ️ ข้อมูลบัญชีของคุณ:\n${showInfo(userData)}`);

      } else if (action === 'bank_deposit') {
        // ตั้งสถานะ "deposit"
        states[userId] = { action: 'deposit', chatId };
        bot.sendMessage(chatId, "💰 กรุณาพิมพ์จำนวนเงินที่ต้องการฝาก:");

      } else if (action === 'bank_withdraw') {
        // ตั้งสถานะ "withdraw"
        states[userId] = { action: 'withdraw', chatId };
        bot.sendMessage(chatId, "💰 กรุณาพิมพ์จำนวนเงินที่ต้องการถอน:");

      } else if (action === 'bank_transfer') {
        // ตั้งสถานะ "transfer" (ขั้นแรก: ขอเลขบัญชีผู้รับ)
        states[userId] = { action: 'transfer', step: 1, chatId };
        bot.sendMessage(chatId, "📋 กรุณาพิมพ์เลขบัญชีผู้รับ (6 หลัก):");
      }
    });

    // เมื่อผู้ใช้ส่งข้อความ (หลังจากกดปุ่มฝาก/ถอน/โอน)
    bot.on('message', (msg) => {
      const userId = msg.from.id;
      const chatId = msg.chat.id;
      const text = msg.text.trim();

      // ถ้าไม่มีสถานะ หรือคนละห้องแชท ให้ข้าม
      if (!states[userId]) return;
      if (states[userId].chatId !== chatId) return;

      // โหลดข้อมูล
      const data = loadOrCreateFile();

      // สร้างข้อมูลผู้ใช้กรณีไม่มี
      if (!data[userId]) {
        data[userId] = {
          account: generateAccountNumber(),
          wallet: 10,
          bank: 0
        };
        saveToFile(data);
      }
      const userData = data[userId];

      // แยกว่ากำลังทำ action อะไรอยู่
      const userAction = states[userId].action;

      // ---------------------------------
      // ฝาก (deposit)
      if (userAction === 'deposit') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0) {
          bot.sendMessage(chatId, "❌ กรุณาระบุจำนวนเงินฝากที่ถูกต้อง");
          delete states[userId];
          return;
        }
        if (userData.wallet < amount) {
          bot.sendMessage(chatId, "❌ ยอดเงินในกระเป๋าไม่พอสำหรับฝาก");
          delete states[userId];
          return;
        }

        userData.wallet -= amount;
        userData.bank += amount;
        saveToFile(data);

        bot.sendMessage(chatId, `✅ ฝากเงินสำเร็จ! (+${amount.toFixed(2)} บาท)\n\n${showInfo(userData)}`);
        delete states[userId];

      // ---------------------------------
      // ถอน (withdraw)
      } else if (userAction === 'withdraw') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0) {
          bot.sendMessage(chatId, "❌ กรุณาระบุจำนวนเงินถอนที่ถูกต้อง");
          delete states[userId];
          return;
        }
        if (userData.bank < amount) {
          bot.sendMessage(chatId, "❌ ยอดเงินในธนาคารไม่พอสำหรับถอน");
          delete states[userId];
          return;
        }

        userData.bank -= amount;
        userData.wallet += amount;
        saveToFile(data);

        bot.sendMessage(chatId, `✅ ถอนเงินสำเร็จ! (+${amount.toFixed(2)} บาทเข้ากระเป๋า)\n\n${showInfo(userData)}`);
        delete states[userId];

      // ---------------------------------
      // โอน (transfer)
      } else if (userAction === 'transfer') {
        // เช็คว่าอยู่ขั้นไหน
        if (states[userId].step === 1) {
          // ขั้นแรก: รับเลขบัญชีผู้รับ
          const accountReceiver = text; // สมมติเป็นตัวเลข 6 หลัก
          // ตรวจสอบความถูกต้องแบบง่าย ๆ
          if (!/^\d{6}$/.test(accountReceiver)) {
            bot.sendMessage(chatId, "❌ กรุณาระบุเลขบัญชี 6 หลัก (ตัวเลขเท่านั้น)");
            delete states[userId];
            return;
          }
          // เก็บเลขบัญชีใน states
          states[userId].receiverAccount = accountReceiver;
          states[userId].step = 2;
          // ขอจำนวนเงิน
          bot.sendMessage(chatId, "💰 กรุณาระบุจำนวนเงินที่ต้องการโอน:");
          return;

        } else if (states[userId].step === 2) {
          // ขั้นสอง: รับจำนวนเงิน
          const amount = parseFloat(text);
          if (isNaN(amount) || amount <= 0) {
            bot.sendMessage(chatId, "❌ กรุณาระบุจำนวนเงินที่ถูกต้อง");
            delete states[userId];
            return;
          }
          if (userData.bank < amount) {
            bot.sendMessage(chatId, "❌ ยอดเงินในธนาคารไม่พอสำหรับโอน");
            delete states[userId];
            return;
          }

          const receiverAccount = states[userId].receiverAccount;
          // หา user ปลายทางจาก account
          let receiverUserId = null;
          for (const uid in data) {
            if (data[uid].account === receiverAccount) {
              receiverUserId = uid;
              break;
            }
          }

          if (!receiverUserId) {
            // ไม่เจอเลขบัญชีนี้
            bot.sendMessage(chatId, "❌ ไม่พบเลขบัญชีปลายทางในระบบ");
            delete states[userId];
            return;
          }

          // เตรียมโอน
          data[userId].bank -= amount;
          data[receiverUserId].bank += amount;
          saveToFile(data);

          bot.sendMessage(chatId,
            `✅ โอนเงินสำเร็จ! (-${amount.toFixed(2)} บาท)\n` +
            `ปลายทางบัญชี: ${receiverAccount}\n\n` +
            `${showInfo(userData)}` // แสดงยอดเงินผู้โอน
          );

          // ถ้าอยากแจ้งปลายทางด้วย (ถ้ามี info chatId เก็บไว้) ก็แจ้งได้
          // แต่ในโค้ดนี้ยังไม่ได้เก็บ chatId ของผู้รับ

          delete states[userId];
        }
      }
    });
  },
};
