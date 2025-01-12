const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'freemoney',
  description: 'รับเงินฟรี 50 บาท ทุกๆ 2 ชั่วโมง',
  execute(bot) {
    const filePath = path.join(__dirname, 'smo.json');
    const cooldown = 2 * 60 * 60 * 1000; // 2 ชั่วโมง (ในมิลลิวินาที)

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

    // จับคำสั่ง /freemoney
    bot.onText(/\/freemoney/, (msg) => {
      try {
        const userId = msg.from.id;
        const chatId = msg.chat.id;

        // โหลดข้อมูลผู้ใช้
        const data = loadOrCreateFile();

        // สร้างข้อมูลผู้ใช้ใหม่ถ้าไม่มี
        if (!data[userId]) {
          data[userId] = { balance: 0, lastClaim: 0 };
        }

        const now = Date.now();
        const lastClaim = data[userId].lastClaim || 0; // ตรวจสอบให้ `lastClaim` มีค่าเริ่มต้นเป็น 0

        // ตรวจสอบว่าเกิน 2 ชั่วโมงแล้วหรือยัง
        if (now - lastClaim >= cooldown) {
          // เพิ่มเงิน 50 บาท
          data[userId].balance += 50;
          data[userId].lastClaim = now;
          saveToFile(data);

          // ส่งข้อความยืนยันการรับเงิน
          bot.sendMessage(
            chatId,
            `🎉 คุณได้รับเงินฟรี 50 บาท!\n💰 ยอดเงินคงเหลือ: ${data[userId].balance.toFixed(2)} บาท`
          );
        } else {
          const timeLeft = Math.ceil((cooldown - (now - lastClaim)) / (60 * 1000)); // คำนวณเวลาที่เหลือ (นาที)
          bot.sendMessage(
            chatId,
            `⏳ คุณสามารถรับเงินได้อีกครั้งใน ${timeLeft} นาที`
          );
        }
      } catch (error) {
        console.error("Error in /freemoney command:", error.message);
        bot.sendMessage(msg.chat.id, "❌ เกิดข้อผิดพลาดในการรับเงินฟรี");
      }
    });
  },
};
