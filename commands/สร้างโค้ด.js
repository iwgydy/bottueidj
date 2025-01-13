const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  name: 'createv2ray',
  description: 'สร้างโค้ด V2Ray พร้อมล็อกอินและสุ่มข้อมูล UUID, Email, GB, วันหมดอายุ',
  execute(bot) {
    // ฟังก์ชันสุ่มอีเมล
    function generateRandomEmail() {
      const chars = 'abcdefghijklmnopqrstuvwxyz1234567890';
      let email = '';
      for (let i = 0; i < 8; i++) {
        email += chars[Math.floor(Math.random() * chars.length)];
      }
      return `${email}@example.com`;
    }

    // ฟังก์ชันสุ่มวันหมดอายุ (1-30 วัน)
    function generateExpiryTime() {
      const days = Math.floor(Math.random() * 30) + 1;
      return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
    }

    // ฟังก์ชันสุ่มโควต้าข้อมูล (1-100 GB)
    function generateTotalGB() {
      return Math.floor(Math.random() * 100) + 1;
    }

    // ฟังก์ชันสร้าง V2Ray
    async function createV2RayCode(chatId) {
      try {
        // ล็อกอิน
        const loginResponse = await axios.post(
          'http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/login',
          {
            username: 'WYEXPRkCKL',
            password: 'nfEpAlava1',
          }
        );

        // ตรวจสอบสถานะการล็อกอิน
        if (!loginResponse.data.success) {
          return bot.sendMessage(chatId, `❌ ล็อกอินไม่สำเร็จ: ${loginResponse.data.msg}`);
        }
        bot.sendMessage(chatId, '✅ ล็อกอินสำเร็จ: Login Successfully');

        // สร้าง UUID, อีเมล, วันหมดอายุ และโควต้าข้อมูล
        const uuid = uuidv4();
        const email = generateRandomEmail();
        const expiryTime = generateExpiryTime();
        const totalGB = generateTotalGB();

        // ส่งคำขอสร้างโค้ด V2Ray
        const createResponse = await axios.post(
          'http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/panel/api/inbounds/addClient',
          {
            id: 3,
            settings: JSON.stringify({
              clients: [
                {
                  id: uuid,
                  flow: '',
                  email: email,
                  limitIp: 0,
                  totalGB: totalGB,
                  expiryTime: expiryTime,
                  enable: true,
                  tgId: '',
                  subId: uuidv4(),
                  reset: 0,
                },
              ],
            }),
          },
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );

        // ตรวจสอบสถานะการสร้างโค้ด
        if (createResponse.data.success) {
          bot.sendMessage(
            chatId,
            `✅ สร้างโค้ด V2Ray สำเร็จ:\n\n🔑 **UUID**: ${uuid}\n📧 **Email**: ${email}\n💾 **Total GB**: ${totalGB} GB\n⏳ **Expiry Date**: ${new Date(
              expiryTime * 1000
            ).toLocaleString()}`,
            { parse_mode: 'Markdown' }
          );
        } else {
          bot.sendMessage(chatId, `❌ ไม่สามารถสร้างโค้ด V2Ray ได้: ${createResponse.data.msg}`);
        }
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        bot.sendMessage(chatId, `❌ เกิดข้อผิดพลาด: ${error.message}`);
      }
    }

    // ดักจับคำสั่ง /createv2ray
    bot.onText(/\/createv2ray/, (msg) => {
      const chatId = msg.chat.id;
      createV2RayCode(chatId);
    });
  },
};
