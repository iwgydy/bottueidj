// commands/เจอไนท์.js

const axios = require('axios');
const stringSimilarity = require('string-similarity');

module.exports = {
    name: 'เจอไนท์', // ชื่อคำสั่ง (ไม่ต้องมี /)
    description: 'คุยกับเจอไนท์ในธีมคริสต์มาส 2025 🎄',
    usage: 'เจอไนท์ [ข้อความ] หรือ เจอไนท์ สอน [คำถาม1] = [คำตอบ1] | [คำถาม2] = [คำตอบ2] | ...',
    execute: async (bot, msg) => {
        const start = Date.now();
        const chatId = msg.chat.id;
        const args = msg.text.split(' ').slice(1); // แยกคำสั่งออกจากข้อความ

        if (args.length === 0) {
            return bot.sendMessage(chatId, "🎅 กรุณาพิมพ์คำถามหรือคำสั่งสำหรับเจอไนท์ 🎄");
        }

        const command = args.join(' ').trim();
        const firebaseURL = "https://your-project-id.firebaseio.com/responses.json"; // แทนที่ด้วย URL ของ Firebase ของคุณ

        // ตรวจสอบว่าผู้ใช้ต้องการ "สอน" หรือไม่
        if (command.startsWith('สอน')) {
            const input = command.replace('สอน', '').trim();
            if (!input.includes('=')) {
                return bot.sendMessage(
                    chatId,
                    `🎁 กรุณาพิมพ์ในรูปแบบ:\nเจอไนท์ สอน [คำถาม1] = [คำตอบ1] | [คำถาม2] = [คำตอบ2] 🎀`
                );
            }

            // แยกคำถาม-คำตอบหลายคู่ด้วย "|"
            const pairs = input.split('|').map(pair => pair.trim());
            const dataToSave = {};

            pairs.forEach(pair => {
                const [question, answer] = pair.split('=').map(str => str.trim());
                if (question && answer) {
                    if (!dataToSave[question]) {
                        dataToSave[question] = [];
                    }
                    dataToSave[question].push(answer);
                }
            });

            try {
                // ดึงข้อมูลเดิมจาก Firebase
                const response = await axios.get(firebaseURL);
                const existingData = response.data || {};

                // รวมข้อมูลเก่าและข้อมูลใหม่
                Object.keys(dataToSave).forEach(question => {
                    if (!existingData[question]) {
                        existingData[question] = [];
                    }

                    if (!Array.isArray(existingData[question])) {
                        existingData[question] = [existingData[question]];
                    }

                    // รวมคำตอบใหม่เข้าไป
                    dataToSave[question].forEach(newAnswer => {
                        if (!existingData[question].includes(newAnswer)) {
                            existingData[question].push(newAnswer);
                        }
                    });
                });

                // บันทึกข้อมูลใหม่ลง Firebase
                await axios.put(firebaseURL, existingData);

                const successMessage = Object.keys(dataToSave)
                    .map(q => `🎀 "${q}" = "${dataToSave[q].join(', ')}" 🎁`)
                    .join('\n');

                return bot.sendMessage(
                    chatId,
                    `✅ สอนเจอไนท์สำเร็จ! 🎄\n\nคำถามและคำตอบที่เพิ่ม:\n${successMessage}`
                );
            } catch (error) {
                console.error("❌ เกิดข้อผิดพลาด:", error.message || error);
                return bot.sendMessage(
                    chatId,
                    `❌ ไม่สามารถบันทึกข้อมูลได้ 🎅`
                );
            }
        }

        // หากไม่ใช่คำสั่ง "สอน" ให้ตรวจสอบคำถาม
        try {
            const response = await axios.get(firebaseURL);
            const data = response.data;

            if (data) {
                const questions = Object.keys(data);
                const bestMatch = stringSimilarity.findBestMatch(command, questions);

                if (bestMatch.bestMatch.rating > 0.6) {
                    const matchedQuestion = bestMatch.bestMatch.target;
                    const answers = data[matchedQuestion];

                    const botResponse = Array.isArray(answers)
                        ? answers[Math.floor(Math.random() * answers.length)]
                        : answers;

                    const totalAnswers = Array.isArray(answers) ? answers.length : 1;

                    const end = Date.now();
                    const elapsedTime = ((end - start) / 1000).toFixed(2);

                    return bot.sendMessage(
                        chatId,
                        `⏰ ${elapsedTime} วินาที\n💬 ${totalAnswers} คำตอบ\n\n🎄 *Merry Christmas 2025!*\n🎅 เจอไนท์: ${botResponse}`,
                        { parse_mode: "Markdown" }
                    );
                }
            }

            const end = Date.now();
            const elapsedTime = ((end - start) / 1000).toFixed(2);

            return bot.sendMessage(
                chatId,
                `⏰ ${elapsedTime} วินาที\n💬 0 คำตอบ\n\n🎄 *Merry Christmas 2025!*\n🎅 เจอไนท์: ผมไม่เข้าใจคำนี้ 🎁\n🎀 คุณสามารถสอนผมได้โดยใช้คำสั่ง: "เจอไนท์ สอน [คำถาม] = [คำตอบ]"`
            );
        } catch (error) {
            console.error("❌ เกิดข้อผิดพลาด:", error.message || error);
            return bot.sendMessage(
                chatId,
                `❌ ไม่สามารถติดต่อฐานข้อมูลได้ โปรดลองอีกครั้ง 🎄`
            );
        }
    },
};
