const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // ใช้ library สำหรับสร้าง UUID

module.exports = {
  name: 'v2ray',
  description: 'คำสั่งสำหรับจัดการ V2Ray',
  execute(bot) {
    const V2RAY_LOGIN_URL = 'http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/login';
    const V2RAY_ADD_CLIENT_URL = 'http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/panel/api/inbounds/addClient';
    const DEFAULT_USERNAME = 'WYEXPRkCKL';
    const DEFAULT_PASSWORD = 'nfEpAlava1';

    // ฟังก์ชันล็อกอิน
    const v2rayLogin = async () => {
      const settings = {
        method: 'POST',
        url: V2RAY_LOGIN_URL,
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

    // ฟังก์ชันสร้างโค้ดใหม่
    const createV2RayClient = async (name, expiryDays, totalGB) => {
      const uuid = uuidv4();
      const expiryTime = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60; // คำนวณเวลา expiry เป็น timestamp

      const clientData = {
        id: 2,
        settings: JSON.stringify({
          clients: [
            {
              id: uuid,
              flow: "",
              email: name,
              limitIp: 0,
              totalGB: totalGB,
              expiryTime: expiryTime,
              enable: true,
              tgId: "",
              subId: "2rv0gb458kbfl532",
              reset: 0,
            },
          ],
        }),
      };

      try {
        const response = await axios.post(V2RAY_ADD_CLIENT_URL, clientData, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });
        return response.data;
      } catch (error) {
        console.error('Error during V2Ray client creation:', error.message);
        throw new Error('❌ ไม่สามารถสร้างโค้ดใหม่ได้');
      }
    };

    // ตรวจจับคำสั่ง /v2raycreate
    bot.onText(/\/v2raycreate (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const args = match[1].split(' '); // แยกพารามิเตอร์
      const [name, expiryDays, totalGB] = args;

      if (!name || !expiryDays || !totalGB) {
        return bot.sendMessage(chatId, '❌ โปรดระบุ: ชื่อโค้ด วันหมดอายุ (วัน) และจำนวน GB ตัวอย่าง: /v2raycreate mycode 30 100');
      }

      bot.sendMessage(chatId, '🔄 กำลังล็อกอินเข้าสู่ V2Ray...');
      try {
        const loginResult = await v2rayLogin();
        if (!loginResult.success) {
          return bot.sendMessage(chatId, `❌ ล็อกอินไม่สำเร็จ: ${loginResult.msg}`);
        }

        bot.sendMessage(chatId, '🔄 กำลังสร้างโค้ด...');
        const createResult = await createV2RayClient(name, parseInt(expiryDays, 10), parseInt(totalGB, 10));
        bot.sendMessage(chatId, `✅ สร้างโค้ดสำเร็จ: \n- ชื่อ: ${name}\n- UUID: ${createResult.clients[0].id}\n- วันหมดอายุ: ${expiryDays} วัน\n- GB: ${totalGB} GB`);
      } catch (error) {
        bot.sendMessage(chatId, error.message);
      }
    });
  },
};
