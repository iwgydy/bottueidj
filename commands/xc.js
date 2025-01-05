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
    // สมัครสมาชิก
    bot.onText(/\/สมัคร/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      if (!users[userId]) {
        users[userId] = { cash: 500, balance: 1000 }; // เงินสดเริ่มต้น: 500 บาท, ในธนาคาร: 1000 บาท
        saveUserData();
        bot.sendMessage(chatId, "✅ สมัครธนาคารสำเร็จ!\n💵 เงินสด: 500 บาท\n🏦 ในธนาคาร: 1000 บาท");
      } else {
        bot.sendMessage(chatId, "✅ คุณเป็นสมาชิกธนาคารอยู่แล้ว!");
      }
    });

    // ฝากหรือถอนเงิน
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
          bot.sendMessage(chatId, "❌ เงินในธนาคารไม่เพียงพอ!");
        }
      }
    });
  },
};
