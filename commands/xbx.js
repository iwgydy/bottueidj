const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// ไฟล์เก็บข้อมูลล็อกอิน
const loginsFilePath = path.join(__dirname, '../data/looks.json');

/** อ่านข้อมูลล็อกอินของ userId (ถ้ามี) */
function getUserLogin(userId) {
  if (fs.existsSync(loginsFilePath)) {
    const logins = JSON.parse(fs.readFileSync(loginsFilePath, 'utf8'));
    return logins.find((login) => login.userId === userId);
  }
  return null;
}

/** บันทึกข้อมูลล็อกอินใหม่ลงใน looks.json */
function saveUserLogin(logData) {
  let logins = [];
  if (fs.existsSync(loginsFilePath)) {
    logins = JSON.parse(fs.readFileSync(loginsFilePath, 'utf8'));
  }
  // ลบข้อมูลเก่าของ userId นี้ออก
  logins = logins.filter((login) => login.userId !== logData.userId);

  // เพิ่มข้อมูลใหม่
  logins.push(logData);

  // เขียนกลับลงไฟล์
  fs.writeFileSync(loginsFilePath, JSON.stringify(logins, null, 2));
}

module.exports = {
  name: 'สร้างโค้ด',
  description: 'ล็อกอินก่อนและสร้างโค้ด V2Ray',
  execute(bot) {
    // สถานะการถามต่าง ๆ
    let waitingForURL = {};
    let waitingForUsername = {};
    let waitingForPassword = {};

    let waitingForID = {};
    let waitingForName = {};
    let waitingForGB = {};
    let waitingForDays = {};

    // เก็บข้อมูลชั่วคราว
    let codeInfo = {};

    /** 
     * เมื่อมีการพิมพ์ /สร้างโค้ด
     */
    bot.onText(/\/สร้างโค้ด/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      // ตรวจสอบว่าเคยมีข้อมูลล็อกอินหรือไม่
      const savedLogin = getUserLogin(userId);

      if (!savedLogin) {
        // ยังไม่มีข้อมูล -> ถาม URL, username, password
        bot.sendMessage(chatId, "คุณยังไม่มีข้อมูลล็อกอิน\nกรุณาใส่ **URL** (เช่น http://example.com):");
        waitingForURL[userId] = true;
      } else {
        // มีก่อนแล้ว -> บังคับล็อกอินใหม่ทุกครั้ง (ตามที่คุณต้องการ)
        // หากต้องการใช้ข้อมูลเก่า ไม่ล็อกอินใหม่ทุกครั้ง ให้ข้ามส่วนนี้
        bot.sendMessage(chatId, "กรุณาใส่ **URL** (ตัวอย่าง: http://example.com) เพื่อล็อกอินใหม่:");
        waitingForURL[userId] = true;
      }
    });

    /**
     * ฟัง message ทุกครั้ง เพื่อตรวจสอบว่ายังอยู่ในขั้นตอนใด
     */
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = msg.text;

      // ----- ขั้นตอนล็อกอิน -----
      // 1) ถาม URL
      if (waitingForURL[userId]) {
        codeInfo[userId] = {
          url: text.trim(), // เก็บ URL
        };
        bot.sendMessage(chatId, "กรุณาใส่ **username** ของคุณ:");
        waitingForURL[userId] = false;
        waitingForUsername[userId] = true;
        return;
      }

      // 2) ถาม username
      if (waitingForUsername[userId]) {
        codeInfo[userId].username = text.trim();
        bot.sendMessage(chatId, "กรุณาใส่ **password** ของคุณ:");
        waitingForUsername[userId] = false;
        waitingForPassword[userId] = true;
        return;
      }

      // 3) ถาม password
      if (waitingForPassword[userId]) {
        codeInfo[userId].password = text.trim();

        // เมื่อตอบ password เสร็จ ให้ลอง "ล็อกอิน" ทันที
        waitingForPassword[userId] = false;

        const loginURL = `${codeInfo[userId].url}/login`; // เช่น http://example.com/login

        // แจ้งผู้ใช้ว่ากำลังล็อกอิน...
        bot.sendMessage(chatId, "🔄 กำลังล็อกอินกับเซิร์ฟเวอร์...");

        // เรียก API ล็อกอิน
        try {
          const res = await axios.post(loginURL, {
            username: codeInfo[userId].username,
            password: codeInfo[userId].password,
          });
          const data = res.data;
          if (data.success) {
            // ล็อกอินสำเร็จ -> บันทึกข้อมูล
            saveUserLogin({
              userId,
              url: codeInfo[userId].url,
              username: codeInfo[userId].username,
              password: codeInfo[userId].password,
            });
            bot.sendMessage(chatId, `✅ ล็อกอินสำเร็จ: ${data.msg}`);

            // ไปถามข้อมูลเพื่อสร้างโค้ด
            bot.sendMessage(chatId, "กรุณาใส่ **ID** (ตัวอย่าง: 5):");
            waitingForID[userId] = true;
          } else {
            // ล็อกอินไม่สำเร็จ
            bot.sendMessage(chatId, `❌ ล็อกอินไม่สำเร็จ: ${data.msg}`);
            // จบเลย ไม่สร้างโค้ด
            delete codeInfo[userId];
          }
        } catch (err) {
          // เรียก API ไม่ได้
          bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ขณะล็อกอิน");
          console.error(err.message);
          delete codeInfo[userId];
        }
        return;
      }

      // ----- ขั้นตอนสร้างโค้ด (หลังล็อกอินผ่านแล้ว) -----
      // 4) ถาม ID
      if (waitingForID[userId]) {
        const parsedID = parseInt(text, 10);
        if (isNaN(parsedID) || parsedID <= 0) {
          bot.sendMessage(chatId, "❌ กรุณาใส่ ID เป็นตัวเลขที่มากกว่า 0");
          return;
        }
        codeInfo[userId].id = parsedID;
        bot.sendMessage(chatId, "กรุณาตั้งชื่อโค้ดของคุณ:");
        waitingForID[userId] = false;
        waitingForName[userId] = true;
        return;
      }

      // 5) ถามชื่อโค้ด
      if (waitingForName[userId]) {
        codeInfo[userId].name = text.trim();
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

        // สร้าง UUID และคำนวณวันหมดอายุ
        const uuid = uuidv4();
        const expiryTime = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;

        // เตรียมข้อมูลเรียก API สร้างโค้ด
        const addClientURL = `${codeInfo[userId].url}/panel/api/inbounds/addClient`;
        const settings = {
          method: 'POST',
          url: addClientURL,
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

        bot.sendMessage(chatId, "🔄 กำลังสร้างโค้ดของคุณ...");

        try {
          await axios(settings);

          // สร้างลิงก์ vless
          const link = `vless://${uuid}@facebookbotvip.vipv2boxth.xyz:433?type=ws&path=%2F&host=&security=tls&fp=chrome&alpn=&allowInsecure=1&sni=fbcdn.net#${encodeURIComponent(
            codeInfo[userId].name
          )}`;

          bot.sendMessage(chatId, `✅ โค้ดของคุณถูกสร้างสำเร็จ!\n\n🔗 ลิงก์:\n${link}`);
        } catch (error) {
          bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการสร้างโค้ด กรุณาลองใหม่อีกครั้ง");
          console.error(error.message);
        }

        // ล้างข้อมูลชั่วคราว
        delete codeInfo[userId];
        delete waitingForDays[userId];
      }
    });
  },
};
