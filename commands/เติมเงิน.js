const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
  name: 'topupPrivate',
  description: 'เติมเงินผ่านลิงก์อั่งเปา TrueMoney (เฉพาะแชทส่วนตัว) พร้อมลอง 10 ครั้ง หากถูกใช้แล้วจะแจ้งให้ทราบ',
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

    // ฟังก์ชันสำหรับเรียก API เติมเงิน (Redeem)
    async function redeemVoucher(voucherCode) {
      const url = `https://gift.truemoney.com/campaign/vouchers/${voucherCode}/redeem`;

      // **แก้เป็นเบอร์ TrueMoney ของคุณ**
      const payload = {
        mobile: "0825658423",
        voucher_hash: voucherCode,
      };

      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36",
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "https://gift.truemoney.com",
        "Accept-Language": "en-US,en;q=0.9",
        Connection: "keep-alive",
      };

      const response = await axios.post(url, payload, { headers });
      return response.data; // คืนข้อมูล JSON ที่ได้จาก API
    }

    // Event รับข้อความจากผู้ใช้
    bot.on('message', async (msg) => {
      try {
        // ตรวจสอบว่าเป็นแชทส่วนตัวหรือไม่
        if (msg.chat.type !== 'private') {
          return bot.sendMessage(
            msg.chat.id,
            "❌ กรุณาเติมเงินผ่านแชทส่วนตัวกับบอทเท่านั้น"
          );
        }

        // ตรวจสอบว่าข้อความมีลิงก์อั่งเปาหรือไม่
        const text = msg.text || "";
        // ตัวอย่างลิงก์ https://gift.truemoney.com/campaign/?v=XXXXX
        if (!text.includes("https://gift.truemoney.com/campaign/?v=")) {
          // ถ้าไม่ใช่ลิงก์อั่งเปา ก็แจ้งผู้ใช้ (หรือจะไม่ทำอะไรก็ได้)
          return bot.sendMessage(
            msg.chat.id,
            "กรุณาวางลิงก์อั่งเปา TrueMoney Wallet ตามรูปแบบ\n" +
            "เช่น: https://gift.truemoney.com/campaign/?v=xxxxxxxxxx"
          );
        }

        // ดึง voucherCode จากลิงก์
        const splitted = text.split("?v=");
        if (splitted.length < 2) {
          return bot.sendMessage(
            msg.chat.id,
            "❌ ไม่พบโค้ดอั่งเปาในลิงก์ กรุณาตรวจสอบอีกครั้ง"
          );
        }

        // voucherCode คือพาร์ทหลัง "?v="
        // ในกรณีมี parameter อื่นๆ ต่อท้าย ให้ตัดด้วย split("&") หรือ เว้นวรรค
        const rawCode = splitted[1].split("&")[0].split(" ")[0].trim();
        if (!rawCode) {
          return bot.sendMessage(
            msg.chat.id,
            "❌ ไม่พบโค้ดอั่งเปาในลิงก์ กรุณาตรวจสอบอีกครั้ง"
          );
        }

        // โหลดข้อมูลผู้ใช้
        const data = loadOrCreateFile();
        const userId = msg.from.id;
        if (!data[userId]) {
          data[userId] = { balance: 0 };
          saveToFile(data);
        }

        // แจ้งผู้ใช้ว่ากำลังดำเนินการ
        await bot.sendMessage(msg.chat.id, "⏳ กำลังดำเนินการเติมเงินจากอั่งเปา...");

        // พยายามเติมเงินสูงสุด 10 ครั้ง
        let success = false;
        let errorDetail = "";

        for (let i = 1; i <= 10; i++) {
          try {
            // เรียกฟังก์ชัน redeemVoucher
            const result = await redeemVoucher(rawCode);

            // ตัวอย่างการตรวจสอบสถานะ หากเติมสำเร็จ
            // สมมุติว่า result.status.code === "SUCCESS"
            if (result.status && result.status.code === "SUCCESS") {
              const amount = parseFloat(result.data.my_ticket.amount_baht || 0);
              data[userId].balance += amount;
              saveToFile(data);

              success = true;
              await bot.sendMessage(
                msg.chat.id,
                `✅ เติมเงินสำเร็จ! คุณได้รับเงิน ${amount.toFixed(2)} บาท\n` +
                `💰 ยอดเงินคงเหลือ: ${data[userId].balance.toFixed(2)} บาท\n\n` +
                `👉 เสร็จสิ้นในรอบที่ ${i} จาก 10`
              );
              break; // ออกจาก loop ถ้าทำสำเร็จ
            }
            // กรณีลิ้งอั่งเปาถูกใช้แล้ว (สมมุติว่า code === "USED" หรือ "ALREADY_USED")
            else if (result.status && result.status.code === "USED") {
              errorDetail = "ลิ้งอังเปาถูกใช้แล้ว";
              await bot.sendMessage(msg.chat.id, `❌ ${errorDetail}`);
              break; // หยุดทันที ไม่ต้องลองซ้ำ
            }
            // หรือเช็คเงื่อนไขอื่น เช่น "ALREADY_USED", "EXPIRED", ...
            else {
              // ถ้าไม่สำเร็จ ให้เก็บ errorDetail ไว้ก่อน
              errorDetail = JSON.stringify(result);
            }
          } catch (err) {
            // ถ้าเรียก API แล้ว Error
            errorDetail = err.message;
          }

          // รอ 1-2 วินาทีค่อยลองใหม่ (กัน call ถี่เกิน)
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        // ถ้าครบ 10 รอบแล้วยังไม่สำเร็จ และ errorDetail ไม่ใช่ "ลิ้งอังเปาถูกใช้แล้ว"
        if (!success && errorDetail !== "ลิ้งอังเปาถูกใช้แล้ว") {
          await bot.sendMessage(
            msg.chat.id,
            "❌ ไม่สามารถเติมเงินได้ภายใน 10 รอบ\n" +
            `รายละเอียด:\n${errorDetail}`
          );
        }
      } catch (err) {
        console.error("Error processing TrueMoney top-up:", err.message);
        bot.sendMessage(
          msg.chat.id,
          "❌ เกิดข้อผิดพลาดในการดำเนินการเติมเงิน"
        );
      }
    });
  },
};
