const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'slot',
  description: 'เกมสล็อตที่สมจริง ใช้ 1 บาทต่อการหมุน',
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

    // ฟังก์ชันสุ่มสล็อต
    function spinSlot() {
      const symbols = ['🍒', '🍋', '🍉', '⭐', '💎', '🍇'];
      return Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)])
      );
    }

    // ฟังก์ชันคำนวณรางวัล
    function calculateReward(grid) {
      const payout = {
        '🍒': 2,
        '🍋': 3,
        '🍉': 5,
        '⭐': 10,
        '💎': 50,
        '🍇': 20,
      };

      let reward = 0;

      // ตรวจสอบแนวกลาง
      if (grid[1][0] === grid[1][1] && grid[1][1] === grid[1][2]) {
        reward = payout[grid[1][0]] || 0;
      }

      // ตรวจสอบแนวเฉียง
      if (grid[0][0] === grid[1][1] && grid[1][1] === grid[2][2]) {
        reward += payout[grid[1][1]] || 0;
      }
      if (grid[0][2] === grid[1][1] && grid[1][1] === grid[2][0]) {
        reward += payout[grid[1][1]] || 0;
      }

      return reward;
    }

    // จับคำสั่ง /slot
    bot.onText(/\/slot/, async (msg) => {
      try {
        const userId = msg.from.id;
        const chatId = msg.chat.id;

        // โหลดข้อมูลผู้ใช้
        const data = loadOrCreateFile();

        // สร้างข้อมูลผู้ใช้ใหม่ถ้าไม่มี
        if (!data[userId]) {
          data[userId] = { balance: 10 }; // เริ่มต้นที่ 10 บาท
          saveToFile(data);
        }

        // ตรวจสอบยอดเงิน
        if (data[userId].balance < 1) {
          return bot.sendMessage(chatId, "❌ คุณมียอดเงินไม่พอที่จะเล่นสล็อต (ต้องการ 1 บาท)");
        }

        // หักเงิน 1 บาท
        data[userId].balance -= 1;
        saveToFile(data);

        // หมุนสล็อต
        const grid = spinSlot();
        const reward = calculateReward(grid);

        // อัปเดตยอดเงินถ้าชนะ
        if (reward > 0) {
          data[userId].balance += reward;
          saveToFile(data);
        }

        // สร้างผลลัพธ์แบบเว็บสล็อต
        const slotResult = `
🎰 **ผลการหมุนสล็อต** 🎰
\`\`\`
| ${grid[0][0]} | ${grid[0][1]} | ${grid[0][2]} |
| ${grid[1][0]} | ${grid[1][1]} | ${grid[1][2]} |  <<<<<
| ${grid[2][0]} | ${grid[2][1]} | ${grid[2][2]} |
\`\`\`

${reward > 0 ? `🎉 **คุณชนะรางวัล ${reward} บาท!**` : '😢 **คุณไม่ได้รางวัลในรอบนี้**'}

💰 **ยอดเงินคงเหลือ**: ${data[userId].balance.toFixed(2)} บาท
        `;

        // ส่งผลลัพธ์ให้ผู้ใช้
        await bot.sendMessage(chatId, slotResult, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error("Error in /slot command:", error.message);
        bot.sendMessage(msg.chat.id, "❌ เกิดข้อผิดพลาดในการเล่นสล็อต");
      }
    });
  },
};
