const fs = require('fs');
const path = require('path');

// ไฟล์เก็บข้อมูลเงินของผู้ใช้
const dataFilePath = path.join(__dirname, 'sndjw.json');

// ฟังก์ชันโหลดข้อมูลจากไฟล์
function loadData() {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify({}));
  }
  const rawData = fs.readFileSync(dataFilePath);
  return JSON.parse(rawData);
}

module.exports = {
  name: 'money',
  description: 'ดูยอดเงินของผู้ใช้ (แบบไทย)',
  execute(bot) {
    // จับคำสั่ง /เงิน
    bot.onText(/\/เงิน/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      // โหลดข้อมูลเงิน
      const data = loadData();

      // ตรวจสอบว่าผู้ใช้มีข้อมูลเงินหรือไม่
      if (!data[userId]) {
        data[userId] = { balance: 0 }; // เริ่มต้นเงินเป็น 0
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
      }

      // ส่งยอดเงินปัจจุบัน
      const balance = data[userId].balance;
      bot.sendMessage(chatId, `💰 ยอดเงินของคุณ: ${formatMoney(balance)}`);
    });
  },
};

// ฟังก์ชันจัดรูปแบบเงิน (แบบไทย)
function formatMoney(amount) {
  const baht = Math.floor(amount);
  const satang = Math.round((amount - baht) * 100);
  return `${baht} บาท ${satang} สตางค์`;
}
