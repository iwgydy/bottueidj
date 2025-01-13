const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  name: 'createv2ray',
  description: 'สร้างโค้ด V2Ray พร้อมล็อกอินก่อนและส่งข้อมูลในรูปแบบ { "id": 3, "settings": ... }',
  execute(bot) {
    // ─────────────────────────────────────────────────────────────────
    //  ฟังก์ชันต่างๆ สำหรับการสุ่มข้อมูล
    // ─────────────────────────────────────────────────────────────────
    function generateRandomEmail() {
      const chars = 'abcdefghijklmnopqrstuvwxyz1234567890';
      let email = '';
      for (let i = 0; i < 8; i++) {
        email += chars[Math.floor(Math.random() * chars.length)];
      }
      return `${email}@example.com`;
    }

    function generateExpiryTime() {
      // สุ่มวันหมดอายุ (1 - 30 วัน)
      const days = Math.floor(Math.random() * 30) + 1;
      return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
    }

    function generateTotalGB() {
      // สุ่มโควต้าข้อมูล (1 - 100 GB)
      return Math.floor(Math.random() * 100) + 1;
    }

    // ─────────────────────────────────────────────────────────────────
    //  ฟังก์ชันหลัก: สร้างโค้ด V2Ray
    // ─────────────────────────────────────────────────────────────────
    async function createV2RayCode(chatId) {
      try {
        // 1) ล็อกอิน
        const loginResponse = await axios.post(
          'http://kqodgqtdka.vipv2boxth.xyz:2053/xX3d9tmz5pKEsfz/login',
          {
            username: 'WrVa7Fjxj0',
            password: 'NsmNXw24lu',
          }
        );

        // ตรวจสอบผลการล็อกอิน
        if (!loginResponse.data.success) {
          return bot.sendMessage(
            chatId,
            `❌ ล็อกอินไม่สำเร็จ: ${loginResponse.data.msg}`
          );
        }
        await bot.sendMessage(chatId, '✅ ล็อกอินสำเร็จ: Login Successfully');

        // 2) สุ่มข้อมูลสำหรับสร้างโค้ด V2Ray
        const uuid = uuidv4();
        const email = generateRandomEmail();
        const expiryTime = generateExpiryTime();
        const totalGB = generateTotalGB();

        // 3) เตรียม JSON สำหรับส่งไปยัง API
        const payload = {
          id: 1,
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
        };

        // 4) เรียกใช้ API เพื่อสร้างโค้ด V2Ray
        const createResponse = await axios.post(
          'http://kqodgqtdka.vipv2boxth.xyz:2053/xX3d9tmz5pKEsfz/panel/api/inbounds/addClient',
          payload,
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );

        // 5) ตรวจสอบผลลัพธ์
        if (createResponse.data.success) {
          // ส่งข้อความสรุปโค้ด V2Ray ที่สร้างได้
          bot.sendMessage(
            chatId,
            `✅ สร้างโค้ด V2Ray สำเร็จ\n\n` +
              `🔑 **UUID**: \`${uuid}\`\n` +
              `📧 **Email**: \`${email}\`\n` +
              `💾 **Total GB**: \`${totalGB} GB\`\n` +
              `⏳ **Expiry Time**: \`${new Date(expiryTime * 1000).toLocaleString()}\``,
            { parse_mode: 'Markdown' }
          );
        } else {
          bot.sendMessage(
            chatId,
            `❌ ไม่สามารถสร้างโค้ด V2Ray ได้: ${createResponse.data.msg}`
          );
        }
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        bot.sendMessage(chatId, `❌ เกิดข้อผิดพลาด: ${error.message}`);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    //  ผูกคำสั่ง /createv2ray กับฟังก์ชัน createV2RayCode
    // ─────────────────────────────────────────────────────────────────
    bot.onText(/\/createv2ray/, async (msg) => {
      const chatId = msg.chat.id;
      createV2RayCode(chatId);
    });
  },
};
