const axios = require('axios');

module.exports = {
  name: 'v2ray',
  description: 'คำสั่งสำหรับจัดการ V2Ray',
  execute(bot) {
    const v2rayLogin = async (username, password) => {
      const settings = {
        method: 'POST',
        url: 'http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/login',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: new URLSearchParams({
          username: username,
          password: password,
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

    // เมื่อผู้ใช้ใช้คำสั่ง /v2ray login
    bot.onText(/\/v2ray (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const commandParams = match[1].split(' '); // แยกคำสั่ง
      const subCommand = commandParams[0]; // คำสั่งย่อย เช่น "login"

      if (subCommand === 'login') {
        const username = commandParams[1] || 'WYEXPRkCKL';
        const password = commandParams[2] || 'nfEpAlava1';

        bot.sendMessage(chatId, '🔄 กำลังล็อกอินเข้าสู่ V2Ray...');

        try {
          const loginResult = await v2rayLogin(username, password);
          if (loginResult.success) {
            bot.sendMessage(chatId, `✅ ล็อกอินสำเร็จ: ${loginResult.msg}`);
          } else {
            bot.sendMessage(chatId, `❌ ล็อกอินไม่สำเร็จ: ${loginResult.msg}`);
          }
        } catch (error) {
          bot.sendMessage(chatId, error.message);
        }
      } else {
        bot.sendMessage(chatId, '❌ คำสั่งไม่ถูกต้อง กรุณาใช้ /v2ray login [username] [password]');
      }
    });
  },
};
