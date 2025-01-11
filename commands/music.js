const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'removebg',
  description: 'ลบพื้นหลังออกจากภาพ',
  execute(bot) {
    // จับคำสั่ง /removebg
    bot.onText(/\/removebg/, (msg) => {
      const chatId = msg.chat.id;
      bot.sendMessage(chatId, "📷 กรุณาส่งรูปภาพที่ต้องการลบพื้นหลัง:");
    });

    // รับรูปภาพที่ผู้ใช้ส่งมา
    bot.on('photo', async (msg) => {
      const chatId = msg.chat.id;

      try {
        // ดึงข้อมูลรูปภาพ
        const photo = msg.photo[msg.photo.length - 1]; // ใช้รูปภาพขนาดใหญ่ที่สุด
        const fileId = photo.file_id;
        const fileUrl = await bot.getFileLink(fileId);

        // ส่งข้อความ "กำลังประมวลผลรูปภาพ..."
        const processingMessage = await bot.sendMessage(chatId, "🔄 กำลังประมวลผลรูปภาพ...");

        // เรียกใช้ API เพื่อลบพื้นหลัง
        const apiUrl = `https://yt-video-production.up.railway.app/background-remove?imageUrl=${encodeURIComponent(fileUrl)}`;
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

        // ตรวจสอบว่าข้อมูลที่ได้จาก API ถูกต้องหรือไม่
        if (!response.data || response.data.length === 0) {
          throw new Error("API ไม่สามารถลบพื้นหลังได้");
        }

        // บันทึกรูปภาพที่ลบพื้นหลังแล้ว
        const outputPath = path.join(__dirname, `${chatId}_nobg.png`);
        fs.writeFileSync(outputPath, response.data);

        // ตรวจสอบขนาดไฟล์ก่อนส่ง
        const fileSize = fs.statSync(outputPath).size;
        if (fileSize > 5 * 1024 * 1024) { // จำกัดขนาดไฟล์ไม่เกิน 5MB
          throw new Error("รูปภาพมีขนาดใหญ่เกินไป");
        }

        // ส่งรูปภาพที่ลบพื้นหลังแล้วกลับให้ผู้ใช้
        await bot.sendPhoto(chatId, fs.createReadStream(outputPath));

        // ลบไฟล์หลังจากส่งเสร็จ
        fs.unlinkSync(outputPath);

        // ลบข้อความ "กำลังประมวลผลรูปภาพ..."
        await deleteMessageSafely(bot, chatId, processingMessage.message_id);
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการลบพื้นหลัง:", error.message);

        // ส่งข้อความแจ้งผู้ใช้
        if (error.message.includes("IMAGE_PROCESS_FAILED")) {
          bot.sendMessage(chatId, "❌ ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองส่งรูปภาพอื่น");
        } else if (error.message.includes("ขนาดใหญ่เกินไป")) {
          bot.sendMessage(chatId, "❌ รูปภาพมีขนาดใหญ่เกินไป กรุณาส่งรูปภาพที่มีขนาดเล็กกว่า 5MB");
        } else {
          bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการลบพื้นหลัง กรุณาลองใหม่อีกครั้ง");
        }
      }
    });

    // ฟังก์ชันสำหรับลบข้อความอย่างปลอดภัย
    async function deleteMessageSafely(bot, chatId, messageId) {
      try {
        await bot.deleteMessage(chatId, messageId);
      } catch (error) {
        console.error("ไม่สามารถลบข้อความได้:", error.message);
      }
    }
  },
};
