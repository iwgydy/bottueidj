const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const loginsFilePath = path.join(__dirname, '../data/looks.json');

function getUserLogin(userId) {
  if (fs.existsSync(loginsFilePath)) {
    const logins = JSON.parse(fs.readFileSync(loginsFilePath, 'utf8'));
    return logins.find(login => login.userId === userId);
  }
  return null;
}

function saveUserLogin(logData) {
  let logins = [];
  if (fs.existsSync(loginsFilePath)) {
    logins = JSON.parse(fs.readFileSync(loginsFilePath, 'utf8'));
  }

  logins = logins.filter(login => login.userId !== logData.userId);

  logins.push(logData);

  fs.writeFileSync(loginsFilePath, JSON.stringify(logins, null, 2));
}

module.exports = {
  name: 'สร้างโค้ด',
  description: 'สร้างโค้ด V2Ray พร้อมแก้ไขข้อผิดพลาดตัวแปรซ้ำ',
  execute(bot) {
    let userSteps = {};

    bot.onText(/\/สร้างโค้ด/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      const savedLogin = getUserLogin(userId);

      if (!savedLogin) {
        bot.sendMessage(chatId, "กรุณากรอก **URL API** (ตัวอย่าง: http://example.com):");
        userSteps[userId] = { step: 'waitingForURL' };
      } else {
        bot.sendMessage(chatId, "กรุณาใส่ ID (ตัวอย่าง: 5):");
        userSteps[userId] = { step: 'waitingForID', login: savedLogin };
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
          bot.sendMessage(chatId, "กรุณากรอก **ชื่อผู้ใช้**:");
          userSteps[userId].step = 'waitingForUsername';
          break;

        case 'waitingForUsername':
          userSteps[userId].login.username = text;
          bot.sendMessage(chatId, "กรุณากรอก **รหัสผ่าน**:");
          userSteps[userId].step = 'waitingForPassword';
          break;

        case 'waitingForPassword':
          userSteps[userId].login.password = text;
          saveUserLogin({
            userId,
            ...userSteps[userId].login,
          });
          bot.sendMessage(chatId, "กรุณาใส่ ID (ตัวอย่าง: 5):");
          userSteps[userId].step = 'waitingForID';
          break;

        case 'waitingForID':
          const clientId = parseInt(text, 10);
          if (isNaN(clientId) || clientId <= 0) {
            bot.sendMessage(chatId, "❌ กรุณาใส่ ID เป็นตัวเลขที่มากกว่า 0:");
            return;
          }
          userSteps[userId].id = clientId;
          bot.sendMessage(chatId, "กรุณาตั้งชื่อโค้ดของคุณ:");
          userSteps[userId].step = 'waitingForName';
          break;

        case 'waitingForName':
          userSteps[userId].name = text;
          bot.sendMessage(chatId, "กรุณากำหนด GB (ตัวอย่าง: 50):");
          userSteps[userId].step = 'waitingForGB';
          break;

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

        case 'waitingForDays':
          const days = parseInt(text, 10);
          if (isNaN(days) || days <= 0) {
            bot.sendMessage(chatId, "❌ กรุณากำหนดจำนวนวันหมดอายุเป็นตัวเลขที่มากกว่า 0:");
            return;
          }
          userSteps[userId].days = days;

          const { login, id: clientId, name, gb } = userSteps[userId];
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
              id: clientId,
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

          delete userSteps[userId];
          break;

        default:
          bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการดำเนินการ");
          delete userSteps[userId];
      }
    });
  },
};
