module.exports = {
  name: 'v2ray',
  description: 'แจกโค้ด v2ray โดยให้ผู้ใช้เลือกหมายเลขตามเครือข่าย',
  execute(bot) {
    const activeV2rayRequests = new Map(); // ใช้เก็บสถานะการใช้งานของแต่ละแชท

    // จับคำสั่ง "/v2ray"
    bot.onText(/\/v2ray/, (msg) => {
      try {
        const chatId = msg.chat.id;

        // สร้างรายการชื่อ Server แยกตามเครือข่าย
        const v2rayList = [
          "📋 รายการ v2ray:",
          "",
          "📶 เครือข่าย ทรู (True):",
          "1. Server True A",
          "",
          "📶 เครือข่าย AIS:",
          "2. Server AIS A",
          "",
          "📶 เครือข่าย DTAC:",
          "3. Server DTAC A"
        ];

        // ส่งรายการให้ผู้ใช้
        bot.sendMessage(chatId, v2rayList.join("\n") + "\n\nโปรดตอบกลับด้วยหมายเลขที่คุณต้องการ (1-3)");

        // ตั้งสถานะให้แชทนี้สามารถตอบกลับหมายเลขได้
        activeV2rayRequests.set(chatId, true);

        // ลบสถานะหลังจาก 1 นาที
        setTimeout(() => {
          if (activeV2rayRequests.has(chatId)) {
            activeV2rayRequests.delete(chatId);
            bot.sendMessage(chatId, "⏳ เวลาสำหรับการเลือกหมายเลขหมดอายุแล้ว กรุณาใช้คำสั่ง /v2ray อีกครั้ง");
          }
        }, 60 * 1000); // 1 นาที
      } catch (error) {
        console.error("Error in /v2ray command:", error.message);
      }
    });

    // รับข้อความที่ผู้ใช้ตอบกลับ
    bot.on('message', (msg) => {
      try {
        const chatId = msg.chat.id;

        // หากแชทนี้อยู่ในสถานะรอการตอบกลับหมายเลข
        if (activeV2rayRequests.has(chatId)) {
          const selectedNumber = parseInt(msg.text); // แปลงข้อความที่ผู้ใช้ส่งมาเป็นตัวเลข

          // ตรวจสอบว่าผู้ใช้ส่งหมายเลขที่ถูกต้องหรือไม่ (1-3)
          if (selectedNumber >= 1 && selectedNumber <= 3) {
            // กำหนดโค้ด VLESS ตามหมายเลขที่เลือก
            let v2rayCode;
            if (selectedNumber === 1) {
              v2rayCode = "vless://3715f764-b69f-4960-a350-d798b1668d14@creators.trueid.net:8080?path=%2F&security=none&encryption=none&host=creators.trueid.net.vipv2boxth.xyz&type=ws#True-Server-A";
            } else if (selectedNumber === 2) {
              v2rayCode = "vless://abcd1234-5678-90ef-ghij-klmnopqrstuv@ais-server.net:8080?path=%2F&security=none&encryption=none&host=ais-server.vipv2boxth.xyz&type=ws#AIS-Server-A";
            } else if (selectedNumber === 3) {
              v2rayCode = "vless://wxyz6789-1234-56ab-cdef-ghijklmnopqr@dtac-server.net:8080?path=%2F&security=none&encryption=none&host=dtac-server.vipv2boxth.xyz&type=ws#DTAC-Server-A";
            }

            // ส่งโค้ด VLESS ไปยังผู้ใช้
            bot.sendMessage(chatId, `🔑 โค้ด v2ray สำหรับหมายเลข ${selectedNumber}:\n\n\`\`\`${v2rayCode}\`\`\``);

            // ลบสถานะหลังจากส่งโค้ดเสร็จ
            activeV2rayRequests.delete(chatId);
          } else {
            bot.sendMessage(chatId, "❌ หมายเลขที่คุณเลือกไม่ถูกต้อง กรุณาตอบกลับด้วยหมายเลข 1-3");
          }
        }
      } catch (error) {
        console.error("Error in v2ray response handling:", error.message);
      }
    });
  },
};
