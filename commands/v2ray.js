const axios = require('axios');

module.exports = {
  name: 'v2ray',
  description: 'คำสั่งสำหรับจัดการ V2Ray',
  execute(bot) {
    // ฟังก์ชันล็อกอิน
    const v2rayLogin = async (username, password) => {
      const settings = {
        method: 'POST',
        url: 'http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/login', // เปลี่ยน URL ให้ถูกต้อง
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

    // ตรวจสอบข้อความที่ผู้ใช้ส่งมา
    bot.onText(/\/v2ray (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const commandParams = match[1].split(' '); // แยกคำสั่งที่ผู้ใช้พิมพ์
      const subCommand = commandParams[0]; // คำสั่งย่อย เช่น "login"

      // ตรวจสอบคำสั่งย่อย
      if (subCommand === 'login') {
        const username = commandParams[1] || 'WYEXPRkCKL'; // กำหนดค่าเริ่มต้นของ username
        const password = commandParams[2] || 'nfEpAlava1'; // กำหนดค่าเริ่มต้นของ password

        bot.sendMessage(chatId, '🔄 กำลังล็อกอินเข้าสู่ V2Ray...');

        try {
          const loginResult = await v2rayLogin(username, password);

          // ตรวจสอบผลลัพธ์จากการล็อกอิน
          if (loginResult.success) {
            bot.sendMessage(chatId, `✅ ล็อกอินสำเร็จ: ${loginResult.msg}`);
          } else {
            bot.sendMessage(chatId, `❌ ล็อกอินไม่สำเร็จ: ${loginResult.msg}`);
          }
        } catch (error) {
          bot.sendMessage(chatId, error.message);
        }
      } else {
        // ถ้าผู้ใช้ส่งคำสั่งไม่ถูกต้อง
        bot.sendMessage(chatId, '❌ คำสั่งไม่ถูกต้อง กรุณาใช้ /v2ray login [username] [password]');
      }
    });

    // ฟังก์ชันที่ใช้เพื่อช่วยให้ข้อความตอบกลับ
    bot.on('message', (msg) => {
      const chatId = msg.chat.id;

      // ถ้าไม่พบคำสั่งที่ตรงกับ /v2ray ให้แจ้งเตือน
      if (!msg.text.startsWith('/v2ray')) {
        bot.sendMessage(chatId, '❌ คำสั่งที่คุณส่งไม่ถูกต้องหรือไม่ได้ใช้คำสั่งที่รองรับ');
      }
    });
  },
};
