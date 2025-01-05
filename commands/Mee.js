// commands/gpt4o.js

const axios = require('axios');

module.exports = {
  name: 'gpt4o',
  description: 'ใช้ GPT-4o เพื่อสร้างข้อความและภาพตามคำขอของคุณ',
  /**
   * execute ฟังก์ชันที่ถูกเรียกเมื่อคำสั่ง /gpt4o ถูกใช้
   * @param {TelegramBot} bot - instance ของ TelegramBot
   * @param {TelegramBot.Message} msg - ข้อความที่ได้รับจากผู้ใช้
   */
  execute: async (bot, msg) => {
    const chatId = msg.chat.id;
    const args = msg.text.split(' ').slice(1); // แยกคำสั่งและ arguments

    if (args.length === 0) {
      bot.sendMessage(chatId, '❗️ กรุณาระบุคำถามหรือคำขอของคุณหลังคำสั่ง /gpt4o');
      return;
    }

    const query = args.join(' ');

    // ส่งข้อความกำลังประมวลผล
    bot.sendMessage(chatId, '⏳ กำลังประมวลผลคำขอของคุณ...');

    try {
      // ส่งคำขอไปยัง API
      const response = await axios.get('https://kaiz-apis.gleeze.com/api/gpt-4o-pro', {
        params: {
          q: query,
          uid: 1, // คุณสามารถปรับเปลี่ยน UID ตามต้องการ
          imageUrl: '' // ถ้าต้องการสร้างภาพ สามารถเพิ่ม URL หรือพารามิเตอร์อื่นๆ
        }
      });

      // สมมติว่า API ส่งกลับข้อมูลในรูปแบบ { text: '...', imageUrl: '...' }
      const data = response.data;

      if (data.text) {
        bot.sendMessage(chatId, data.text);
      }

      if (data.imageUrl) {
        bot.sendPhoto(chatId, data.imageUrl, { caption: '🖼️ นี่คือภาพที่สร้างขึ้นตามคำขอของคุณ!' });
      }

    } catch (error) {
      console.error('⚠️ เกิดข้อผิดพลาดในการเรียกใช้ API:', error);
      bot.sendMessage(chatId, '⚠️ เกิดข้อผิดพลาดในการประมวลผลคำขอของคุณ กรุณาลองใหม่อีกครั้งในภายหลัง');
    }
  }
};
