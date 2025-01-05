const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '../data/users.json');
let users = require(userDataPath);

function saveUserData() {
  fs.writeFileSync(userDataPath, JSON.stringify(users, null, 2));
}

module.exports = {
  name: 'ธนาคาร',
  description: 'จัดการระบบธนาคาร (ฝาก/ถอน)',
  execute(bot) {
    bot.onText(/\/ธนาคาร (ฝาก|ถอน) (\d+)/, (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const action = match[1]; // ฝาก หรือ ถอน
      const amount = parseInt(match[2], 10);

      if (!users[userId]) {
        // หากยังไม่ได้สมัครสมาชิก
        bot.sendMessage(chatId, "❌ คุณยังไม่ได้สมัครธนาคาร กรุณาใช้คำสั่ง /สมัคร เพื่อเริ่มต้น");
        return;
      }

      if (action === 'ฝาก') {
        // การฝากเงิน
        if (users[userId].cash >= amount) {
          users[userId].cash -= amount;
          users[userId].balance += amount;
          saveUserData();
          bot.sendMessage(chatId, `✅ ฝากเงิน ${amount} บาทสำเร็จ!\n💵 เงินสด: ${users[userId].cash} บาท\n🏦 ในธนาคาร: ${users[userId].balance} บาท`);
        } else {
          bot.sendMessage(chatId, "❌ เงินสดในมือไม่เพียงพอ!");
        }
      } else if (action === 'ถอน') {
        // การถอนเงิน
        if (users[userId].balance >= amount) {
          users[userId].balance -= amount;
          users[userId].cash += amount;
          saveUserData();
          bot.sendMessage(chatId, `✅ ถอนเงิน ${amount} บาทสำเร็จ!\n💵 เงินสด: ${users[userId].cash} บาท\n🏦 ในธนาคาร: ${users[userId].balance} บาท`);
        } else {
          bot.sendMessage(chatId, "❌
