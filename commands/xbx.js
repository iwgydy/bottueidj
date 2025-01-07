const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // ใช้สำหรับสร้าง UUID

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
  description: 'สร้างโค้ด V2Ray พร้อมการตรวจจับข้อความอัตโนมัติ',
  execute(bot) {
    let userSteps = {}; // เก็บสถานะขั้นตอนของผู้ใช้

    bot.onText(/\/สร้างโค้ด/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      const savedLogin = getUserLogin(userId);

      if (!savedLogin) {
        // เริ่มขอข้อมูล URL
        bot.sendMessage(chatId, "กรุณากรอก **URL API** (ตัวอย่าง: http://example.com):");
        userSteps[userId] = { step: 'waitingForURL' };
      } else {
        // เริ่มสร้างโค้ดทันที
        bot.sendMessage(chatId, "กรุณาใส่ ID (ตัวอย่าง: 5):");
        userSteps[userId] = { step: 'waitingForID', login: savedLogin };
      }
    });

    bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = msg.text.trim();

      if (!userSteps[userId]) return; // ไม่มีขั้นตอนให้ดำเนินการ

      const step = userSteps[userId].step;

      // ขั้นตอนต่างๆ
      switch (step) {
        case 'waitingForURL':
          userSteps[userId].login = { url: text }; // บันทึก URL
          bot.sendMessage(chatId, "กรุณากรอก **ชื่อผู้ใช้**:");
          userSteps[userId].step = 'waitingForUsername';
          break;

        case 'waitingForUsername':
          userSteps[userId].login.username = text; // บันทึกชื่อผู้ใช้
          bot.sendMessage(chatId, "กรุณากรอก **รหัสผ่าน**:");
          userSteps[userId].step = 'waitingForPassword';
          break;

        case 'waitingForPassword':
          userSteps[userId].login.password = text; // บันทึกรหัสผ่าน

          // บันทึกข้อมูลล็อกอิน
          saveUserLogin({
            userId,
            ...userSteps[userId].login,
          });

          bot.sendMessage(chatId, "กรุณาใส่ ID (ตัวอย่าง: 5):");
          userSteps[userId].step = 'waitingForID';
          break;

        case 'waitingForID':
          const id = parseInt(text, 10);
          if (isNaN(id) || id <= 0) {
            bot.sendMessage(chatId, "❌ กรุณาใส่ ID เป็นตัวเลขที่มากกว่า 0:");
            return;
          }
          userSteps[userId].id = id; // บันทึก ID
          bot.sendMessage(chatId, "กรุณาตั้งชื่อโค้ดของคุณ:");
          userSteps[userId].step = 'waitingForName';
          break;

        case 'waitingForName':
          userSteps[userId].name = text; // บันทึกชื่อโค้ด
          bot.sendMessage(chatId, "กรุณากำหนด GB (ตัวอย่าง: 50):");
          userSteps[userId].step = 'waitingForGB';
          break;

        case 'waitingForGB':
          const gb = parseInt(text, 10);
          if (isNaN(gb) || gb <= 0) {
            bot.sendMessage(chatId, "❌ กรุณากำหนด GB เป็นตัวเลขที่มากกว่า 0:");
            return;
          }
          userSteps[userId].gb = gb; // บันทึก GB
          bot.sendMessage(chatId, "กรุณากำหนดจำนวนวันหมดอายุ (ตัวอย่าง: 30):");
          userSteps[userId].step = 'waitingForDays';
          break;

        case 'waitingForDays':
          const days = parseInt(text, 10);
          if (isNaN(days) || days <= 0) {
            bot.sendMessage(chatId, "❌ กรุณากำหนดจำนวนวันหมดอายุเป็นตัวเลขที่มากกว่า 0:");
            return;
          }
          userSteps[userId].days = days;

          // สร้างโค้ด
          const { login, id, name, gb } = userSteps[userId];
          const uuid = uuidv4();
          const expiryTime = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;

          const settings = {
            method: 'POST',
            url: `${login.url}/panel/api/inbounds/addClient`,
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            data: {
              id,
              settings: JSON.stringify({
                clients: [
                  {
                    id: uuid,
                    flow: '',
                    email: name,
                    limitIp: 0,
                    totalGB: gb,
                    expiryTime: expiryTime,
                    enable: true,
                    tgId: userId,
                    subId: uuidv4(),
                    reset: 0,
                  },
                ],
              }),
            },
          };

          bot.sendMessage(chatId, "🔄 กำลังสร้างโค้ดของคุณ...");

          axios(settings)
            .then(() => {
              const link = `vless://${uuid}@facebookbotvip.vipv2boxth.xyz:433?type=ws&path=%2F&host=&security=tls&fp=chrome&alpn=&allowInsecure=1&sni=fbcdn.net#${encodeURIComponent(
                name
              )}`;
              bot.sendMessage(chatId, `✅ โค้ดของคุณถูกสร้างสำเร็จ!\n\n🔗 ลิงก์: ${link}`);
            })
            .catch((error) => {
              bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการสร้างโค้ด กรุณาลองใหม่อีกครั้ง");
              console.error(error.message);
            });

          // ลบข้อมูลสถานะ
          delete userSteps[userId];
          break;

        default:
          bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการดำเนินการ");
          delete userSteps[userId];
      }
    });
  },
};
