const fs = require('fs');
const path = require('path');

// ปรับแต่งได้ตามชอบ
const MAX_STEPS = 5;          // จำนวนสเต็ปสูงสุดที่ยานจะบิน
const BASE_CRASH_CHANCE = 0.25; // โอกาสระเบิดพื้นฐาน 25% (สามารถเปลี่ยนได้)
const STEP_REWARD_MULTIPLIER = 1.5; 
// เช่น บินสูง 1 สเต็ป คูณ 1.5 เท่า, 2 สเต็ป คูณ 1.5*1.5 = 2.25, ... ไปเรื่อยๆ

module.exports = {
  name: 'rocket',
  description: 'เกมเดิมพันแนวอวกาศ! วางเงินเดิมพันแล้วลุ้นว่ายานจะบินได้นานแค่ไหน!',
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

    // สุ่มตรวจว่าในสเต็ปนั้นยานระเบิดหรือไม่
    function willCrash() {
      return Math.random() < BASE_CRASH_CHANCE; 
      // ตัวอย่าง ถ้า BASE_CRASH_CHANCE = 0.25 => 25% ที่จะระเบิด
      // สามารถปรับให้เพิ่มขึ้นเรื่อย ๆ ตามสเต็ปได้ เช่น * (step / MAX_STEPS)
    }

    // ฟังก์ชันคำนวณเงินรางวัลตามจำนวนสเต็ป
    function calculateReward(bet, stepsFlown) {
      // หากบินได้ N สเต็ป จะคูณ 1.5^N
      const multiplier = Math.pow(STEP_REWARD_MULTIPLIER, stepsFlown);
      return parseFloat((bet * multiplier).toFixed(2));
    }

    // จับคำสั่ง /rocket <เงินเดิมพัน>
    bot.onText(/\/rocket (\d+(\.\d{1,2})?)/, async (msg, match) => {
      try {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const bet = parseFloat(match[1]);

        if (isNaN(bet) || bet <= 0) {
          return bot.sendMessage(chatId, "❌ กรุณาระบุจำนวนเงินเดิมพันที่มากกว่า 0");
        }

        const data = loadOrCreateFile();
        if (!data[userId]) {
          data[userId] = { balance: 10 }; // เริ่มต้นยอดเงิน 10 บาท
          saveToFile(data);
        }

        // ตรวจสอบยอดเงินพอไหม
        if (data[userId].balance < bet) {
          return bot.sendMessage(chatId, "❌ คุณมียอดเงินไม่พอสำหรับเดิมพัน");
        }

        // หักเงินเดิมพัน
        data[userId].balance -= bet;
        saveToFile(data);

        // สร้างข้อความเริ่มต้น
        let rocketMsg = await bot.sendMessage(chatId, "🚀 กำลังเตรียมปล่อยยานอวกาศ...");

        // จะมีหลายสเต็ป (สูงสุด MAX_STEPS)
        let stepsFlown = 0; // นับจำนวนสเต็ปที่บินได้สำเร็จ
        for (let step = 1; step <= MAX_STEPS; step++) {
          // หน่วงเวลาเล็กน้อยเพื่อเอฟเฟกต์
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // ตรวจสอบว่ายานระเบิดในสเต็ปนี้ไหม
          if (willCrash()) {
            // ระเบิด!
            await bot.editMessageText(
              `🚀 ยานอวกาศบินไปได้ **${stepsFlown}** สเต็ป แล้วระเบิดในสเต็ปที่ ${step} 💥\n`+
              `😢 คุณเสียเงินเดิมพันทั้งหมด!\n\n`+
              `💰 ยอดเงินคงเหลือ: ${data[userId].balance.toFixed(2)} บาท`,
              {
                chat_id: chatId,
                message_id: rocketMsg.message_id,
                parse_mode: 'Markdown'
              }
            );
            return; // จบเกม
          } else {
            // ไม่ระเบิด บินสำเร็จ
            stepsFlown++;
            await bot.editMessageText(
              `🚀 **Step ${step}/${MAX_STEPS}**\n`+
              `🛸 ยานยังไม่ระเบิด! บินผ่านสเต็ปที่ ${step} ได้เรียบร้อย...\n\n`+
              `**Progress**: ${"⭐".repeat(step)}${"✦".repeat(MAX_STEPS - step)}\n\n`+
              `*(รอหน่อย... อาจระเบิดได้ทุกเมื่อ!)*`,
              {
                chat_id: chatId,
                message_id: rocketMsg.message_id,
                parse_mode: 'Markdown'
              }
            );
          }
        }

        // ถ้าหลุดจาก loop ได้ แสดงว่ายานบินถึง MAX_STEPS โดยไม่ระเบิด
        // ถือว่าผู้เล่นชนะรางวัลใหญ่!
        const reward = calculateReward(bet, stepsFlown);
        data[userId].balance += reward;
        saveToFile(data);

        await new Promise((resolve) => setTimeout(resolve, 1500));
        await bot.editMessageText(
          `🚀 ยานบินครบรอบ **${stepsFlown}** สเต็ป โดยไม่ระเบิด!\n`+
          `🎉 คุณได้รับเงินรางวัล **${reward.toFixed(2)}** บาท\n\n`+
          `💰 ยอดเงินคงเหลือ: ${data[userId].balance.toFixed(2)} บาท`,
          {
            chat_id: chatId,
            message_id: rocketMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
      } catch (error) {
        console.error("Error in /rocket command:", error.message);
        bot.sendMessage(msg.chat.id, "❌ เกิดข้อผิดพลาดในการปล่อยยานอวกาศ");
      }
    });
  },
};
