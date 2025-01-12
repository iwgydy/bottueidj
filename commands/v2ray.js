const axios = require('axios');

module.exports = {
  name: 'v2ray',
  description: 'คำสั่งสำหรับจัดการ V2Ray',
  execute(bot) {
    // กำหนดค่าเริ่มต้นในโค้ด
    const V2RAY_URL = 'http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/login';
    const DEFAULT_USERNAME = 'WYEXPRkCKL';
    const DEFAULT_PASSWORD = 'nfEpAlava1';

    // ฟังก์ชันล็อกอิน
    const v2rayLogin = async () => {
      const settings = {
        method: 'POST',
        url: V2RAY_URL,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: new URLSearchParams({
          username: DEFAULT_USERNAME,
          password: DEFAULT_PASSWORD,
        }),
      };

      try {
        const response = await axios(settings);
        return response.data;
      } catch (error) {
        console.error('Error during V2Ray login:', error.message);
        throw new Error('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ V2Ray ได้');
      }
    };

    // ตรวจจับคำสั่ง /v2ray
    bot.onText(/\/v2ray/, async (msg) => {
      const chatId = msg.chat.id;

      bot.sendMessage(chatId, '🔄 กำลังล็อกอินเข้าสู่ V2Ray ด้วยค่าที่กำหนดไว้...');

      try {
        const loginResult = await v2rayLogin();
        if (loginResult.success) {
          bot.sendMessage(chatId, `✅ ล็อกอินสำเร็จ: ${loginResult.msg}`);
        } else {
          bot.sendMessage(chatId, `❌ ล็อกอินไม่สำเร็จ: ${loginResult.msg}`);
        }
      } catch (error) {
        bot.sendMessage(chatId, error.message);
      }
    });
  },
};
