const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // ใช้สำหรับสร้าง UUID

module.exports = {
  name: 'v2ray',
  description: 'คำสั่งสำหรับจัดการ V2Ray',
  execute(bot) {
    const V2RAY_LOGIN_URL = 'http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/login';
    const V2RAY_ADD_CLIENT_URL = 'http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/panel/api/inbounds/addClient';
    const DEFAULT_USERNAME = 'WYEXPRkCKL';
    const DEFAULT_PASSWORD = 'nfEpAlava1';

    // ฟังก์ชันสร้างโค้ดใหม่ (ล็อกอินอัตโนมัติ)
    const createV2RayClient = async (name, expiryDays, totalGB) => {
      try {
        // ล็อกอิน
        const loginResponse = await axios.post(
          V2RAY_LOGIN_URL,
          new URLSearchParams({
            username: DEFAULT_USERNAME,
            password: DEFAULT_PASSWORD,
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );

        if (!loginResponse.data.success) {
          throw new Error(`❌ ล็อกอินไม่สำเร็จ: ${loginResponse.data.msg}`);
        }

        // สร้างโค้ดใหม่
        const uuid = uuidv4();
        const expiryTime = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;

        const clientData = {
          id: 2, // ระบุ ID
          settings: JSON.stringify({
            clients: [
              {
                id: uuid,
                flow: '',
                email: name,
                limitIp: 0,
                totalGB: totalGB,
                expiryTime: expiryTime,
                enable: true,
                tgId: '',
                subId: '2rv0gb458kbfl532',
                reset: 0,
              },
            ],
          }),
        };

        console.log('Request Body:', clientData);

        const createResponse = await axios.post(V2RAY_ADD_CLIENT_URL, clientData, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        return { success: true, data: JSON.parse(createResponse.data.settings).clients[0] };
      } catch (error) {
        if (error.response) {
          console.error('API Error Response:', error.response.data);
        } else {
          console.error('Error:', error.message);
        }
        throw new Error('❌ ไม่สามารถสร้างโค้ดใหม่ได้: โปรดตรวจสอบ URL และการตั้งค่า');
      }
    };

    // ตรวจจับคำสั่ง /v2raycreate
    bot.onText(/\/v2raycreate (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const args = match[1].split(' ');
      const [name, expiryDays, totalGB] = args;

      if (!name || !expiryDays || !totalGB) {
        return bot.sendMessage(chatId, '❌ โปรดระบุ: ชื่อโค้ด วันหมดอายุ (วัน) และจำนวน GB เช่น /v2raycreate mycode 30 100');
      }

      bot.sendMessage(chatId, '🔄 กำลังล็อกอินและสร้างโค้ดใหม่...');

      try {
        const result = await createV2RayClient(name, parseInt(expiryDays, 10), parseInt(totalGB, 10));
        const client = result.data;
        bot.sendMessage(
          chatId,
          `✅ สร้างโค้ดสำเร็จ:\n- ชื่อ: ${name}\n- UUID: ${client.id}\n- วันหมดอายุ: ${expiryDays} วัน\n- GB: ${totalGB} GB`
        );
      } catch (error) {
        bot.sendMessage(chatId, error.message);
      }
    });
  },
};
