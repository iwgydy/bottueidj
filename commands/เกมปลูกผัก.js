const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'farmgame',
  description: 'เกมปลูกผักไฮเทค พร้อมปุ่มโต้ตอบ',
  execute(bot) {
    const filePath = path.join(__dirname, 'smo.json');

    // ฟังก์ชันโหลดหรือสร้างไฟล์ smo.json
    function loadOrCreateFile() {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
      }
      const data = fs.readFileSync(filePath);
      return JSON.parse(data);
    }

    // ฟังก์ชันบันทึกข้อมูลลงใน smo.json
    function saveToFile(data) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // ฟังก์ชันสุ่มเงินรางวัล 1-10 บาท
    function getRandomReward() {
      return Math.floor(Math.random() * 10) + 1;
    }

    // ฟังก์ชันส่งข้อความ “ไฮเทค” แก่ผู้ใช้
    function sendHighTechMessage(bot, chatId, text) {
      const hiTechPrefix = '\u{1F916} [AI-FarmBot]: ';
      bot.sendMessage(chatId, hiTechPrefix + text);
    }

    // ------------------------------------------------------------------------
    // โครงสร้างข้อมูลตัวอย่างใน smo.json
    // {
    //   "USER_ID": {
    //     "balance": 100,
    //     "seeds": 2,
    //     "isPlanted": false,
    //     "isWatered": false,
    //     "isHarvested": false
    //   }
    // }
    // ------------------------------------------------------------------------

    // เมื่อพิมพ์คำสั่ง /farmgame ให้แสดงอินไลน์คีย์บอร์ด
    bot.onText(/\/farmgame$/, (msg) => {
      const chatId = msg.chat.id;

      // สร้างอินไลน์คีย์บอร์ด (ชุดปุ่ม)
      const options = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'ซื้อเมล็ดพันธุ์ 🌱', callback_data: 'buyseeds' },
            ],
            [
              { text: 'ปลูกเมล็ด 🌾', callback_data: 'plant' },
            ],
            [
              { text: 'รดน้ำ 💧', callback_data: 'water' },
            ],
            [
              { text: 'เก็บเกี่ยว 🚀', callback_data: 'harvest' },
            ],
            [
              { text: 'ดูยอดเงิน 💰', callback_data: 'moneycheck' },
            ],
          ]
        }
      };

      bot.sendMessage(
        chatId,
        'ยินดีต้อนรับสู่ฟาร์ม AI ไฮเทค! \nโปรดเลือกกิจกรรมที่ต้องการทำ',
        options
      );
    });

    // ส่วน callback_query สำหรับจัดการทุกปุ่มในเกม
    bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const userId = query.from.id;
      const data = loadOrCreateFile();

      // ถ้ายังไม่มีข้อมูลของ userId นี้ให้กำหนดค่าเริ่มต้น
      if (!data[userId]) {
        data[userId] = {
          balance: 0,
          seeds: 0,
          isPlanted: false,
          isWatered: false,
          isHarvested: false,
        };
      }

      try {
        switch (query.data) {
          // ----------------------------
          // ซื้อเมล็ดพันธุ์
          // ----------------------------
          case 'buyseeds': {
            const seedPrice = 2; // ราคาเมล็ดพันธุ์ชุดละ 2 บาท
            if (data[userId].balance < seedPrice) {
              sendHighTechMessage(
                bot,
                chatId,
                `ยอดเงินไม่พอซื้อเมล็ดพันธุ์ (ต้องใช้ ${seedPrice} บาท)`
              );
              break;
            }
            // หักเงิน และเพิ่มจำนวน seeds
            data[userId].balance -= seedPrice;
            data[userId].seeds += 1;
            saveToFile(data);

            sendHighTechMessage(
              bot,
              chatId,
              `คุณซื้อเมล็ดพันธุ์ 1 ชุดเรียบร้อย \n` +
              `ยอดเงินคงเหลือ: ${data[userId].balance.toFixed(2)} บาท \n` +
              `เมล็ดทั้งหมด: ${data[userId].seeds}`
            );
            break;
          }

          // ----------------------------
          // ปลูกเมล็ด
          // ----------------------------
          case 'plant': {
            // ต้องมีเมล็ด และยังไม่ได้ปลูก
            if (data[userId].seeds <= 0) {
              sendHighTechMessage(
                bot,
                chatId,
                'คุณไม่มีเมล็ดพันธุ์! โปรดซื้อเมล็ดพันธุ์ก่อน'
              );
              break;
            }
            if (data[userId].isPlanted) {
              sendHighTechMessage(bot, chatId, 'คุณได้ปลูกเมล็ดไว้แล้ว!');
              break;
            }

            data[userId].seeds -= 1;
            data[userId].isPlanted = true;
            data[userId].isWatered = false;
            data[userId].isHarvested = false;
            saveToFile(data);

            sendHighTechMessage(
              bot,
              chatId,
              `\u{1F331} ปลูกเมล็ดเรียบร้อย! \n` +
              `เมล็ดที่เหลือ: ${data[userId].seeds} ชุด`
            );
            break;
          }

          // ----------------------------
          // รดน้ำ
          // ----------------------------
          case 'water': {
            if (!data[userId].isPlanted) {
              sendHighTechMessage(
                bot,
                chatId,
                'ยังไม่ได้ปลูก จะรดน้ำได้ยังไงล่ะ!'
              );
              break;
            }
            if (data[userId].isWatered) {
              sendHighTechMessage(bot, chatId, 'คุณรดน้ำไปแล้ว!');
              break;
            }

            data[userId].isWatered = true;
            saveToFile(data);

            sendHighTechMessage(
              bot,
              chatId,
              'ระบบ IoT ทำการรดน้ำอัจฉริยะเรียบร้อย!'
            );
            break;
          }

          // ----------------------------
          // เก็บเกี่ยว
          // ----------------------------
          case 'harvest': {
            if (!data[userId].isPlanted || !data[userId].isWatered) {
              sendHighTechMessage(
                bot,
                chatId,
                'คุณยังเก็บเกี่ยวไม่ได้! ต้องปลูก + รดน้ำก่อน'
              );
              break;
            }
            if (data[userId].isHarvested) {
              sendHighTechMessage(bot, chatId, 'คุณเก็บเกี่ยวไปแล้ว!');
              break;
            }
            // สุ่มรางวัล 1-10 บาท
            const reward = getRandomReward();
            data[userId].balance += reward;
            data[userId].isHarvested = true;
            saveToFile(data);

            sendHighTechMessage(
              bot,
              chatId,
              `\u{1F680} โดรน AI เก็บเกี่ยวเสร็จสิ้น! \n` +
              `คุณได้รับเงิน ${reward} บาท \n` +
              `ยอดเงินคงเหลือ: ${data[userId].balance.toFixed(2)} บาท`
            );
            break;
          }

          // ----------------------------
          // ตรวจสอบยอดเงิน
          // ----------------------------
          case 'moneycheck': {
            sendHighTechMessage(
              bot,
              chatId,
              `\u{1F4B0} ยอดเงินของคุณคือ ${data[userId].balance.toFixed(2)} บาท`
            );
            break;
          }

          // ----------------------------
          // กรณีไม่ตรงกับค่าใด ๆ
          // ----------------------------
          default: {
            sendHighTechMessage(
              bot,
              chatId,
              'คำสั่งไม่ถูกต้อง หรือยังไม่รองรับ'
            );
            break;
          }
        }
      } catch (error) {
        console.error('Error in callback_query:', error.message);
        bot.sendMessage(
          chatId,
          '❌ เกิดข้อผิดพลาดในเกมปลูกผัก'
        );
      }

      // อย่าลืมตอบ callback เพื่อให้ Telegram รู้ว่าเรารับ event แล้ว
      bot.answerCallbackQuery(query.id);
    });
  },
};
