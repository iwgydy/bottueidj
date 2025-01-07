const axios = require('axios');

module.exports = {
  name: 'สร้างโค้ด',
  description: 'ล็อกอินและส่งข้อมูลโค้ด V2Ray',
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

        bot.sendMessage(chatId, "✅ ล็อกอินสำเร็จ! กำลังส่งข้อมูล...");

        // JSON ที่จะส่ง
        const requestData = {
          id: 2,
          settings: JSON.stringify({
            clients: [
              {
                id: "bbfad557-28f2-47e5-9f3d-e3c7f532fbda",
                flow: "",
                email: "dp1plmlt8",
                limitIp: 0,
                totalGB: 0,
                expiryTime: 0,
                enable: true,
                tgId: "",
                subId: "2rv0gb458kbfl532",
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
          bot.sendMessage(chatId, `✅ การส่งข้อมูลสำเร็จ!`);
        } else {
          bot.sendMessage(chatId, `❌ การส่งข้อมูลล้มเหลว: ${createData.msg || "Unknown Error"}`);
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
