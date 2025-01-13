const fs = require('fs');
const path = require('path');

// เพิ่มฟังก์ชันสำหรับใช้งาน
module.exports = {
  name: 'bankCommandsWithButtons',
  description: 'เมนูธนาคารด้วยปุ่ม: ตรวจสอบยอด ฝาก ถอน',
  execute(bot) {
    const filePath = path.join(__dirname, 'smo.json');

    // ฟังก์ชันสำหรับโหลดหรือสร้างไฟล์ smo.json
    function loadOrCreateFile() {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
      }
      const data = fs.readFileSync(filePath);
      return JSON.parse(data);
    }

    // ฟังก์ชันสำหรับบันทึกข้อมูลลงใน smo.json
    function saveToFile(data) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // ฟังก์ชันสำหรับดึงยอดเงินของผู้ใช้ ถ้าไม่มีจะสร้างใหม่
    function getUserBalance(data, userId) {
      if (!data[userId]) {
        data[userId] = { balance: 0 };
      }
      return data[userId].balance;
    }

    // ฟังก์ชันสำหรับตั้งยอดเงินผู้ใช้
    function setUserBalance(data, userId, newBalance) {
      data[userId] = { balance: newBalance };
      saveToFile(data);
    }

    // --------------------------------------------------------------------------------
    // 1) /bank - แสดงเมนูปุ่มหลัก (Inline Keyboard)
    // --------------------------------------------------------------------------------
    bot.onText(/\/bank/, (msg) => {
      const chatId = msg.chat.id;

      // สร้างปุ่มเมนูหลัก
      const options = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏦 ตรวจสอบยอดเงิน', callback_data: 'check_balance' }],
            [{ text: '💰 ฝากเงิน',       callback_data: 'deposit_menu' }],
            [{ text: '💳 ถอนเงิน',       callback_data: 'withdraw_menu' }],
          ]
        }
      };

      bot.sendMessage(
        chatId,
        "🤖 [AI Banking System]\n" +
        "เลือกเมนูที่ต้องการได้เลยครับ:",
        options
      );
    });

    // --------------------------------------------------------------------------------
    // 2) callback_query - จับ event เมื่อมีการกดปุ่มใน Inline Keyboard
    // --------------------------------------------------------------------------------
    bot.on('callback_query', (query) => {
      const chatId = query.message.chat.id;
      const userId = query.from.id;
      const data = query.data; // ค่านี้คือ callback_data ที่เราเซ็ตไว้

      // โหลด/สร้างไฟล์ smo.json
      let fileData = loadOrCreateFile();
      // อ่านยอดเงินปัจจุบัน
      let currentBalance = getUserBalance(fileData, userId);

      // เช็คว่ากดปุ่มอะไร
      switch (data) {
        case 'check_balance':
          // ตรวจสอบยอดเงิน
          bot.answerCallbackQuery(query.id); // ตอบ Callback (เพื่อให้ Telegram หยุดโลดดิ้ง)
          bot.sendMessage(
            chatId,
            `🛰 [AI Banking System]\n\n` +
            `💳 ยอดเงินในบัญชีของคุณ: ${currentBalance.toFixed(2)} บาท\n` +
            `🔎 ตรวจสอบผ่านระบบความปลอดภัยขั้นสูงเรียบร้อย`
          );
          break;

        case 'deposit_menu':
          // แสดงปุ่มเมนูสำหรับฝากเงินเป็นจำนวนต่าง ๆ
          bot.answerCallbackQuery(query.id);
          bot.sendMessage(chatId, "ต้องการฝากเงินเท่าไหร่?", {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "ฝาก 50",  callback_data: "deposit_50" },
                  { text: "ฝาก 100", callback_data: "deposit_100" },
                  { text: "ฝาก 500", callback_data: "deposit_500" },
                ],
                [
                  { text: "ฝากจำนวนเอง", callback_data: "deposit_custom" },
                  { text: "กลับเมนูหลัก", callback_data: "back_to_main" }
                ]
              ]
            }
          });
          break;

        case 'withdraw_menu':
          // แสดงปุ่มเมนูสำหรับถอนเงินเป็นจำนวนต่าง ๆ
          bot.answerCallbackQuery(query.id);
          bot.sendMessage(chatId, "ต้องการถอนเงินเท่าไหร่?", {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "ถอน 50",  callback_data: "withdraw_50" },
                  { text: "ถอน 100", callback_data: "withdraw_100" },
                  { text: "ถอน 500", callback_data: "withdraw_500" },
                ],
                [
                  { text: "ถอนจำนวนเอง", callback_data: "withdraw_custom" },
                  { text: "กลับเมนูหลัก", callback_data: "back_to_main" }
                ]
              ]
            }
          });
          break;

        case 'back_to_main':
          // กลับไปแสดงเมนูหลัก
          bot.answerCallbackQuery(query.id);
          bot.sendMessage(chatId, "กลับสู่เมนูหลัก", {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🏦 ตรวจสอบยอดเงิน', callback_data: 'check_balance' },
                  { text: '💰 ฝากเงิน',         callback_data: 'deposit_menu' },
                  { text: '💳 ถอนเงิน',         callback_data: 'withdraw_menu' }
                ]
              ]
            }
          });
          break;
        
        // ----------------------------
        //  ตัวเลือกฝากเงินแบบปุ่ม
        // ----------------------------
        case 'deposit_50':
        case 'deposit_100':
        case 'deposit_500': {
          bot.answerCallbackQuery(query.id);
          // ตัดเอาจำนวนเงินจาก callback_data => deposit_50 => "50"
          const depositAmount = parseFloat(data.split('_')[1]);
          const newBalance = currentBalance + depositAmount;
          setUserBalance(fileData, userId, newBalance);

          bot.sendMessage(
            chatId,
            `🤖 [AI Banking System]\n\n` +
            `💸 ทำรายการฝากเงิน: +${depositAmount.toFixed(2)} บาท\n` +
            `💳 ยอดเงินคงเหลือใหม่: ${newBalance.toFixed(2)} บาท\n` +
            `✅ บันทึกข้อมูลผ่าน Blockchain เรียบร้อย`
          );
          break;
        }

        // ----------------------------
        //  ตัวเลือกถอนเงินแบบปุ่ม
        // ----------------------------
        case 'withdraw_50':
        case 'withdraw_100':
        case 'withdraw_500': {
          bot.answerCallbackQuery(query.id);
          const withdrawAmount = parseFloat(data.split('_')[1]);
          
          if (currentBalance < withdrawAmount) {
            bot.sendMessage(
              chatId,
              `🚫 [AI Denied]\n` +
              `ยอดเงินไม่เพียงพอสำหรับถอน\n` +
              `🔎 ยอดคงเหลือของคุณ: ${currentBalance.toFixed(2)} บาท`
            );
          } else {
            const newBalance = currentBalance - withdrawAmount;
            setUserBalance(fileData, userId, newBalance);
            
            bot.sendMessage(
              chatId,
              `🤖 [AI Banking System]\n\n` +
              `💸 ทำรายการถอนเงิน: -${withdrawAmount.toFixed(2)} บาท\n` +
              `💳 ยอดเงินคงเหลือใหม่: ${newBalance.toFixed(2)} บาท\n` +
              `✅ ระบบประมวลผลด้วย Quantum Computing อย่างสมบูรณ์แบบ`
            );
          }
          break;
        }

        // กรณีฝาก/ถอนจำนวนอื่น ๆ (ฝากจำนวนเอง / ถอนจำนวนเอง)
        case 'deposit_custom':
          bot.answerCallbackQuery(query.id);
          bot.sendMessage(
            chatId,
            "โปรดพิมพ์จำนวนเงินที่ต้องการฝาก\nเช่น: 123.45",
            {
              reply_markup: {
                force_reply: true
              }
            }
          ).then((sentMessage) => {
            // รอตอบกลับเป็นข้อความ (deposit amount)
            bot.onReplyToMessage(chatId, sentMessage.message_id, (userMsg) => {
              const customAmount = parseFloat(userMsg.text);
              if (isNaN(customAmount) || customAmount <= 0) {
                bot.sendMessage(chatId, "กรุณาระบุจำนวนเงินที่ถูกต้อง.");
                return;
              }

              const newBalance = currentBalance + customAmount;
              setUserBalance(fileData, userId, newBalance);

              bot.sendMessage(
                chatId,
                `🤖 [AI Banking System]\n\n` +
                `💸 ทำรายการฝากเงิน: +${customAmount.toFixed(2)} บาท\n` +
                `💳 ยอดเงินคงเหลือใหม่: ${newBalance.toFixed(2)} บาท`
              );
            });
          });
          break;

        case 'withdraw_custom':
          bot.answerCallbackQuery(query.id);
          bot.sendMessage(
            chatId,
            "โปรดพิมพ์จำนวนเงินที่ต้องการถอน\nเช่น: 123.45",
            {
              reply_markup: {
                force_reply: true
              }
            }
          ).then((sentMessage) => {
            // รอตอบกลับเป็นข้อความ (withdraw amount)
            bot.onReplyToMessage(chatId, sentMessage.message_id, (userMsg) => {
              const customAmount = parseFloat(userMsg.text);
              if (isNaN(customAmount) || customAmount <= 0) {
                bot.sendMessage(chatId, "กรุณาระบุจำนวนเงินที่ถูกต้อง.");
                return;
              }

              if (currentBalance < customAmount) {
                bot.sendMessage(
                  chatId,
                  `🚫 [AI Denied]\n` +
                  `ยอดเงินไม่เพียงพอสำหรับถอน\n` +
                  `🔎 ยอดคงเหลือของคุณ: ${currentBalance.toFixed(2)} บาท`
                );
                return;
              }

              const newBalance = currentBalance - customAmount;
              setUserBalance(fileData, userId, newBalance);

              bot.sendMessage(
                chatId,
                `🤖 [AI Banking System]\n\n` +
                `💸 ทำรายการถอนเงิน: -${customAmount.toFixed(2)} บาท\n` +
                `💳 ยอดเงินคงเหลือใหม่: ${newBalance.toFixed(2)} บาท`
              );
            });
          });
          break;

        default:
          // กรณี callback_data อื่น ๆ
          bot.answerCallbackQuery(query.id, { text: "ไม่พบตัวเลือกที่ต้องการ" });
          break;
      }
    });
  },
};
