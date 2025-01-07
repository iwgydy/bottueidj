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
  description: 'สร้างโค้ด V2Ray ด้วย API และเพิ่ม /login อัตโนมัติ',
  execute(bot) {
    let waitingForURL = {};       // เก็บสถานะรอ URL
    let waitingForUsername = {}; // เก็บสถานะรอชื่อผู้ใช้
    let waitingForPassword = {}; // เก็บสถานะรอรหัสผ่าน
    let loginInfo = {};          // เก็บข้อมูลชั่วคราวระหว่างการตั้งค่า

    bot.onText(/\/สร้างโค้ด/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      // ขอ URL API
      bot.sendMessage(chatId, "กรุณาตอบกลับข้อความนี้ด้วย **URL API** (ตัวอย่าง: http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd):");
      waitingForURL[userId] = true;
    });

    // รับข้อความตอบกลับจากผู้ใช้
    bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = msg.text;

      // รับ URL API
      if (waitingForURL[userId]) {
        loginInfo[userId] = { url: text }; // เก็บ URL
        bot.sendMessage(chatId, "กรุณาตอบกลับข้อความนี้ด้วย **ชื่อผู้ใช้**:");
        waitingForURL[userId] = false; // ปิดสถานะรอ URL
        waitingForUsername[userId] = true; // เปิดสถานะรอชื่อผู้ใช้
      } 
      // รับชื่อผู้ใช้
      else if (waitingForUsername[userId]) {
        loginInfo[userId].username = text; // เก็บชื่อผู้ใช้
        bot.sendMessage(chatId, "กรุณาตอบกลับข้อความนี้ด้วย **รหัสผ่าน**:");
        waitingForUsername[userId] = false; // ปิดสถานะรอชื่อผู้ใช้
        waitingForPassword[userId] = true; // เปิดสถานะรอรหัสผ่าน
      } 
      // รับรหัสผ่าน
      else if (waitingForPassword[userId]) {
        loginInfo[userId].password = text; // เก็บรหัสผ่าน
        const { url, username, password } = loginInfo[userId];

        // เพิ่ม `/login` ให้ URL
        const loginURL = `${url}/login`;

        // ตรวจสอบข้อมูลผ่าน API
        bot.sendMessage(chatId, "🔄 กำลังตรวจสอบข้อมูล...");
        axios.post(loginURL, { username, password })
          .then(response => {
            const data = response.data;

            if (data.success) {
              // บันทึกข้อมูลล็อกอินลงไฟล์
              saveUserLogin({
                userId: userId,
                url: url,
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
        delete loginInfo[userId];
      }
    });
  },
};
