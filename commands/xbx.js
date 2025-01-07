const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // ใช้สำหรับแรนดอม UUID

module.exports = {
  name: 'สร้างโค้ด',
  description: 'ล็อกอินและสร้างโค้ด V2Ray',
  execute(bot) {
    bot.onText(/\/สร้างโค้ด/, async (msg) => {
      const chatId = msg.chat.id;

      // ข้อมูลล็อกอิน
      const loginUrl = "http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/login";
      const username = "WYEXPRkCKL"; // ชื่อผู้ใช้
      const password = "nfEpAlava1"; // รหัสผ่าน

      // ข้อมูล API สร้างโค้ด
      const apiUrl = "http://creators.trueid.net.vipv2boxth.xyz:2053/13RpDPnN59mBvxd/panel/api/inbounds/addClient";
      const id = 2; // ID ห้ามเปลี่ยน

      // แจ้งผู้ใช้ว่ากำลังล็อกอิน
      bot.sendMessage(chatId, "🔄 กำลังล็อกอิน...");

      try {
        // ล็อกอินก่อน
        const loginResponse = await axios.post(loginUrl, { username, password });
        const loginData = loginResponse.data;

        if (loginData.success) {
          bot.sendMessage(chatId, "✅ ล็อกอินสำเร็จ! กำลังสร้างโค้ด V2Ray...");

          // แรนดอมค่าที่ต้องใช้
          const email = `user-${Math.random().toString(36).substring(2, 10)}@example.com`; // สุ่ม email
          const subId = uuidv4(); // แรนดอม subId
          const clientId = uuidv4(); // แรนดอม client ID

          // ข้อมูล JSON สำหรับ API สร้างโค้ด
          const requestData = {
            id: id,
            settings: JSON.stringify({
              clients: [
                {
                  id: clientId,
                  flow: "",
                  email: email,
                  limitIp: 0,
                  totalGB: 10, // กำหนด Total GB เป็น 10 เพื่อให้ไม่เป็น 0
                  expiryTime: Date.now() + 30 * 24 * 60 * 60 * 1000, // ระบุวันหมดอายุ (30 วันนับจากปัจจุบัน)
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

          // ส่งคำขอสร้างโค้ด
          const createResponse = await axios.post(apiUrl, requestData, {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          });

          console.log("API Response:", createResponse.data);

          if (createResponse.data.success) {
            bot.sendMessage(
              chatId,
              `✅ โค้ดสร้างสำเร็จ!\n\n📜 รายละเอียดโค้ด:\n- Client ID: ${clientId}\n- Email: ${email}\n- Sub ID: ${subId}\n\n📩 ข้อความจากเซิร์ฟเวอร์: ${createResponse.data.msg}`
            );
          } else {
            bot.sendMessage(chatId, `❌ การสร้างโค้ดล้มเหลว: ${createResponse.data.msg}`);
          }
        } else {
          bot.sendMessage(chatId, `❌ ล็อกอินไม่สำเร็จ: ${loginData.msg}`);
        }
      } catch (error) {
        // ตรวจสอบข้อผิดพลาด
        if (error.response) {
          console.error("Response Error:", error.response.data);
          bot.sendMessage(
            chatId,
            `❌ ข้อผิดพลาดจากเซิร์ฟเวอร์: ${JSON.stringify(error.response.data, null, 2)}`
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
