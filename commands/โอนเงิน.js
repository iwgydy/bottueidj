const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'transfer',
  description: 'โอนเงินให้เพื่อนโดยการตอบกลับข้อความ',
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
    bot.onText(/\/transfer (\d+(\.\d{1,2})?)/, async (msg, match) => {
      try {
        const senderId = msg.from.id; // ID ของผู้ส่งเงิน
        const amount = parseFloat(match[1]); // จำนวนเงินที่โอน
        const replyToMessage = msg.reply_to_message; // ข้อความที่ถูกตอบกลับ

        if (!replyToMessage) {
          return bot.sendMessage(
            msg.chat.id,
            "❌ กรุณาตอบกลับข้อความของผู้ใช้ที่ต้องการโอนเงินให้ พร้อมระบุจำนวนเงิน"
          );
        }

        const receiverId = replyToMessage.from.id; // ID ของผู้รับเงิน
        const receiverName = replyToMessage.from.username || replyToMessage.from.first_name;

        const data = loadOrCreateFile();

        // ตรวจสอบยอดเงินและความถูกต้องของจำนวนเงิน
        if (isNaN(amount) || amount <= 0) {
          return bot.sendMessage(msg.chat.id, "❌ กรุณาระบุจำนวนเงินที่ถูกต้อง (มากกว่า 0 บาท)");
        }

        if (!data[senderId] || data[senderId].balance < amount) {
          return bot.sendMessage(msg.chat.id, "❌ คุณมียอดเงินไม่พอที่จะโอน");
        }

        // สร้างบัญชีผู้รับเงินถ้ายังไม่มี
        if (!data[receiverId]) {
          data[receiverId] = { balance: 0, username: receiverName };
        }

        // ดำเนินการโอนเงิน
        data[senderId].balance -= amount;
        data[receiverId].balance += amount;

        saveToFile(data);

        // แจ้งเตือนผู้ส่งและผู้รับ
        bot.sendMessage(msg.chat.id, `✅ คุณได้โอนเงิน ${amount.toFixed(2)} บาท ให้กับ @${receiverName || "unknown"}`);
        bot.sendMessage(receiverId, `🎉 คุณได้รับเงิน ${amount.toFixed(2)} บาท จาก @${msg.from.username || msg.from.first_name}`);
      } catch (error) {
        console.error("Error in /transfer command:", error.message);
        bot.sendMessage(msg.chat.id, "❌ เกิดข้อผิดพลาดในการโอนเงิน");
      }
    });
  },
};
