// commands/money.js
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // สำหรับเรียกใช้ API

module.exports = {
  name: 'เติมเงิน', // ชื่อคำสั่ง
  description: 'เติมเงินผ่านลิงก์อังเปา TrueMoney', // คำอธิบายคำสั่ง
  execute(bot) {
    // คำสั่งเติมเงิน (/เติมเงิน <ลิงก์อังเปา>)
    bot.onText(/\/เติมเงิน (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || msg.from.first_name;
      const link = match[1].trim(); // ลิงก์อังเปาที่ผู้ใช้ป้อน

      // ดึงรหัสอังเปาจากพารามิเตอร์ `v` ในลิงก์
      const urlParams = new URLSearchParams(new URL(link).search);
      const code = urlParams.get('v'); // รหัสอังเปา

      // ตรวจสอบว่ารหัสอังเปามีค่าหรือไม่
      if (!code) {
        return bot.sendMessage(chatId, '⚠️ ลิงก์อังเปาไม่ถูกต้อง กรุณาตรวจสอบลิงก์อีกครั้ง');
      }

      // ข้อมูลสำหรับเรียกใช้ API
      const apiUrl = `https://gift.truemoney.com/campaign/vouchers/${code}/redeem`;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36',
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: 'https://gift.truemoney.com',
        'Accept-Language': 'en-US,en;q=0.9',
        Connection: 'keep-alive',
      };
      const body = {
        mobile: 'เบอร์โทรศัพท์ของคุณ', // แทนที่ด้วยเบอร์โทรศัพท์ที่ลงทะเบียนกับ TrueMoney
        voucher_hash: code,
      };

      try {
        // เรียกใช้ API เพื่อเติมเงิน
        const response = await axios.post(apiUrl, body, { headers });

        // ตรวจสอบผลลัพธ์จาก API
        if (response.data.status.code === 'SUCCESS') {
          const amount = response.data.data.voucher.amount_baht; // มูลค่าอังเปา (บาท)

          // อ่านไฟล์ sosnw.json
          const filePath = path.join(__dirname, '../sosnw.json');
          const data = fs.readFileSync(filePath, 'utf8');
          let users = JSON.parse(data);

          // ตรวจสอบว่าผู้ใช้มีข้อมูลอยู่แล้วหรือไม่
          if (!users[userId]) {
            users[userId] = { username, balance: 0 }; // สร้างข้อมูลใหม่หากไม่มี
          }

          // อัปเดตยอดเงิน (หน่วยสตางค์)
          users[userId].balance += amount * 100;

          // บันทึกข้อมูลลงไฟล์
          fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

          // แปลงยอดเงินกลับเป็นบาทและสตางค์
          const balanceInBaht = (users[userId].balance / 100).toFixed(2);
          const [baht, satang] = balanceInBaht.split('.');

          // ส่งข้อความยืนยันกลับไปยังผู้ใช้
          bot.sendMessage(
            chatId,
            `✅ เติมเงินสำเร็จ!\n\n👤 ผู้ใช้: ${username}\n💰 มูลค่าอังเปา: ${amount} บาท\n💰 ยอดเงินปัจจุบัน: ${baht} บาท ${satang} สตางค์`
          );
        } else {
          // หาก API ส่งกลับข้อผิดพลาด
          bot.sendMessage(chatId, `⚠️ ไม่สามารถเติมเงินได้: ${response.data.status.message}`);
        }
      } catch (error) {
        console.error('⚠️ เกิดข้อผิดพลาดในการเรียกใช้ API:', error);
        bot.sendMessage(chatId, '⚠️ เกิดข้อผิดพลาดในการเติมเงิน กรุณาลองใหม่อีกครั้ง');
      }
    });
  },
};
