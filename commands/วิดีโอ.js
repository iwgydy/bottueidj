const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'zombie',
  description: 'แปลงรูปภาพเป็นซอมบี้',
  execute(bot) {
    // จับคำสั่ง /zombie
    bot.onText(/\/zombie/, async (msg) => {
      try {
        const chatId = msg.chat.id;

        // แจ้งผู้ใช้ให้ส่งรูปภาพ
        bot.sendMessage(chatId, "📸 กรุณาส่งรูปภาพที่ต้องการแปลงเป็นซอมบี้:");
      } catch (error) {
        console.error("Error in /zombie command:", error.message);
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการเริ่มคำสั่ง");
      }
    });

    // รับรูปภาพที่ผู้ใช้ส่งมา
    bot.on('photo', async (msg) => {
      try {
        const chatId = msg.chat.id;

        // ดึงลิงก์รูปภาพ
        const photo = msg.photo[msg.photo.length - 1]; // ใช้รูปภาพขนาดใหญ่ที่สุด
        const fileId = photo.file_id;
        const fileUrl = await bot.getFileLink(fileId);

        // แจ้งผู้ใช้ว่ากำลังประมวลผล
        bot.sendMessage(chatId, "🔄 กำลังแปลงรูปภาพเป็นซอมบี้...");

        // เรียกใช้ API เพื่อแปลงรูปภาพ
        const apiUrl = `https://kaiz-apis.gleeze.com/api/zombie?url=${encodeURIComponent(fileUrl)}`;
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

        // สร้างไฟล์ภาพซอมบี้ชั่วคราว
        const zombiePath = path.join(__dirname, `${chatId}_zombie.jpg`);
        fs.writeFileSync(zombiePath, response.data);

        // ส่งภาพซอมบี้ให้ผู้ใช้
        await bot.sendPhoto(chatId, fs.createReadStream(zombiePath));

        // ลบไฟล์หลังจากส่งเสร็จ
        fs.unlinkSync(zombiePath);
      } catch (error) {
        console.error("Error in zombie photo processing:", error.message);
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการแปลงรูปภาพเป็นซอมบี้");
      }
    });
  },
};
