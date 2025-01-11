const fs = require('fs');
const path = require('path');

// สร้างโฟลเดอร์ data หากยังไม่มี
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// ไฟล์เก็บข้อมูลเงินของผู้ใช้
const dataFilePath = path.join(dataDir, 'sndjw.json');

// ฟังก์ชันโหลดข้อมูลจากไฟล์
function loadData() {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify({}));
  }
  const rawData = fs.readFileSync(dataFilePath);
  return JSON.parse(rawData);
}

// ฟังก์ชันบันทึกข้อมูลลงไฟล์
function saveData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

module.exports = {
  name: 'money', // ชื่อคำสั่งเป็นภาษาอังกฤษ
  description: 'ดูยอดเงินของคุณ (ภาษาไทย)', // คำอธิบายเป็นภาษาไทย
  execute(bot) {
    // จับคำสั่ง /money
    bot.onText(/\/money/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      // โหลดข้อมูลเงิน
      const data = loadData();

      // ตรวจสอบว่าผู้ใช้มีข้อมูลเงินหรือไม่
      if (!data[userId]) {
        data[userId] = { balance: 0 }; // เริ่มต้นเงินเป็น 0
        saveData(data);
      }

      // ส่งยอดเงินปัจจุบัน (ภาษาไทย)
      const balance = data[userId].balance;
      bot.sendMessage(chatId, `💰 ยอดเงินปัจจุบันของคุณ: ${formatMoney(balance)}`);
    });
  },
};

// ฟังก์ชันจัดรูปแบบเงิน (ภาษาไทย)
function formatMoney(amount) {
  const baht = Math.floor(amount);
  const satang = Math.round((amount - baht) * 100);
  return `${baht} บาท ${satang} สตางค์`;
}
