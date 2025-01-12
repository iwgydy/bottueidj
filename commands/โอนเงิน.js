const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'transfer',
  description: 'โอนเงินให้เพื่อนจากบัญชีของคุณ',
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

    // ฟังก์ชันสำหรับการโอนเงิน
    bot.onText(/\/transfer @(\w+)\s(\d+(\.\d{1,2})?)/, async (msg, match) => {
      try {
        const senderId = msg.from.id; // ID ของผู้ส่งเงิน
        const receiverUsername = match[1]; // ชื่อผู้รับ
        const amount = parseFloat(match[2]); // จำนวนเงินที่โอน

        const data = loadOrCreateFile();

        // ตรวจสอบยอดเงินและความถูกต้องของจำนวนเงิน
        if (isNaN(amount) || amount <= 0) {
          return bot.sendMessage(msg.chat.id, "❌ กรุณาระบุจำนวนเงินที่ถูกต้อง (มากกว่า 0 บาท)");
        }

        if (!data[senderId] || data[senderId].balance < amount) {
          return bot.sendMessage(msg.chat.id, "❌ คุณมียอดเงินไม่พอที่จะโอน");
        }

        // ค้นหา ID ของผู้รับจาก username
        const receiverId = Object.keys(data).find(id => data[id].username === receiverUsername);
        if (!receiverId) {
          return bot.sendMessage(msg.chat.id, `❌ ไม่พบผู้ใช้ @${receiverUsername}`);
        }

        // ดำเนินการโอนเงิน
        data[senderId].balance -= amount;
        data[receiverId].balance += amount;

        saveToFile(data);

        // แจ้งเตือนผู้ส่งและผู้รับ
        bot.sendMessage(msg.chat.id, `✅ คุณได้โอนเงิน ${amount.toFixed(2)} บาท ให้กับ @${receiverUsername}`);
        bot.sendMessage(receiverId, `🎉 คุณได้รับเงิน ${amount.toFixed(2)} บาท จาก @${msg.from.username}`);
      } catch (error) {
        console.error("Error in /transfer command:", error.message);
        bot.sendMessage(msg.chat.id, "❌ เกิดข้อผิดพลาดในการโอนเงิน");
      }
    });
  },
};
