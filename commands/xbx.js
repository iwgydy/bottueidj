const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  name: 'สร้างโค้ด',
  description: 'ล็อกอินและสร้างโค้ด V2Ray',
  execute(bot) {
    bot.onText(/\/สร้างโค้ด/, async (msg) => {
      const chatId = msg.chat.id;

      const loginUrl = "http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/login";
      const apiUrl = "http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/panel/api/inbounds/addClient";

      const username = "WYEXPRkCKL";
      const password = "nfEpAlava1";
      const id = 2;

      bot.sendMessage(chatId, "🔄 กำลังล็อกอิน...");

      try {
        const loginResponse = await axios.post(loginUrl, { username, password });
        if (!loginResponse.data.success) {
          bot.sendMessage(chatId, `❌ ล็อกอินไม่สำเร็จ: ${loginResponse.data.msg}`);
          return;
        }

        bot.sendMessage(chatId, "✅ ล็อกอินสำเร็จ! กำลังสร้างโค้ด V2Ray...");

        const email = `user-${Math.random().toString(36).substring(2, 10)}@example.com`;
        const subId = uuidv4();
        const clientId = uuidv4();
        const expiryTime = Math.floor(Date.now() / 1000) + 60 * 60; // อายุ 1 ชั่วโมง
        const totalGB = 1000; // ลดค่าเพื่อทดสอบ

        const requestData = {
          id: id,
          settings: JSON.stringify({
            clients: [
              {
                id: clientId,
                flow: "",
                email: email,
                limitIp: 0,
                totalGB: totalGB,
                expiryTime: expiryTime,
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
