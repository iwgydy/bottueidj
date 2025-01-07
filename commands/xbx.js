/**
 * คำสั่ง /สร้างโค้ด
 * - ล็อกอินอัตโนมัติ (ถ้าไม่เคยล็อกอินจะถาม URL, username, password)
 * - ถาม ID, ชื่อโค้ด, GB, วันหมดอายุ
 * - สร้างโค้ด Vless พร้อม UUID
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// ไฟล์สำหรับเก็บข้อมูลล็อกอิน
const loginsFilePath = path.join(__dirname, '../data/looks.json');

/** 
 * อ่านข้อมูลล็อกอินจากไฟล์ (หากมี)
 */
function getUserLogin(userId) {
  if (fs.existsSync(loginsFilePath)) {
    const logins = JSON.parse(fs.readFileSync(loginsFilePath, 'utf8'));
    return logins.find(login => login.userId === userId);
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

  // ลบข้อมูลล็อกอินเก่าของผู้ใช้
  logins = logins.filter(login => login.userId !== logData.userId);

  // เพิ่มข้อมูลล็อกอินใหม่
  logins.push(logData);

  // บันทึกกลับลงไฟล์
  fs.writeFileSync(loginsFilePath, JSON.stringify(logins, null, 2));
}

module.exports = {
  name: 'สร้างโค้ด',
  description: 'สร้างโค้ด V2Ray พร้อมล็อกอินและถาม ID',
  execute(bot) {
    // สถานะการถามข้อมูลต่าง ๆ
    let waitingForURL = {};      
    let waitingForUsername = {};
    let waitingForPassword = {};
    let waitingForID = {};
    let waitingForName = {};
    let waitingForGB = {};
    let waitingForDays = {};

    // เก็บข้อมูลชั่วคราวระหว่างถามแต่ละขั้น
    let codeInfo = {};

    // เมื่อผู้ใช้พิมพ์ /สร้างโค้ด
    bot.onText(/\/สร้างโค้ด/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      // ตรวจสอบว่าเคยล็อกอินหรือยัง
      const savedLogin = getUserLogin(userId);
      if (!savedLogin) {
        // ยังไม่เคยล็อกอิน -> ขอ URL, username, password
        bot.sendMessage(chatId, "กรุณาส่ง **URL** API ของคุณ (เช่น http://example.com):");
        waitingForURL[userId] = true;
      } else {
        // เคยล็อกอินแล้ว -> ขอ ID
        codeInfo[userId] = { ...savedLogin }; // เก็บข้อมูลล็อกอินมาใช้ด้วย
        bot.sendMessage(chatId, "กรุณาใส่ **ID** (ตัวอย่าง: 5):");
        waitingForID[userId] = true;
      }
    });

    // ฟังทุก message เพื่อตรวจสอบสถานะ
    bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = msg.text;

      // 1) ถาม URL
      if (waitingForURL[userId]) {
        codeInfo[userId] = { url: text }; // เก็บ URL ไว้ก่อน
        bot.sendMessage(chatId, "กรุณาใส่ **username** ของคุณ:");
        waitingForURL[userId] = false;
        waitingForUsername[userId] = true;
        return;
      }

      // 2) ถาม username
      if (waitingForUsername[userId]) {
        codeInfo[userId].username = text;
        bot.sendMessage(chatId, "กรุณาใส่ **password** ของคุณ:");
        waitingForUsername[userId] = false;
        waitingForPassword[userId] = true;
        return;
      }

      // 3) ถาม password
      if (waitingForPassword[userId]) {
        codeInfo[userId].password = text;

        // บันทึกข้อมูลล็อกอิน
        saveUserLogin({
          userId,
          url: codeInfo[userId].url,
          username: codeInfo[userId].username,
          password: codeInfo[userId].password,
        });

        // เมื่อบันทึกเสร็จ -> ขอ ID
        bot.sendMessage(chatId, "กรุณาใส่ **ID** (ตัวอย่าง: 5):");
        waitingForPassword[userId] = false;
        waitingForID[userId] = true;
        return;
      }

      // 4) ถาม ID
      if (waitingForID[userId]) {
        const idNum = parseInt(text, 10);
        if (isNaN(idNum) || idNum <= 0) {
          bot.sendMessage(chatId, "❌ กรุณาใส่ ID เป็นตัวเลขที่มากกว่า 0");
          return;
        }
        codeInfo[userId].id = idNum;
        bot.sendMessage(chatId, "กรุณาตั้งชื่อโค้ดของคุณ:");
        waitingForID[userId] = false;
        waitingForName[userId] = true;
        return;
      }

      // 5) ถามชื่อโค้ด
      if (waitingForName[userId]) {
        codeInfo[userId].name = text;
        bot.sendMessage(chatId, "กรุณากำหนด **GB** (ตัวอย่าง: 50):");
        waitingForName[userId] = false;
        waitingForGB[userId] = true;
        return;
      }

      // 6) ถาม GB
      if (waitingForGB[userId]) {
        const gb = parseInt(text, 10);
        if (isNaN(gb) || gb <= 0) {
          bot.sendMessage(chatId, "❌ กรุณากำหนด GB เป็นตัวเลขที่มากกว่า 0:");
          return;
        }
        codeInfo[userId].gb = gb;
        bot.sendMessage(chatId, "กรุณากำหนดจำนวน **วันหมดอายุ** (ตัวอย่าง: 30):");
        waitingForGB[userId] = false;
        waitingForDays[userId] = true;
        return;
      }

      // 7) ถามวันหมดอายุ
      if (waitingForDays[userId]) {
        const days = parseInt(text, 10);
        if (isNaN(days) || days <= 0) {
          bot.sendMessage(chatId, "❌ กรุณากำหนดจำนวนวันหมดอายุเป็นตัวเลขที่มากกว่า 0:");
          return;
        }
        codeInfo[userId].days = days;

        // สร้าง UUID และกำหนดวันหมดอายุ
        const uuid = uuidv4();
        const expiryTime = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;

        // เตรียมข้อมูลเรียก API
        const fullURL = `${codeInfo[userId].url}/panel/api/inbounds/addClient`;

        const settings = {
          method: 'POST',
          url: fullURL,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: {
            id: codeInfo[userId].id,
            settings: JSON.stringify({
              clients: [
                {
                  id: uuid,
                  flow: '',
                  email: codeInfo[userId].name,
                  limitIp: 0,
                  totalGB: codeInfo[userId].gb,
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

        // แจ้งผู้ใช้ว่ากำลังสร้างโค้ด
        bot.sendMessage(chatId, "🔄 กำลังสร้างโค้ดของคุณ...");

        axios(settings)
          .then(() => {
            // สร้างลิงก์ vless
            const link = `vless://${uuid}@facebookbotvip.vipv2boxth.xyz:433?type=ws&path=%2F&host=&security=tls&fp=chrome&alpn=&allowInsecure=1&sni=fbcdn.net#${encodeURIComponent(
              codeInfo[userId].name
            )}`;
            bot.sendMessage(chatId, `✅ โค้ดของคุณถูกสร้างสำเร็จ!\n\n🔗 ลิงก์:\n${link}`);
          })
          .catch((error) => {
            bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการสร้างโค้ด กรุณาลองใหม่อีกครั้ง");
            console.error(error.message);
          });

        // ล้างสถานะท้ายสุด
        delete waitingForDays[userId];
        delete codeInfo[userId];
      }
    });
  },
};
