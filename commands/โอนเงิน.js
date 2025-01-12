const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'transfer',
  description: 'โอนเงินให้เพื่อนโดยการตอบกลับข้อความใดก็ได้',
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

    // สถานะการรอโอนเงิน
    const pendingTransfers = new Map();

    // ดักจับการตอบกลับข้อความ
    bot.on('message', async (msg) => {
      try {
        const senderId = msg.from.id; // ID ของผู้ส่งเงิน
        const replyToMessage = msg.reply_to_message; // ข้อความที่ถูกตอบกลับ

        // หากผู้ใช้ตอบกลับข้อความ
        if (replyToMessage && !pendingTransfers.has(senderId)) {
          const receiverId = replyToMessage.from.id; // ID ของผู้รับเงิน
          const receiverName = replyToMessage.from.username || replyToMessage.from.first_name;

          // บันทึกสถานะการรอโอนเงิน
          pendingTransfers.set(senderId, { receiverId, receiverName });

          // ขอให้ผู้ใช้พิมพ์จำนวนเงิน
          return bot.sendMessage(
            msg.chat.id,
            `กรุณาระบุจำนวนเงินที่ต้องการโอนให้ @${receiverName || 'unknown'}`,
            { reply_to_message_id: msg.message_id }
          );
        }

        // หากผู้ส่งอยู่ในสถานะรอโอนเงิน
        if (pendingTransfers.has(senderId)) {
          const transferData = pendingTransfers.get(senderId);
          const amount = parseFloat(msg.text); // จำนวนเงินที่โอน (ข้อความที่พิมพ์)

          if (isNaN(amount) || amount <= 0) {
            return bot.sendMessage(
              msg.chat.id,
              "❌ กรุณาระบุจำนวนเงินที่ถูกต้อง (มากกว่า 0 บาท)"
            );
          }

          const data = loadOrCreateFile();

          // ตรวจสอบยอดเงินของผู้ส่ง
          if (!data[senderId] || data[senderId].balance < amount) {
            pendingTransfers.delete(senderId); // ล้างสถานะการรอโอนเงิน
            return bot.sendMessage(msg.chat.id, "❌ คุณมียอดเงินไม่พอที่จะโอน");
          }

          // สร้างบัญชีผู้รับเงินถ้ายังไม่มี
          if (!data[transferData.receiverId]) {
            data[transferData.receiverId] = {
              balance: 0,
              username: transferData.receiverName,
            };
          }

          // ดำเนินการโอนเงิน
          data[senderId].balance -= amount;
          data[transferData.receiverId].balance += amount;

          saveToFile(data);

          // ล้างสถานะการรอโอนเงิน
          pendingTransfers.delete(senderId);

          // แจ้งเตือนผู้ส่งและผู้รับ
          bot.sendMessage(
            msg.chat.id,
            `✅ คุณได้โอนเงิน ${amount.toFixed(2)} บาท ให้กับ @${transferData.receiverName || 'unknown'}`
          );
          bot.sendMessage(
            transferData.receiverId,
            `🎉 คุณได้รับเงิน ${amount.toFixed(2)} บาท จาก @${msg.from.username || msg.from.first_name}`
          );
        }
      } catch (error) {
        console.error("Error in transfer process:", error.message);
        bot.sendMessage(msg.chat.id, "❌ เกิดข้อผิดพลาดในการโอนเงิน");
      }
    });
  },
};
