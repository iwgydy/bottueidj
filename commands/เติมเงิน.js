const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'addmoney',
  description: 'เติมเงินผ่านลิงก์วอเล็ท TrueMoney',
  execute(bot) {
    const filePath = path.join(__dirname, 'smo.json');

    // ฟังก์ชันโหลดหรือสร้างไฟล์ smo.json
    function loadOrCreateFile() {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
      }
      const data = fs.readFileSync(filePath);
      return JSON.parse(data);
    }

    // ฟังก์ชันบันทึกข้อมูลลงใน smo.json
    function saveToFile(data) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // ฟังก์ชันเติมเงินผ่านวอเล็ท
    async function redeemVoucher(code, mobile) {
      const url = `https://gift.truemoney.com/campaign/vouchers/${code}/redeem`;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': 'https://gift.truemoney.com',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      };
      const data = {
        mobile: mobile,
        voucher_hash: code,
      };

      try {
        const response = await axios.post(url, data, { headers });
        return response.data;
      } catch (error) {
        throw new Error(error.response ? error.response.data : error.message);
      }
    }

    // จับคำสั่ง /addmoney <ลิงก์วอเล็ท>
    bot.onText(/\/addmoney (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const voucherLink = match[1].trim();

      // แยกรหัสวอเล็ทจากลิงก์
      const voucherCodeMatch = voucherLink.match(/vouchers\/([a-zA-Z0-9]+)/);
      if (!voucherCodeMatch) {
        return bot.sendMessage(chatId, "❌ กรุณาส่งลิงก์วอเล็ทที่ถูกต้อง เช่น https://gift.truemoney.com/campaign/vouchers/{code}/redeem");
      }
      const voucherCode = voucherCodeMatch[1];

      // คุณสามารถเปลี่ยนหมายเลขโทรศัพท์ได้ตามต้องการ หรือขอให้ผู้ใช้ระบุ
      const mobileNumber = '0987654321'; // ตัวอย่างหมายเลขโทรศัพท์

      // โหลดข้อมูลผู้ใช้
      const data = loadOrCreateFile();

      // สร้างข้อมูลผู้ใช้ใหม่ถ้าไม่มี
      if (!data[userId]) {
        data[userId] = { balance: 0, usedVouchers: [] };
      }

      // ตรวจสอบว่ารหัสวอเล็ทถูกใช้ไปแล้วหรือยัง
      if (data[userId].usedVouchers.includes(voucherCode)) {
        return bot.sendMessage(chatId, "❌ รหัสวอเล็ทนี้ถูกใช้ไปแล้ว");
      }

      // ส่งคำขอเติมเงิน
      bot.sendMessage(chatId, "🔄 กำลังเติมเงินจากวอเล็ท...");

      try {
        const result = await redeemVoucher(voucherCode, mobileNumber);

        // ตรวจสอบผลลัพธ์จาก API ของ TrueMoney
        if (result && result.status === 'success' && result.amount) {
          // เพิ่มเงินให้กับผู้ใช้
          data[userId].balance += parseFloat(result.amount);
          // บันทึกรหัสวอเล็ทที่ถูกใช้แล้ว
          data[userId].usedVouchers.push(voucherCode);
          saveToFile(data);

          bot.sendMessage(chatId, `🎉 คุณเติมเงินสำเร็จ! จำนวนเงินที่ได้รับ: ${parseFloat(result.amount).toFixed(2)} บาท\n💰 ยอดเงินคงเหลือของคุณ: ${data[userId].balance.toFixed(2)} บาท`);
        } else {
          // กรณี API ตอบกลับว่าเติมเงินไม่สำเร็จ
          const errorMsg = result && result.message ? result.message : "ไม่สามารถเติมเงินได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";
          bot.sendMessage(chatId, `❌ การเติมเงินล้มเหลว: ${errorMsg}`);
        }
      } catch (error) {
        console.error("Error in /addmoney command:", error.message);
        bot.sendMessage(chatId, `❌ เกิดข้อผิดพลาดในการเติมเงิน: ${error.message}`);
      }
    });
  },
};
