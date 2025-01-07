const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // ใช้สำหรับสุ่ม UUID

module.exports = {
  name: 'สร้างโค้ด',
  description: 'ล็อกอินและสร้างโค้ด V2Ray ด้วย UUID อีเมลและการตั้งค่า 30GB 30 วัน',
  execute(bot) {
    bot.onText(/\/สร้างโค้ด/, async (msg) => {
      const chatId = msg.chat.id;

      // URL สำหรับล็อกอินและส่งข้อมูล
      const loginUrl = "http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/login";
      const apiUrl = "http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/panel/api/inbounds/addClient";

      // ข้อมูลล็อกอิน
      const username = "WYEXPRkCKL"; // ชื่อผู้ใช้
      const password = "nfEpAlava1"; // รหัสผ่าน

      bot.sendMessage(chatId, "🔄 กำลังล็อกอิน...");

      try {
        // ล็อกอิน
        const loginResponse = await axios.post(loginUrl, { username, password });
        if (!loginResponse.data.success) {
          bot.sendMessage(chatId, `❌ ล็อกอินไม่สำเร็จ: ${loginResponse.data.msg}`);
          return;
        }

        bot.sendMessage(chatId, "✅ ล็อกอินสำเร็จ! กำลังสร้างโค้ด...");

        // การตั้งค่า
        const email = `user-${uuidv4()}@example.com`; // สุ่มอีเมลด้วย UUID
        const subId = uuidv4(); // แรนดอม subId
        const clientId = uuidv4(); // แรนดอม client ID
        const expiryTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // อายุ 30 วัน (วินาที)

        const requestData = {
          id: 2, // ID ที่เซิร์ฟเวอร์กำหนด
          settings: JSON.stringify({
            clients: [
              {
                id: clientId,
                flow: "",
                email: email,
                limitIp: 0,
                totalGB: 30, // กำหนด GB เป็น 30GB
                expiryTime: expiryTime, // อายุ 30 วัน
                enable: true,
                tgId: "",
                subId: subId,
                reset: 0,
              },
            ],
          }),
        };

        console.log("Sending request to API...");
        console.log("Request Data:", requestData);

        // ส่งคำขอ
        const createResponse = await axios.post(apiUrl, requestData, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        const createData = createResponse.data;

        if (createData.success) {
          bot.sendMessage(
            chatId,
            `✅ โค้ดสร้างสำเร็จ!\n\n📜 รายละเอียดโค้ด:\n- Client ID: ${clientId}\n- Email: ${email}\n- Sub ID: ${subId}\n\n📩 ข้อความจากเซิร์ฟเวอร์: ${createData.msg}`
          );
        } else {
          bot.sendMessage(chatId, `❌ การสร้างโค้ดล้มเหลว: ${createData.msg || "Unknown Error"}`);
        }
      } catch (error) {
        if (error.response) {
          console.error("Response Error:", error.response.data || "No response data");
          bot.sendMessage(
            chatId,
            `❌ ข้อผิดพลาดจากเซิร์ฟเวอร์: ${JSON.stringify(error.response.data || "No response data", null, 2)}`
          );
        } else if (error.request) {
          console.error("Request Error:", error.request);
          bot.sendMessage(chatId, "❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        } else {
          console.error("Unknown Error:", error.message);
          bot.sendMessage(chatId, `❌ ข้อผิดพลาด: ${error.message}`);
        }
      }
    });
  },
};
