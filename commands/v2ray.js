const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  name: 'addclient', // ชื่อคำสั่ง (ไม่ต้องมี /)
  description: 'สร้างโค้ดใหม่และเพิ่มลูกค้าในระบบ V2Ray',
  execute: (bot) => {
    // ------------------------------------------------------------
    // 1) หากพิมพ์ /addclient แต่ไม่มีข้อมูลเพิ่มเติม
    // ------------------------------------------------------------
    bot.onText(/^\/addclient(?:@\w+)?$/, (msg) => {
      bot.sendMessage(
        msg.chat.id,
        "❗ โปรดระบุชื่อโค้ด จำนวนวัน และ GB ที่ต้องการ\n\nตัวอย่าง: `/addclient mycode 30 100`",
        { parse_mode: "Markdown" }
      );
    });

    // ------------------------------------------------------------
    // 2) คำสั่ง /addclient <ชื่อโค้ด> <จำนวนวัน> <GB>
    // ------------------------------------------------------------
    bot.onText(/^\/addclient(?:@\w+)?\s+(\S+)\s+(\d+)\s+(\d+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const codeName = match[1];
      const days = parseInt(match[2], 10);
      const totalGB = parseInt(match[3], 10);

      if (!codeName || isNaN(days) || days <= 0 || isNaN(totalGB) || totalGB < 0) {
        return bot.sendMessage(
          chatId,
          "❗ โปรดระบุข้อมูลให้ถูกต้อง เช่น `/addclient mycode 30 100`",
          { parse_mode: "Markdown" }
        );
      }

      // แจ้งว่ากำลังสร้างโค้ด
      let creatingMsg;
      try {
        creatingMsg = await bot.sendMessage(chatId, `⏳ กำลังสร้างโค้ด: "${codeName}" ...`);
      } catch (error) {
        console.error("ส่งข้อความแจ้งสถานะไม่สำเร็จ:", error);
        return;
      }

      // ขั้นตอนล็อกอิน
      const loginUrl = 'http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/login'; // URL สำหรับล็อกอิน
      const loginData = {
        username: 'WYEXPRkCKL', // แทนที่ด้วยชื่อผู้ใช้จริง
        password: 'nfEpAlava1', // แทนที่ด้วยรหัสผ่านจริง
      };

      try {
        const loginResponse = await axios.post(loginUrl, new URLSearchParams(loginData), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        if (!loginResponse.data.success) {
          throw new Error(`ล็อกอินล้มเหลว: ${loginResponse.data.msg}`);
        }
        console.log('✅ ล็อกอินสำเร็จ');

        // ขั้นตอนสร้างโค้ด
        const addClientUrl = 'http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/panel/api/inbounds/addClient'; // URL สำหรับเพิ่มลูกค้า
        const uuid = uuidv4();
        const expiryTime = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;

        const clientData = {
          id: 3, // ปรับตามระบบของคุณ
          settings: JSON.stringify({
            clients: [
              {
                id: uuid,
                flow: '',
                email: codeName,
                limitIp: 2,
                totalGB: totalGB > 0 ? totalGB * 1024 * 1024 * 1024 : 0, // แปลง GB เป็น Bytes
                expiryTime: expiryTime,
                enable: true,
                tgId: '',
                subId: '2rv0gb458kbfl532',
                reset: 0,
              },
            ],
          }),
        };

        const addClientResponse = await axios.post(addClientUrl, clientData, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!addClientResponse.data.success) {
          throw new Error(`สร้างโค้ดล้มเหลว: ${addClientResponse.data.msg}`);
        }

        const clientCode = `vless://${uuid}@localhost:443?type=ws&path=/&host=localhost&security=none#${encodeURIComponent(
          codeName
        )}`;
        console.log('✅ สร้างโค้ดสำเร็จ:', clientCode);

        // ลบข้อความ "กำลังสร้างโค้ด"
        if (creatingMsg) {
          await bot.deleteMessage(chatId, creatingMsg.message_id);
        }

        // ส่งโค้ดให้ผู้ใช้
        bot.sendMessage(
          chatId,
          `✅ *สร้างโค้ดสำเร็จ!*\n\n📬 โค้ดของคุณ:\n\`${clientCode}\`\n\n📅 วันหมดอายุ: ${days} วัน\n💾 ข้อมูล: ${totalGB} GB`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);

        // ลบข้อความ "กำลังสร้างโค้ด"
        if (creatingMsg) {
          try {
            await bot.deleteMessage(chatId, creatingMsg.message_id);
          } catch (err) {
            console.error('ลบข้อความกำลังสร้างโค้ดไม่สำเร็จ:', err.message);
          }
        }

        bot.sendMessage(chatId, `❌ เกิดข้อผิดพลาด: ${error.message}`);
      }
    });
  },
};
