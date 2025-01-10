const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'removeb',
  description: 'ลบพื้นหลังออกจากรูปภาพ',
  execute(bot) {
    // จับคำสั่ง /removeb
    bot.onText(/\/removeb/, async (msg) => {
      try {
        const chatId = msg.chat.id;

        // แจ้งผู้ใช้ให้ส่งรูปภาพ
        bot.sendMessage(chatId, "📸 กรุณาส่งรูปภาพที่ต้องการลบพื้นหลัง:");
      } catch (error) {
        console.error("Error in /removeb command:", error.message);
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
        bot.sendMessage(chatId, "🔄 กำลังลบพื้นหลังออกจากรูปภาพ...");

        // เรียกใช้ API เพื่อลบพื้นหลัง
        const apiUrl = `https://kaiz-apis.gleeze.com/api/removeb?url=${encodeURIComponent(fileUrl)}`;
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

        // สร้างไฟล์ภาพที่ลบพื้นหลังแล้วชั่วคราว
        const removedBgPath = path.join(__dirname, `${chatId}_removed_bg.png`);
        fs.writeFileSync(removedBgPath, response.data);

        // ส่งภาพที่ลบพื้นหลังแล้วให้ผู้ใช้
        await bot.sendPhoto(chatId, fs.createReadStream(removedBgPath));

        // ลบไฟล์หลังจากส่งเสร็จ
        fs.unlinkSync(removedBgPath);
      } catch (error) {
        console.error("Error in remove background processing:", error.message);
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการลบพื้นหลังออกจากรูปภาพ");
      }
    });
  },
};
