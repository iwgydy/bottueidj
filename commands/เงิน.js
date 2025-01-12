const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'moneycheck',
  description: 'ตรวจสอบยอดเงินของผู้ใช้',
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

    // จับคำสั่ง /moneycheck
    bot.onText(/\/moneycheck/, (msg) => {
      try {
        const userId = msg.from.id; // ใช้ ID ผู้ใช้แทน ID แชท
        const chatId = msg.chat.id;

        // โหลดข้อมูลจากไฟล์ smo.json
        const data = loadOrCreateFile();

        // ตรวจสอบว่าในไฟล์มีข้อมูลของผู้ใช้นี้หรือไม่
        if (!data[userId]) {
          data[userId] = { balance: 0 }; // ถ้าไม่มีให้ตั้งค่าเริ่มต้น
          saveToFile(data);
        }

        // ดึงยอดเงินของผู้ใช้
        const balance = data[userId].balance;

        // ส่งข้อความแจ้งยอดเงิน
        bot.sendMessage(
          chatId,
          `💰 ยอดเงินของคุณ: ${balance.toFixed(2)} บาท`
        );
      } catch (error) {
        console.error("Error in /moneycheck command:", error.message);
        bot.sendMessage(
          msg.chat.id,
          "❌ เกิดข้อผิดพลาดในการตรวจสอบยอดเงิน"
        );
      }
    });
  },
};
