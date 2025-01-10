const axios = require('axios');

module.exports = {
  name: 'imghippo',
  description: 'อัปโหลดรูปภาพไปยัง Imghippo และรับ URL ของรูปภาพที่อัปโหลด',
  execute(bot) {
    // จับคำสั่ง /imghippo
    bot.onText(/\/imghippo/, async (msg) => {
      try {
        const chatId = msg.chat.id;

        // แจ้งผู้ใช้ให้ส่งรูปภาพ
        bot.sendMessage(chatId, "📸 กรุณาส่งรูปภาพที่ต้องการอัปโหลดไปยัง Imghippo:");
      } catch (error) {
        console.error("Error in /imghippo command:", error.message);
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

        // แจ้งผู้ใช้ว่ากำลังอัปโหลดรูปภาพ
        bot.sendMessage(chatId, "🔄 กำลังอัปโหลดรูปภาพไปยัง Imghippo...");

        // เรียกใช้ API เพื่ออัปโหลดรูปภาพ
        const apiUrl = `https://kaiz-apis.gleeze.com/api/imghippo?uploadImageUrl=${encodeURIComponent(fileUrl)}`;
        const response = await axios.get(apiUrl);

        // ตรวจสอบผลลัพธ์จาก API
        if (response.data && response.data.url) {
          const uploadedImageUrl = response.data.url; // URL ของรูปภาพที่อัปโหลด
          bot.sendMessage(chatId, `✅ อัปโหลดรูปภาพสำเร็จ!\n\n🔗 ลิงก์รูปภาพ: ${uploadedImageUrl}`);
        } else {
          bot.sendMessage(chatId, "❌ ไม่สามารถอัปโหลดรูปภาพได้");
        }
      } catch (error) {
        console.error("Error in imghippo photo upload:", error.message);
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
      }
    });
  },
};
