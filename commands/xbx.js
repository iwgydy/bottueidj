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
                  totalGB: 0,
                  expiryTime: 0,
                  enable: true,
                  tgId: "",
                  subId: subId,
                  reset: 0,
                },
              ],
            }),
          };

          // ส่งคำขอสร้างโค้ด
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
            bot.sendMessage(chatId, `❌ การสร้างโค้ดล้มเหลว: ${createData.msg}`);
          }
        } else {
          bot.sendMessage(chatId, `❌ ล็อกอินไม่สำเร็จ: ${loginData.msg}`);
        }
      } catch (error) {
        bot.sendMessage(chatId, "❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
        console.error("Error:", error.response ? error.response.data : error.message);
      }
    });
  },
};
