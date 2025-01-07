const fs = require('fs');
const path = require('path');
const axios = require('axios');

const loginsFilePath = path.join(__dirname, '../data/looks.json');

// อ่านข้อมูลล็อกอินจากไฟล์
function getUserLogin(userId) {
  if (fs.existsSync(loginsFilePath)) {
    const logins = JSON.parse(fs.readFileSync(loginsFilePath, 'utf8'));
    return logins.find(login => login.userId === userId);
  }
  return null;
}

// บันทึกข้อมูลล็อกอินลงไฟล์
function saveUserLogin(logData) {
  let logins = [];
  if (fs.existsSync(loginsFilePath)) {
    logins = JSON.parse(fs.readFileSync(loginsFilePath, 'utf8'));
  }

  // ลบข้อมูลล็อกอินเก่าของผู้ใช้
  logins = logins.filter(login => login.userId !== logData.userId);

  // เพิ่มข้อมูลล็อกอินใหม่
  logins.push(logData);

  // บันทึกกลับลงไฟล์
  fs.writeFileSync(loginsFilePath, JSON.stringify(logins, null, 2));
}

module.exports = {
  name: 'สร้างโค้ด',
  description: 'สร้างโค้ด V2Ray ด้วย API',
  execute(bot) {
    let waitingForUsername = {}; // เก็บสถานะรอชื่อผู้ใช้
    let waitingForPassword = {}; // เก็บสถานะรอรหัสผ่าน

    bot.onText(/\/สร้างโค้ด/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      // ขอชื่อผู้ใช้จากผู้ใช้
      bot.sendMessage(chatId, "กรุณาตอบกลับข้อความนี้ด้วย **ชื่อผู้ใช้** ของคุณ:");
      waitingForUsername[userId] = true;
    });

    // รับชื่อผู้ใช้
    bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = msg.text;

      if (waitingForUsername[userId]) {
        // บันทึกชื่อผู้ใช้และขอรหัสผ่าน
        bot.sendMessage(chatId, "กรุณาตอบกลับข้อความนี้ด้วย **รหัสผ่าน** ของคุณ:");
        waitingForUsername[userId] = false; // ปิดสถานะรอชื่อผู้ใช้
        waitingForPassword[userId] = text; // เก็บชื่อผู้ใช้ไว้
      } else if (waitingForPassword[userId]) {
        const username = waitingForPassword[userId];
        const password = text;

        // ส่งข้อความตรวจสอบ
        bot.sendMessage(chatId, "🔄 กำลังตรวจสอบข้อมูล...");

        // เรียก API
        axios.post('http://localhost:2053/login', { username, password })
          .then(response => {
            const data = response.data;

            if (data.success) {
              // บันทึกข้อมูลล็อกอินลงไฟล์
              saveUserLogin({
                userId: userId,
                username: username,
                password: password,
                timestamp: new Date().toISOString()
              });

              bot.sendMessage(chatId, `✅ ล็อกอินสำเร็จ! \n\n📜 ข้อความ: ${data.msg}`);
            } else {
              bot.sendMessage(chatId, `❌ ล็อกอินไม่สำเร็จ: ${data.msg}`);
            }
          })
          .catch(error => {
            bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
            console.error(error.message);
          });

        // ปิดสถานะรอรหัสผ่าน
        delete waitingForPassword[userId];
      }
    });
  },
};
