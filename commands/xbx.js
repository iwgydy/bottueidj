const axios = require('axios');

module.exports = {
  name: 'สร้างโค้ด',
  description: 'สร้างโค้ด V2Ray ด้วยข้อมูลที่ตั้งค่าไว้',
  execute(bot) {
    bot.onText(/\/สร้างโค้ด/, async (msg) => {
      const chatId = msg.chat.id;

      // ข้อมูลลิงก์, ชื่อผู้ใช้, และรหัสผ่านที่กำหนดไว้ล่วงหน้า
      const url = "http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/login";
      const username = "WYEXPRkCKL"; // ตั้งค่าชื่อผู้ใช้
      const password = "nfEpAlava1"; // ตั้งค่ารหัสผ่าน

      // แจ้งผู้ใช้ว่ากำลังตรวจสอบข้อมูล
      bot.sendMessage(chatId, "🔄 กำลังตรวจสอบข้อมูล...");

      try {
        // ส่งคำขอไปยัง API
        const response = await axios.post(url, { username, password });
        const data = response.data;

        if (data.success) {
          bot.sendMessage(chatId, `✅ ล็อกอินสำเร็จ! \n\n📜 ข้อความ: ${data.msg}`);
        } else {
          bot.sendMessage(chatId, `❌ ล็อกอินไม่สำเร็จ: ${data.msg}`);
        }
      } catch (error) {
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
        console.error("Error:", error.message);
      }
    });
  },
};
