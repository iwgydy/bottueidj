const fs = require('fs');
const path = require('path');

// Map สำหรับเก็บสถานะผู้ใช้ขณะโต้ตอบ
const states = {};

module.exports = {
  name: 'bank',
  description: 'ระบบธนาคารแบบปุ่ม พร้อมฟังก์ชันโอนเงินระหว่างผู้ใช้ (ข้อมูลใน smo.json)',
  execute(bot) {
    const filePath = path.join(__dirname, 'smo.json');

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

    // ฟังก์ชันสำหรับแสดงยอดเงิน
    function showInfo(userData) {
      return (
        `💼 กระเป๋า (wallet): ${userData.wallet.toFixed(2)} บาท\n` +
        `🏦 ธนาคาร (bank): ${userData.bank.toFixed(2)} บาท`
      );
    }

    // เมื่อพิมพ์ /bank
    bot.onText(/\/bank/, (msg) => {
      const chatId = msg.chat.id;

      // สร้างปุ่ม Inline Keyboard
      const options = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'ดูยอดเงิน (Info)', callback_data: 'bank_info' },
              { text: 'ฝากเงิน (Deposit)', callback_data: 'bank_deposit' },
            ],
            [
              { text: 'ถอนเงิน (Withdraw)', callback_data: 'bank_withdraw' },
              { text: 'โอนเงิน (Transfer)', callback_data: 'bank_transfer' },
            ],
          ],
        },
      };

      bot.sendMessage(chatId, "คุณต้องการทำรายการอะไร?", options);
    });

    // ฟังก์ชันจัดการ Callback Query (เมื่อกดปุ่ม)
    bot.on('callback_query', async (callbackQuery) => {
      const action = callbackQuery.data; // bank_info, bank_deposit, bank_withdraw, bank_transfer
      const userId = callbackQuery.from.id;
      const chatId = callbackQuery.message.chat.id;

      // โหลดข้อมูล
      const data = loadOrCreateFile();

      // ถ้าไม่มีข้อมูลผู้ใช้ สร้างใหม่
      if (!data[userId]) {
        data[userId] = { wallet: 10, bank: 0 };
        saveToFile(data);
      }
      const userData = data[userId];

      switch (action) {
        case 'bank_info':
          // แสดงยอดเงิน
          bot.sendMessage(chatId, `ℹ️ ข้อมูลบัญชีของคุณ:\n${showInfo(userData)}`);
          // เคลียร์สถานะ
          if (states[userId]) delete states[userId];
          break;

        case 'bank_deposit':
          // เตรียมฝากเงิน: ขอจำนวนเงิน
          states[userId] = { action: 'deposit', chatId };
          bot.sendMessage(chatId, "💰 กรุณาพิมพ์จำนวนเงินที่ต้องการฝาก (หักจากกระเป๋าเข้าธนาคาร):");
          break;

        case 'bank_withdraw':
          // เตรียมถอนเงิน: ขอจำนวนเงิน
          states[userId] = { action: 'withdraw', chatId };
          bot.sendMessage(chatId, "💰 กรุณาพิมพ์จำนวนเงินที่ต้องการถอน (หักจากธนาคารเข้ากระเป๋า):");
          break;

        case 'bank_transfer':
          // เตรียมโอนเงิน: ขอ User ID ปลายทางก่อน
          states[userId] = { action: 'transfer', chatId, step: 'askTarget' };
          bot.sendMessage(chatId, "🔄 กรุณาพิมพ์ *User ID* ของผู้รับโอน:", {
            parse_mode: 'Markdown',
          });
          break;

        default:
          break;
      }

      // แจ้ง Telegram ว่าเราจัดการ Callback แล้ว
      bot.answerCallbackQuery(callbackQuery.id);
    });

    // เมื่อผู้ใช้ส่งข้อความตอบกลับ (กรณีฝาก/ถอน/โอน)
    bot.on('message', (msg) => {
      const userId = msg.from.id;
      const chatId = msg.chat.id;
      const text = msg.text.trim();

      // ถ้าไม่มีสถานะ หรือเป็นคำสั่ง /bank เอง ให้ข้าม
      if (!states[userId]) return;
      if (states[userId].chatId !== chatId) return;

      const state = states[userId];

      // โหลดข้อมูลจากไฟล์
      const data = loadOrCreateFile();

      // สร้างข้อมูลผู้ใช้ถ้ายังไม่มี
      if (!data[userId]) {
        data[userId] = { wallet: 10, bank: 0 };
        saveToFile(data);
      }
      const userData = data[userId];

      // ---- Deposit ----
      if (state.action === 'deposit') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0) {
          bot.sendMessage(chatId, "❌ กรุณาระบุจำนวนเงินที่ถูกต้อง (ตัวอย่าง: 100 หรือ 50.50)");
          return;
        }
        if (userData.wallet < amount) {
          bot.sendMessage(chatId, "❌ ยอดเงินในกระเป๋าไม่พอสำหรับฝาก");
          delete states[userId];
          return;
        }

        // หักจาก wallet เพิ่มใน bank
        userData.wallet -= amount;
        userData.bank += amount;
        saveToFile(data);

        bot.sendMessage(chatId, `✅ ฝากเงินสำเร็จ ( ${amount.toFixed(2)} บาท )\n\n${showInfo(userData)}`);
        delete states[userId];
        return;
      }

      // ---- Withdraw ----
      if (state.action === 'withdraw') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0) {
          bot.sendMessage(chatId, "❌ กรุณาระบุจำนวนเงินที่ถูกต้อง");
          return;
        }
        if (userData.bank < amount) {
          bot.sendMessage(chatId, "❌ ยอดเงินในธนาคารไม่พอสำหรับถอน");
          delete states[userId];
          return;
        }

        // หักจาก bank เพิ่มใน wallet
        userData.bank -= amount;
        userData.wallet += amount;
        saveToFile(data);

        bot.sendMessage(chatId, `✅ ถอนเงินสำเร็จ ( ${amount.toFixed(2)} บาท )\n\n${showInfo(userData)}`);
        delete states[userId];
        return;
      }

      // ---- Transfer ----
      if (state.action === 'transfer') {
        // step: 'askTarget' => ถาม User ID, 'askAmount' => ถามจำนวนเงิน
        if (state.step === 'askTarget') {
          // เก็บ User ID ปลายทาง
          const targetId = text; // สมมติว่าผู้ใช้พิมพ์หมายเลข ID แบบข้อความ

          // ตรวจสอบว่าเป็นเลขไหม (ผู้ใช้คนอื่น)
          if (isNaN(parseInt(targetId))) {
            bot.sendMessage(chatId, "❌ กรุณาพิมพ์เป็นตัวเลข User ID เท่านั้น");
            return;
          }

          // ตรวจสอบว่ามีในระบบไหม (ถ้ายังไม่เคยใช้งานระบบ อาจไม่มีในไฟล์)
          if (!data[targetId]) {
            bot.sendMessage(chatId, `❌ ไม่พบ User ID: ${targetId} ในระบบ`);
            delete states[userId];
            return;
          }

          // เก็บ targetId ใน state
          state.targetId = targetId;
          state.step = 'askAmount';
          bot.sendMessage(chatId, `🔄 กรุณาพิมพ์จำนวนเงินที่ต้องการโอนไปให้ User ID: ${targetId}`);
          return;
        }

        if (state.step === 'askAmount') {
          const amount = parseFloat(text);
          if (isNaN(amount) || amount <= 0) {
            bot.sendMessage(chatId, "❌ กรุณาระบุจำนวนเงินที่ถูกต้อง");
            return;
          }
          const targetId = state.targetId;
          // ตรวจสอบยอดเงินใน bank
          if (userData.bank < amount) {
            bot.sendMessage(chatId, "❌ ยอดเงินในธนาคารไม่พอสำหรับโอน");
            delete states[userId];
            return;
          }

          // หักจาก bank ผู้โอน
          userData.bank -= amount;
          // เพิ่มใน bank ของผู้รับ
          data[targetId].bank += amount;

          saveToFile(data);

          // แจ้งผลผู้โอน
          bot.sendMessage(
            chatId,
            `✅ โอนเงินสำเร็จ ( ${amount.toFixed(2)} บาท ) ให้กับ User ID: ${targetId}\n\n${showInfo(userData)}`
          );

          // แจ้งผู้รับ (ถ้าต้องการ)
          if (parseInt(targetId) !== parseInt(userId)) {
            bot.sendMessage(
              targetId,
              `💸 คุณได้รับเงินโอนจาก User ID: ${userId} จำนวน ${amount.toFixed(2)} บาท\n` +
              `ยอดเงินในธนาคารของคุณตอนนี้: ${data[targetId].bank.toFixed(2)} บาท`
            );
          }

          // เคลียร์ state
          delete states[userId];
        }
      }
    });
  },
};
