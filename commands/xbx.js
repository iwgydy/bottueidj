const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const loginsFilePath = path.join(__dirname, '../data/looks.json');

/**
 * ดึงข้อมูลล็อกอินของผู้ใช้
 */
function getUserLogin(userId) {
  if (fs.existsSync(loginsFilePath)) {
    const logins = JSON.parse(fs.readFileSync(loginsFilePath, 'utf8'));
    return logins.find((login) => login.userId === userId);
  }
  return null;
}

/**
 * บันทึกข้อมูลล็อกอิน
 */
function saveUserLogin(logData) {
  let logins = [];
  if (fs.existsSync(loginsFilePath)) {
    logins = JSON.parse(fs.readFileSync(loginsFilePath, 'utf8'));
  }

  // ลบข้อมูลเก่าถ้าซ้ำ
  logins = logins.filter((login) => login.userId !== logData.userId);

  logins.push(logData);
  fs.writeFileSync(loginsFilePath, JSON.stringify(logins, null, 2));
}

module.exports = {
  name: 'สร้างโค้ด',
  description: 'สร้างโค้ด V2Ray พร้อมล็อกอินอัตโนมัติ',
  execute(bot) {
    let userSteps = {};

    bot.onText(/\/สร้างโค้ด/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      const savedLogin = getUserLogin(userId);

      if (!savedLogin) {
        // ไม่เคยมีข้อมูล ให้ขอ URL, username, password ก่อน
        bot.sendMessage(chatId, "กรุณากรอก **URL API** (ตัวอย่าง: http://xxxxx.xyz:2053/xxxxxx):");
        userSteps[userId] = { step: 'waitingForURL' };
      } else {
        // มีข้อมูลอยู่แล้ว ขอ Inbound ID ต่อเลย
        bot.sendMessage(chatId, "กรุณาใส่ Inbound ID (ตัวอย่าง: 5):");
        userSteps[userId] = {
          step: 'waitingForInboundId',
          login: savedLogin, // ใช้ข้อมูลล็อกอินที่เคยบันทึก
        };
      }
    });

    bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = msg.text.trim();

      if (!userSteps[userId]) return;

      const step = userSteps[userId].step;

      switch (step) {
        case 'waitingForURL':
          userSteps[userId].login = { url: text };
          bot.sendMessage(chatId, "กรุณากรอก **username**:");
          userSteps[userId].step = 'waitingForUsername';
          break;

        case 'waitingForUsername':
          userSteps[userId].login.username = text;
          bot.sendMessage(chatId, "กรุณากรอก **password**:");
          userSteps[userId].step = 'waitingForPassword';
          break;

        case 'waitingForPassword':
          userSteps[userId].login.password = text;

          // บันทึกข้อมูลล็อกอินลงไฟล์
          saveUserLogin({
            userId,
            ...userSteps[userId].login,
          });

          // ขอ inbound ID ต่อเลย
          bot.sendMessage(chatId, "กรุณาใส่ Inbound ID (ตัวอย่าง: 5):");
          userSteps[userId].step = 'waitingForInboundId';
          break;

        case 'waitingForInboundId': {
          const inboundId = parseInt(text, 10);
          if (isNaN(inboundId) || inboundId <= 0) {
            bot.sendMessage(chatId, "❌ กรุณาระบุ Inbound ID เป็นตัวเลขมากกว่า 0:");
            return;
          }
          userSteps[userId].inboundId = inboundId;
          bot.sendMessage(chatId, "กรุณาตั้งชื่อโค้ด (email) ของคุณ:");
          userSteps[userId].step = 'waitingForName';
          break;
        }

        case 'waitingForName':
          userSteps[userId].name = text;
          bot.sendMessage(chatId, "กำหนด GB (ตัวอย่าง: 50):");
          userSteps[userId].step = 'waitingForGB';
          break;

        case 'waitingForGB': {
          const gb = parseInt(text, 10);
          if (isNaN(gb) || gb <= 0) {
            bot.sendMessage(chatId, "❌ กรุณาระบุ GB เป็นตัวเลขมากกว่า 0:");
            return;
          }
          userSteps[userId].gb = gb;
          bot.sendMessage(chatId, "กำหนดวันหมดอายุ (ตัวอย่าง: 30):");
          userSteps[userId].step = 'waitingForDays';
          break;
        }

        case 'waitingForDays': {
          const days = parseInt(text, 10);
          if (isNaN(days) || days <= 0) {
            bot.sendMessage(chatId, "❌ กรุณาระบุวันหมดอายุเป็นตัวเลขมากกว่า 0:");
            return;
          }
          userSteps[userId].days = days;

          const { login, inboundId, name, gb } = userSteps[userId];
          // สร้าง UUID
          const newUUID = uuidv4();
          // เวลาหมดอายุ
          const expiryTime = Math.floor(Date.now() / 1000) + days * 24 * 3600;

          // เพิ่ม `/panel/api/inbounds/addClient` ให้อัตโนมัติ
          const finalURL = `${login.url}/panel/api/inbounds/addClient`;

          bot.sendMessage(chatId, "🔄 กำลังสร้างโค้ด... (ล็อกอินอัตโนมัติ)");

          const settings = {
            method: 'POST',
            url: finalURL,
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            data: {
              id: inboundId, // inbound ID
              settings: JSON.stringify({
                clients: [
                  {
                    id: newUUID,
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

          // เรียก API
          axios(settings)
            .then(() => {
              // สร้างลิงก์ vless://
              const link = `vless://${newUUID}@facebookbotvip.vipv2boxth.xyz:433?type=ws&path=%2F&host=&security=tls&fp=chrome&alpn=&allowInsecure=1&sni=fbcdn.net#${encodeURIComponent(
                name
              )}`;
              bot.sendMessage(chatId, `✅ สร้างโค้ดสำเร็จ!\n\n🔗 ลิงก์: ${link}`);
            })
            .catch((err) => {
              console.error("Error creating client:", err.message);
              bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการสร้างโค้ด");
            });

          // ลบสถานะ
          delete userSteps[userId];
          break;
        }

        default:
          // หากมีขั้นตอนที่ไม่อยู่ในเงื่อนไข
          delete userSteps[userId];
      }
    });
  },
};
