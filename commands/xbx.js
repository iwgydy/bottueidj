const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const loginsFilePath = path.join(__dirname, '../data/looks.json');

/**
 * ดึงข้อมูลล็อกอินผู้ใช้จากไฟล์ looks.json
 */
function getUserLogin(userId) {
  if (fs.existsSync(loginsFilePath)) {
    const logins = JSON.parse(fs.readFileSync(loginsFilePath, 'utf8'));
    return logins.find((login) => login.userId === userId);
  }
  return null;
}

/**
 * บันทึกข้อมูลล็อกอินลงไฟล์ looks.json
 */
function saveUserLogin(logData) {
  let logins = [];
  if (fs.existsSync(loginsFilePath)) {
    logins = JSON.parse(fs.readFileSync(loginsFilePath, 'utf8'));
  }

  // ลบข้อมูลล็อกอินเก่าของผู้ใช้ (ถ้ามี)
  logins = logins.filter((login) => login.userId !== logData.userId);

  // เพิ่มข้อมูลล็อกอินใหม่
  logins.push(logData);

  // เขียนกลับลงไฟล์
  fs.writeFileSync(loginsFilePath, JSON.stringify(logins, null, 2));
}

module.exports = {
  name: 'สร้างโค้ด',
  description: 'สร้างโค้ด V2Ray พร้อมหลีกเลี่ยงปัญหาตัวแปรซ้ำ',
  execute(bot) {
    /**
     * userSteps เก็บสถานะการสร้างโค้ดของผู้ใช้แต่ละคน
     * โครงสร้าง:
     * {
     *   [userId]: {
     *     step: 'waitingForXX',
     *     login: { url, username, password },
     *     inboundId: Number,
     *     name: String,
     *     gb: Number,
     *     days: Number,
     *     ...
     *   }
     * }
     */
    let userSteps = {};

    // เมื่อพิมพ์ /สร้างโค้ด
    bot.onText(/\/สร้างโค้ด/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      // ตรวจสอบว่าผู้ใช้เคยบันทึกข้อมูลล็อกอินไว้หรือไม่
      const savedLogin = getUserLogin(userId);

      if (!savedLogin) {
        // ถ้าไม่เคยบันทึก ให้ขอ URL ก่อน
        bot.sendMessage(chatId, "กรุณากรอก **URL API** (ตัวอย่าง: http://example.com):");
        userSteps[userId] = { step: 'waitingForURL' };
      } else {
        // ถ้าเคยบันทึกแล้ว ขอ ID เลย
        bot.sendMessage(chatId, "กรุณาใส่ ID (ตัวอย่าง: 5):");
        userSteps[userId] = { step: 'waitingForInboundId', login: savedLogin };
      }
    });

    // ทุกข้อความที่ผู้ใช้ส่งมา จะตรวจสอบตาม step
    bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = msg.text.trim();

      // ถ้าไม่มี step อะไรให้ทำ ก็ข้าม
      if (!userSteps[userId]) return;

      const step = userSteps[userId].step;

      switch (step) {
        // ---------------------------
        // 1) รับ URL API
        case 'waitingForURL':
          userSteps[userId].login = { url: text };
          bot.sendMessage(chatId, "กรุณากรอก **ชื่อผู้ใช้**:");
          userSteps[userId].step = 'waitingForUsername';
          break;

        // ---------------------------
        // 2) รับชื่อผู้ใช้
        case 'waitingForUsername':
          userSteps[userId].login.username = text;
          bot.sendMessage(chatId, "กรุณากรอก **รหัสผ่าน**:");
          userSteps[userId].step = 'waitingForPassword';
          break;

        // ---------------------------
        // 3) รับรหัสผ่าน
        case 'waitingForPassword':
          userSteps[userId].login.password = text;

          // บันทึกข้อมูลล็อกอินลงไฟล์
          saveUserLogin({
            userId,
            ...userSteps[userId].login,
          });

          // จากนั้นให้ถาม ID
          bot.sendMessage(chatId, "กรุณาใส่ ID (ตัวอย่าง: 5):");
          userSteps[userId].step = 'waitingForInboundId';
          break;

        // ---------------------------
        // 4) รับ ID (InboundId)
        case 'waitingForInboundId':
          const inboundId = parseInt(text, 10);
          if (isNaN(inboundId) || inboundId <= 0) {
            bot.sendMessage(chatId, "❌ กรุณาใส่ ID เป็นตัวเลขที่มากกว่า 0:");
            return;
          }
          userSteps[userId].inboundId = inboundId;
          bot.sendMessage(chatId, "กรุณาตั้งชื่อโค้ดของคุณ:");
          userSteps[userId].step = 'waitingForName';
          break;

        // ---------------------------
        // 5) รับชื่อโค้ด
        case 'waitingForName':
          userSteps[userId].name = text;
          bot.sendMessage(chatId, "กรุณากำหนด GB (ตัวอย่าง: 50):");
          userSteps[userId].step = 'waitingForGB';
          break;

        // ---------------------------
        // 6) รับ GB
        case 'waitingForGB':
          const gb = parseInt(text, 10);
          if (isNaN(gb) || gb <= 0) {
            bot.sendMessage(chatId, "❌ กรุณากำหนด GB เป็นตัวเลขที่มากกว่า 0:");
            return;
          }
          userSteps[userId].gb = gb;
          bot.sendMessage(chatId, "กรุณากำหนดจำนวนวันหมดอายุ (ตัวอย่าง: 30):");
          userSteps[userId].step = 'waitingForDays';
          break;

        // ---------------------------
        // 7) รับจำนวนวันหมดอายุ
        case 'waitingForDays':
          const days = parseInt(text, 10);
          if (isNaN(days) || days <= 0) {
            bot.sendMessage(chatId, "❌ กรุณากำหนดจำนวนวันหมดอายุเป็นตัวเลขที่มากกว่า 0:");
            return;
          }
          userSteps[userId].days = days;

          // สร้าง UUID และคำนวณเวลาหมดอายุ
          const { login, inboundId: finalInboundId, name, gb: finalGB } = userSteps[userId];
          const newUUID = uuidv4();
          const expiryTime = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;

          // ตั้งค่าการเรียก API
          const settings = {
            method: 'POST',
            url: `${login.url}/panel/api/inbounds/addClient`,
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            data: {
              id: finalInboundId,
              settings: JSON.stringify({
                clients: [
                  {
                    id: newUUID,
                    flow: '',
                    email: name,
                    limitIp: 0,
                    totalGB: finalGB,
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

          // เรียก API ด้วย axios
          axios(settings)
            .then(() => {
              // สร้างลิงก์ VLESS
              const link = `vless://${newUUID}@facebookbotvip.vipv2boxth.xyz:433?type=ws&path=%2F&host=&security=tls&fp=chrome&alpn=&allowInsecure=1&sni=fbcdn.net#${encodeURIComponent(
                name
              )}`;
              bot.sendMessage(chatId, `✅ โค้ดของคุณถูกสร้างสำเร็จ!\n\n🔗 ลิงก์: ${link}`);
            })
            .catch((error) => {
              bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการสร้างโค้ด กรุณาลองใหม่อีกครั้ง");
              console.error(error.message);
            });

          // ลบสถานะทั้งหมดของผู้ใช้
          delete userSteps[userId];
          break;

        // หากเกิดข้อผิดพลาด
        default:
          bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการดำเนินการ");
          delete userSteps[userId];
      }
    });
  },
};
