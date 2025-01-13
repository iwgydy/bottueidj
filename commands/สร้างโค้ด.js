const axios = require('axios');

module.exports = {
  name: 'login',
  description: 'ล็อกอินและตรวจสอบว่ามีคุกกี้ session หรือไม่',
  execute(bot) {
    bot.onText(/\/login/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        // ตั้งค่า instance ของ axios เพื่อเปิดใช้งานการเก็บคุกกี้
        const axiosInstance = axios.create({
          withCredentials: true, // เปิดใช้งานการเก็บคุกกี้
        });

        // ทำการล็อกอิน
        const response = await axiosInstance.post(
          'http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/login',
          {
            username: 'WYEXPRkCKL',
            password: 'nfEpAlava1',
          }
        );

        // ตรวจสอบผลลัพธ์การล็อกอิน
        if (response.data.success) {
          await bot.sendMessage(chatId, '✅ ล็อกอินสำเร็จ: Login Successfully');

          // ตรวจสอบ headers สำหรับคุกกี้
          const cookies = response.headers['set-cookie'];
          if (cookies) {
            await bot.sendMessage(chatId, `🍪 คุกกี้ที่ได้รับ:\n${cookies.join('\n')}`);
          } else {
            await bot.sendMessage(chatId, '❌ ไม่พบคุกกี้ session หลังล็อกอิน');
          }
        } else {
          await bot.sendMessage(chatId, `❌ ล็อกอินล้มเหลว: ${response.data.msg}`);
        }
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        await bot.sendMessage(chatId, `❌ เกิดข้อผิดพลาด: ${error.message}`);
      }
    });
  },
};
