const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'slot',
  description: 'เกมสล็อตที่สามารถวางเงินเดิมพันได้',
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

    // บันทึกข้อมูลลงใน smo.json
    function saveToFile(data) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // ฟังก์ชันสุ่มโอกาสชนะ (50/50)
    function isWin() {
      return Math.random() < 0.5; // 50% โอกาสชนะ
    }

    // ฟังก์ชันสุ่มสล็อต
    function spinSlot() {
      const symbols = ['🍒', '🍋', '🍉', '⭐', '💎', '🍇'];
      return Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)])
      );
    }

    // ฟังก์ชันคำนวณรางวัล
    function calculateReward(grid, bet) {
      const payout = {
        '🍒': 1.1,
        '🍋': 1.5,
        '🍉': 2.0,
        '⭐': 5.0,
        '💎': 10.0,
        '🍇': 3.0,
      };

      let reward = 0;

      if (grid[1][0] === grid[1][1] && grid[1][1] === grid[1][2]) {
        reward = payout[grid[1][0]] * bet;
      }

      return parseFloat(reward.toFixed(2));
    }

    // จับคำสั่ง /slot (เฉย ๆ)
    bot.onText(/\/slot$/, (msg) => {
      bot.sendMessage(
        msg.chat.id,
        "🎰 กรุณาระบุจำนวนเงินเดิมพันด้วย เช่น `/slot 5` (จำนวนเงินเดิมพันขั้นต่ำคือ 1 บาท)",
        { parse_mode: 'Markdown' }
      );
    });

    // จับคำสั่ง /slot <เงินเดิมพัน>
    bot.onText(/\/slot (\d+(\.\d{1,2})?)/, async (msg, match) => {
      try {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const bet = parseFloat(match[1]);

        if (isNaN(bet) || bet <= 0) {
          return bot.sendMessage(chatId, "❌ กรุณาระบุจำนวนเงินเดิมพันที่มากกว่า 0");
        }

        const data = loadOrCreateFile();

        if (!data[userId]) {
          data[userId] = { balance: 10 };
          saveToFile(data);
        }

        const userBalance = data[userId].balance;

        if (userBalance < bet) {
          return bot.sendMessage(chatId, "❌ คุณมียอดเงินไม่พอสำหรับเดิมพัน");
        }

        data[userId].balance -= bet;
        saveToFile(data);

        let message = await bot.sendMessage(chatId, "🎰 กำลังหมุนสล็อต...");

        const spinSteps = [
          "| 🍒 | 🍋 | 🍉 |",
          "| 🍋 | ⭐ | 🍉 |",
          "| ⭐ | 💎 | 🍒 |",
          "| 💎 | 🍇 | 🍉 |"
        ];

        for (let i = 0; i < spinSteps.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await bot.editMessageText(`🎰 กำลังหมุน...\n${spinSteps[i]}`, {
            chat_id: chatId,
            message_id: message.message_id,
          });
        }

        const grid = spinSlot();
        const win = isWin(); // ตัดสินว่าชนะหรือแพ้

        let reward = 0;
        if (win) {
          reward = calculateReward(grid, bet);
          data[userId].balance += reward;
          saveToFile(data);
        }

        const slotResult = `
🎰 **ผลการหมุนสล็อต** 🎰
\`\`\`
| ${grid[0][0]} | ${grid[0][1]} | ${grid[0][2]} |
| ${grid[1][0]} | ${grid[1][1]} | ${grid[1][2]} |  <<<<<
| ${grid[2][0]} | ${grid[2][1]} | ${grid[2][2]} |
\`\`\`

${win ? `🎉 **คุณชนะรางวัล ${reward.toFixed(2)} บาท!**` : '😢 **คุณไม่ได้รางวัลในรอบนี้**'}

💰 **ยอดเงินคงเหลือ**: ${data[userId].balance.toFixed(2)} บาท
        `;

        await bot.editMessageText(slotResult, {
          chat_id: chatId,
          message_id: message.message_id,
          parse_mode: 'Markdown',
        });
      } catch (error) {
        console.error("Error in /slot command:", error.message);
        bot.sendMessage(msg.chat.id, "❌ เกิดข้อผิดพลาดในการเล่นสล็อต");
      }
    });
  },
};
