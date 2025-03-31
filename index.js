// index.js

/***********************************************
 * index.js
 * Telegram Bot Manager with Advanced Web Interface
 ***********************************************/

const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');

// อ่านข้อมูลโทเค่นจาก dld.json
const dldPath = path.join(__dirname, 'dld.json');
if (!fs.existsSync(dldPath)) {
  fs.writeFileSync(dldPath, JSON.stringify({ bots: [] }, null, 2));
}
let dldData = JSON.parse(fs.readFileSync(dldPath, 'utf8'));

// สร้างแอป Express
const app = express();
const PORT = 3111;

// ใช้ body-parser สำหรับประมวลผลข้อมูลจากฟอร์ม
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// สร้าง Collection สำหรับเก็บบอททั้งหมด
const bots = new Map();

// ฟังก์ชันสำหรับบันทึกข้อมูลบอทลงใน dld.json
function saveBots() {
  fs.writeFileSync(dldPath, JSON.stringify({ bots: dldData.bots }, null, 2));
}

// ฟังก์ชันสำหรับโหลดคำสั่งจากโฟลเดอร์ `commands`
const commandsPath = path.join(__dirname, 'commands');
const commands = [];

fs.readdirSync(commandsPath).forEach((file) => {
  if (file.endsWith('.js')) {
    const command = require(path.join(commandsPath, file));
    if (command.name && typeof command.execute === 'function') {
      commands.push(command);
    } else {
      console.warn(`⚠️ ไฟล์ ${file} ไม่มีโครงสร้างคำสั่งที่ถูกต้อง`);
    }
  }
});

// ฟังก์ชันสำหรับสร้างและเริ่มบอทใหม่
function createBot(botData) {
  const { name, token } = botData;
  if (!name || !token) {
    console.error(`❌ ข้อมูลบอทไม่ครบถ้วน: name="${name}", token="${token}"`);
    return;
  }

  try {
    const bot = new TelegramBot(token, { polling: true });

    // จัดการข้อผิดพลาดในการ polling
    bot.on('polling_error', (err) => {
      console.error(`⚠️ เกิดข้อผิดพลาดในการ polling ของ Telegram บอท "${name}":`, err);
    });

    console.log(`🤖 บอท "${name}" กำลังทำงานอยู่...`);

    // โหลดคำสั่งทั้งหมด
    commands.forEach((command) => {
      command.execute(bot);
      bot.commands = bot.commands || [];
      bot.commands.push(command);
    });

    // จัดการข้อความที่ไม่ใช่คำสั่ง
    bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      let text = msg.text || "";

      if (text.startsWith('/')) {
        let command = text.split(' ')[0];
        if (command.includes('@')) {
          command = command.split('@')[0];
        }

        if (!commands.some(cmd => `/${cmd.name}` === command)) {
          bot.sendMessage(
            chatId,
            "❗️ กรุณาพิมพ์คำสั่งให้ถูกต้อง หรือพิมพ์ /commands 📜 เพื่อดูรายการคำสั่งที่สามารถใช้ได้"
          );
          return;
        }
        // คำสั่งถูกต้อง จะถูกจัดการในคำสั่งที่กำหนดไว้
      } else {
        // จัดการข้อความที่ไม่ใช่คำสั่ง ถ้าต้องการ
      }
    });

    bots.set(name, bot);
  } catch (error) {
    console.error(`❌ ไม่สามารถสร้างบอท "${name}" ด้วย Token: ${token}. โปรดตรวจสอบ Token อีกครั้ง.`);
  }
}

// โหลดบอทที่มีอยู่ใน dld.json เมื่อเริ่มต้น
dldData.bots.forEach((botData) => {
  createBot(botData);
});

// Routes สำหรับเว็บอินเตอร์เฟซ

// หน้าแรก แสดงรายการบอททั้งหมด
app.get('/', (req, res) => {
  const botList = dldData.bots.map(bot => bot.name);
  res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>จัดการ Telegram Bots</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <!-- Google Fonts -->
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
      <!-- Bootstrap CSS -->
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <!-- Font Awesome -->
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
      <style>
        body {
          font-family: 'Roboto', sans-serif;
          background-color: #f0f2f5;
        }
        .navbar {
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .card {
          border: none;
          border-radius: 15px;
          transition: transform 0.2s;
        }
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }
        .btn-custom {
          background-color: #4e73df;
          color: #fff;
        }
        .btn-custom:hover {
          background-color: #2e59d9;
          color: #fff;
        }
        .footer {
          position: fixed;
          bottom: 0;
          width: 100%;
          height: 60px;
          background-color: #343a40;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .text-truncate {
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>
    </head>
    <body>
      <!-- Navbar -->
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container-fluid">
          <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                  aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>
      </nav>

      <!-- Main Content -->
      <div class="container my-5">
        <h1 class="mb-4 text-center"><i class="fa-solid fa-robot"></i> Telegram Bot Manager</h1>
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h3>บอทที่กำลังทำงานอยู่</h3>
          <a href="/add-bot" class="btn btn-custom"><i class="fa-solid fa-plus me-2"></i> เพิ่มบอทใหม่</a>
        </div>
        ${botList.length === 0 ? `
          <div class="alert alert-info text-center" role="alert">
            ไม่มีบอทที่กำลังทำงานอยู่
          </div>
        ` : `
          <div class="row">
            ${botList.map(name => `
              <div class="col-lg-4 col-md-6 mb-4">
                <div class="card h-100">
                  <div class="card-body d-flex flex-column">
                    <h5 class="card-title"><i class="fa-solid fa-user-robot me-2"></i> ${name}</h5>
                    <div class="mt-auto">
                      <a href="/bots/${encodeURIComponent(name)}" class="btn btn-secondary me-2"><i class="fa-solid fa-eye me-1"></i> ดูคำสั่ง</a>
                      <a href="/bots/${encodeURIComponent(name)}/delete" class="btn btn-danger"><i class="fa-solid fa-trash me-1"></i> ลบบอท</a>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Footer -->
      <div class="footer">
        <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
      </div>

      <!-- Bootstrap JS -->
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>
  `);
});

// หน้าเพิ่มบอทใหม่
app.get('/add-bot', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>เพิ่ม Telegram Bot</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <!-- Google Fonts -->
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
      <!-- Bootstrap CSS -->
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <!-- Font Awesome -->
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
      <style>
        body {
          font-family: 'Roboto', sans-serif;
          background-color: #f0f2f5;
        }
        .navbar {
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .container {
          margin-top: 50px;
          max-width: 600px;
          background-color: #fff;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        .btn-custom {
          background-color: #28a745;
          color: #fff;
        }
        .btn-custom:hover {
          background-color: #218838;
          color: #fff;
        }
        .footer {
          position: fixed;
          bottom: 0;
          width: 100%;
          height: 60px;
          background-color: #343a40;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
    </head>
    <body>
      <!-- Navbar -->
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container-fluid">
          <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                  aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>
      </nav>

      <!-- Add Bot Form -->
      <div class="container">
        <h2 class="mb-4 text-center"><i class="fa-solid fa-plus me-2"></i> เพิ่ม Telegram Bot ใหม่</h2>
        <form action="/add-bot" method="POST">
          <div class="mb-3">
            <label for="name" class="form-label">ชื่อบอท:</label>
            <input type="text" class="form-control" id="name" name="name" placeholder="กรอกชื่อบอท" required>
            <div class="form-text">ชื่อบอทนี้จะแสดงในเว็บอินเตอร์เฟซของคุณ</div>
          </div>
          <div class="mb-3">
            <label for="token" class="form-label">Token ของบอท:</label>
            <input type="text" class="form-control" id="token" name="token" placeholder="กรอก Token ของบอท" required>
            <div class="form-text">คุณสามารถรับ Token ได้จาก <a href="https://t.me/BotFather" target="_blank">@BotFather</a> บน Telegram</div>
          </div>
          <button type="submit" class="btn btn-custom w-100"><i class="fa-solid fa-check me-2"></i> เพิ่มบอท</button>
          <a href="/" class="btn btn-secondary w-100 mt-2"><i class="fa-solid fa-arrow-left me-2"></i> กลับไปหน้าหลัก</a>
        </form>
      </div>

      <!-- Footer -->
      <div class="footer">
        <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
      </div>

      <!-- Bootstrap JS -->
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>
  `);
});

// ประมวลผลการเพิ่มบอทใหม่
app.post('/add-bot', (req, res) => {
  const { name, token } = req.body;
  if (name && token && !dldData.bots.some(bot => bot.name === name)) {
    // สร้างรหัสผ่าน 6 หลัก
    const password = Math.floor(100000 + Math.random() * 900000).toString();

    const newBot = { name, token, password };
    createBot(newBot);
    dldData.bots.push(newBot);
    saveBots();

    // แสดงรหัสผ่านให้ผู้ใช้
    res.send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>เพิ่ม Telegram Bot สำเร็จ</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            max-width: 600px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
          }
          .btn-custom {
            background-color: #28a745;
            color: #fff;
          }
          .btn-custom:hover {
            background-color: #218838;
            color: #fff;
          }
          .password-box {
            font-size: 1.5rem;
            font-weight: bold;
            color: #dc3545;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- Success Message -->
        <div class="container">
          <div class="alert alert-success text-center" role="alert">
            <i class="fa-solid fa-check-circle me-2"></i> เพิ่มบอท "${name}" สำเร็จ!
          </div>
          <p class="text-center">รหัสผ่านสำหรับลบบอทนี้คือ:</p>
          <p class="text-center password-box">${password}</p>
          <p class="text-center text-muted">กรุณาบันทึกรหัสผ่านนี้ไว้ เพราะคุณจะต้องใช้เมื่อคุณต้องการลบบอทนี้</p>
          <a href="/" class="btn btn-secondary w-100 mt-3"><i class="fa-solid fa-home me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>เพิ่ม Telegram Bot ไม่สำเร็จ</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            max-width: 600px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
          }
          .btn-custom {
            background-color: #28a745;
            color: #fff;
          }
          .btn-custom:hover {
            background-color: #218838;
            color: #fff;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- Error Message -->
        <div class="container">
          <div class="alert alert-danger text-center" role="alert">
            <i class="fa-solid fa-triangle-exclamation me-2"></i> ชื่อบอทไม่ถูกต้องหรือบอทนี้มีอยู่แล้ว.
          </div>
          <a href="/add-bot" class="btn btn-primary w-100"><i class="fa-solid fa-arrow-left me-2"></i> กลับไปเพิ่มบอทใหม่</a>
          <a href="/" class="btn btn-secondary w-100 mt-2"><i class="fa-solid fa-home me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  }
});

// หน้าแสดงรหัสผ่านของบอท
app.get('/bots/:name/password', (req, res) => {
  const { name } = req.params;
  const bot = dldData.bots.find(b => b.name === name);
  if (bot) {
    res.send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>รหัสผ่านของบอท</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            max-width: 600px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            text-align: center;
          }
          .password-box {
            font-size: 1.5rem;
            font-weight: bold;
            color: #dc3545;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- Password Display -->
        <div class="container">
          <div class="alert alert-success text-center" role="alert">
            <i class="fa-solid fa-check-circle me-2"></i> เพิ่มบอท "${name}" สำเร็จ!
          </div>
          <p class="text-center">รหัสผ่านสำหรับลบบอทนี้คือ:</p>
          <p class="text-center password-box">${bot.password}</p>
          <p class="text-center text-muted">กรุณาบันทึกรหัสผ่านนี้ไว้ เพราะคุณจะต้องใช้เมื่อคุณต้องการลบบอทนี้</p>
          <a href="/" class="btn btn-secondary w-100 mt-3"><i class="fa-solid fa-arrow-left me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ไม่พบบอท</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            text-align: center;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- 404 Error Message -->
        <div class="container">
          <div class="alert alert-danger" role="alert">
            <i class="fa-solid fa-triangle-exclamation me-2"></i> ไม่พบบอทนี้.
          </div>
          <a href="/" class="btn btn-primary"><i class="fa-solid fa-home me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  }
});

// หน้าแสดงรายละเอียดบอท รวมถึงคำสั่งทั้งหมด
app.get('/bots/:name', (req, res) => {
  const { name } = req.params;
  const bot = dldData.bots.find(b => b.name === name);
  if (bot) {
    const botCommands = commands.map(cmd => ({ name: `/${cmd.name}`, description: cmd.description }));
    res.send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>รายละเอียดของบอท</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
          }
          .btn-custom {
            background-color: #17a2b8;
            color: #fff;
          }
          .btn-custom:hover {
            background-color: #138496;
            color: #fff;
          }
          code {
            background-color: #e9ecef;
            padding: 2px 4px;
            border-radius: 4px;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- Bot Details -->
        <div class="container">
          <h2 class="mb-4 text-center"><i class="fa-solid fa-robot me-2"></i> รายละเอียดของบอท "${name}"</h2>
          <div class="card mb-4">
            <div class="card-body">
              <h5 class="card-title"><i class="fa-solid fa-key me-2"></i> Token:</h5>
              <p class="card-text"><code>***hidden***</code></p>
            </div>
          </div>
          <h3 class="mb-3"><i class="fa-solid fa-list me-2"></i> คำสั่งทั้งหมด</h3>
          ${botCommands.length === 0 ? `
            <div class="alert alert-info text-center" role="alert">
              ไม่มีคำสั่งที่กำหนดไว้
            </div>
          ` : `
            <div class="table-responsive">
              <table class="table table-hover">
                <thead class="table-dark">
                  <tr>
                    <th scope="col"><i class="fa-solid fa-code me-2"></i> คำสั่ง</th>
                    <th scope="col"><i class="fa-solid fa-info-circle me-2"></i> คำอธิบาย</th>
                  </tr>
                </thead>
                <tbody>
                  ${botCommands.map(cmd => `
                    <tr>
                      <td><code>${cmd.name}</code></td>
                      <td>${cmd.description}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
          <a href="/" class="btn btn-secondary mt-3"><i class="fa-solid fa-arrow-left me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ไม่พบบอท</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            text-align: center;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- 404 Error Message -->
        <div class="container">
          <div class="alert alert-danger" role="alert">
            <i class="fa-solid fa-triangle-exclamation me-2"></i> ไม่พบบอทนี้.
          </div>
          <a href="/" class="btn btn-primary"><i class="fa-solid fa-home me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  }
});

// หน้าแสดงรหัสผ่านของบอท
app.get('/bots/:name/password', (req, res) => {
  const { name } = req.params;
  const bot = dldData.bots.find(b => b.name === name);
  if (bot) {
    res.send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>รหัสผ่านของบอท</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            max-width: 600px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            text-align: center;
          }
          .password-box {
            font-size: 1.5rem;
            font-weight: bold;
            color: #dc3545;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- Password Display -->
        <div class="container">
          <div class="alert alert-success text-center" role="alert">
            <i class="fa-solid fa-check-circle me-2"></i> เพิ่มบอท "${name}" สำเร็จ!
          </div>
          <p class="text-center">รหัสผ่านสำหรับลบบอทนี้คือ:</p>
          <p class="text-center password-box">${bot.password}</p>
          <p class="text-center text-muted">กรุณาบันทึกรหัสผ่านนี้ไว้ เพราะคุณจะต้องใช้เมื่อคุณต้องการลบบอทนี้</p>
          <a href="/" class="btn btn-secondary w-100 mt-3"><i class="fa-solid fa-arrow-left me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ไม่พบบอท</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            text-align: center;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- 404 Error Message -->
        <div class="container">
          <div class="alert alert-danger" role="alert">
            <i class="fa-solid fa-triangle-exclamation me-2"></i> ไม่พบบอทนี้.
          </div>
          <a href="/" class="btn btn-primary"><i class="fa-solid fa-home me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  }
});

// หน้าแสดงแบบฟอร์มลบบอท พร้อมระบุรหัสผ่าน
app.get('/bots/:name/delete', (req, res) => {
  const { name } = req.params;
  const bot = dldData.bots.find(b => b.name === name);
  if (bot) {
    res.send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ลบบอท "${name}"</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            max-width: 600px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
          }
          .btn-custom {
            background-color: #dc3545;
            color: #fff;
          }
          .btn-custom:hover {
            background-color: #c82333;
            color: #fff;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- Delete Bot Form -->
        <div class="container">
          <h2 class="mb-4 text-center"><i class="fa-solid fa-trash me-2"></i> ลบบอท "${name}"</h2>
          <form action="/bots/${encodeURIComponent(name)}/delete" method="POST">
            <div class="mb-3">
              <label for="password" class="form-label">รหัสผ่าน:</label>
              <input type="text" class="form-control" id="password" name="password" placeholder="กรอกรหัสผ่าน 6 หลัก" required pattern="\\d{6}" title="กรุณากรอกรหัสผ่าน 6 หลักที่ประกอบด้วยตัวเลขเท่านั้น">
            </div>
            <button type="submit" class="btn btn-custom w-100"><i class="fa-solid fa-trash me-2"></i> ลบบอท</button>
            <a href="/" class="btn btn-secondary w-100 mt-2"><i class="fa-solid fa-arrow-left me-2"></i> กลับไปหน้าหลัก</a>
          </form>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ไม่พบบอท</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            text-align: center;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- 404 Error Message -->
        <div class="container">
          <div class="alert alert-danger" role="alert">
            <i class="fa-solid fa-triangle-exclamation me-2"></i> ไม่พบบอทนี้.
          </div>
          <a href="/" class="btn btn-primary"><i class="fa-solid fa-home me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  }
});

// ประมวลผลการลบบอทใหม่
app.post('/bots/:name/delete', (req, res) => {
  const { name } = req.params;
  const { password } = req.body;
  const botIndex = dldData.bots.findIndex(b => b.name === name);

  if (botIndex !== -1) {
    const bot = dldData.bots[botIndex];
    if (bot.password === password) {
      // หยุด polling ของบอท
      const activeBot = bots.get(name);
      if (activeBot) {
        activeBot.stopPolling();
        bots.delete(name);
      }

      // ลบบอทออกจาก dld.json
      dldData.bots.splice(botIndex, 1);
      saveBots();

      res.send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <title>ลบบอทสำเร็จ</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <!-- Google Fonts -->
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
          <!-- Bootstrap CSS -->
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <!-- Font Awesome -->
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
          <style>
            body {
              font-family: 'Roboto', sans-serif;
              background-color: #f0f2f5;
            }
            .navbar {
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .container {
              margin-top: 50px;
              max-width: 600px;
              background-color: #fff;
              padding: 30px;
              border-radius: 15px;
              box-shadow: 0 8px 16px rgba(0,0,0,0.1);
              text-align: center;
            }
            .btn-custom {
              background-color: #28a745;
              color: #fff;
            }
            .btn-custom:hover {
              background-color: #218838;
              color: #fff;
            }
            .footer {
              position: fixed;
              bottom: 0;
              width: 100%;
              height: 60px;
              background-color: #343a40;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          <!-- Navbar -->
          <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
            <div class="container-fluid">
              <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
              <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                      aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
              </button>
            </div>
          </nav>

          <!-- Success Message -->
          <div class="container">
            <div class="alert alert-success text-center" role="alert">
              <i class="fa-solid fa-check-circle me-2"></i> ลบบอท "${name}" สำเร็จ!
            </div>
            <a href="/" class="btn btn-secondary w-100 mt-3"><i class="fa-solid fa-arrow-left me-2"></i> กลับไปหน้าหลัก</a>
          </div>

          <!-- Footer -->
          <div class="footer">
            <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
          </div>

          <!-- Bootstrap JS -->
          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        </body>
        </html>
      `);
    } else {
      // รหัสผ่านไม่ถูกต้อง
      res.send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <title>ลบบอทไม่สำเร็จ</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <!-- Google Fonts -->
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
          <!-- Bootstrap CSS -->
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <!-- Font Awesome -->
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
          <style>
            body {
              font-family: 'Roboto', sans-serif;
              background-color: #f0f2f5;
            }
            .navbar {
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .container {
              margin-top: 50px;
              max-width: 600px;
              background-color: #fff;
              padding: 30px;
              border-radius: 15px;
              box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            }
            .btn-custom {
              background-color: #dc3545;
              color: #fff;
            }
            .btn-custom:hover {
              background-color: #c82333;
              color: #fff;
            }
            .footer {
              position: fixed;
              bottom: 0;
              width: 100%;
              height: 60px;
              background-color: #343a40;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          <!-- Navbar -->
          <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
            <div class="container-fluid">
              <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
              <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                      aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
              </button>
            </div>
          </nav>

          <!-- Error Message -->
          <div class="container">
            <div class="alert alert-danger text-center" role="alert">
              <i class="fa-solid fa-triangle-exclamation me-2"></i> รหัสผ่านไม่ถูกต้อง. กรุณาลองใหม่อีกครั้ง.
            </div>
            <a href="/bots/${encodeURIComponent(name)}/delete" class="btn btn-custom w-100"><i class="fa-solid fa-key me-2"></i> ลบบอท</a>
            <a href="/" class="btn btn-secondary w-100 mt-2"><i class="fa-solid fa-home me-2"></i> กลับไปหน้าหลัก</a>
          </div>

          <!-- Footer -->
          <div class="footer">
            <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
          </div>

          <!-- Bootstrap JS -->
          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        </body>
        </html>
      `);
    }
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ไม่พบบอท</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            text-align: center;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- 404 Error Message -->
        <div class="container">
          <div class="alert alert-danger" role="alert">
            <i class="fa-solid fa-triangle-exclamation me-2"></i> ไม่พบบอทนี้.
          </div>
          <a href="/" class="btn btn-primary"><i class="fa-solid fa-home me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  }
});

// ลบบอท
app.post('/bots/:name/delete', (req, res) => {
  const { name } = req.params;
  const { password } = req.body;
  const botIndex = dldData.bots.findIndex(b => b.name === name);

  if (botIndex !== -1) {
    const bot = dldData.bots[botIndex];
    if (bot.password === password) {
      // หยุด polling ของบอท
      const activeBot = bots.get(name);
      if (activeBot) {
        activeBot.stopPolling();
        bots.delete(name);
      }

      // ลบบอทออกจาก dld.json
      dldData.bots.splice(botIndex, 1);
      saveBots();

      res.send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <title>ลบบอทสำเร็จ</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <!-- Google Fonts -->
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
          <!-- Bootstrap CSS -->
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <!-- Font Awesome -->
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
          <style>
            body {
              font-family: 'Roboto', sans-serif;
              background-color: #f0f2f5;
            }
            .navbar {
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .container {
              margin-top: 50px;
              max-width: 600px;
              background-color: #fff;
              padding: 30px;
              border-radius: 15px;
              box-shadow: 0 8px 16px rgba(0,0,0,0.1);
              text-align: center;
            }
            .btn-custom {
              background-color: #28a745;
              color: #fff;
            }
            .btn-custom:hover {
              background-color: #218838;
              color: #fff;
            }
            .footer {
              position: fixed;
              bottom: 0;
              width: 100%;
              height: 60px;
              background-color: #343a40;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          <!-- Navbar -->
          <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
            <div class="container-fluid">
              <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
              <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                      aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
              </button>
            </div>
          </nav>

          <!-- Success Message -->
          <div class="container">
            <div class="alert alert-success text-center" role="alert">
              <i class="fa-solid fa-check-circle me-2"></i> ลบบอท "${name}" สำเร็จ!
            </div>
            <a href="/" class="btn btn-secondary w-100 mt-3"><i class="fa-solid fa-arrow-left me-2"></i> กลับไปหน้าหลัก</a>
          </div>

          <!-- Footer -->
          <div class="footer">
            <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
          </div>

          <!-- Bootstrap JS -->
          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        </body>
        </html>
      `);
    } else {
      // รหัสผ่านไม่ถูกต้อง
      res.send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <title>ลบบอทไม่สำเร็จ</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <!-- Google Fonts -->
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
          <!-- Bootstrap CSS -->
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <!-- Font Awesome -->
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
          <style>
            body {
              font-family: 'Roboto', sans-serif;
              background-color: #f0f2f5;
            }
            .navbar {
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .container {
              margin-top: 50px;
              max-width: 600px;
              background-color: #fff;
              padding: 30px;
              border-radius: 15px;
              box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            }
            .btn-custom {
              background-color: #dc3545;
              color: #fff;
            }
            .btn-custom:hover {
              background-color: #c82333;
              color: #fff;
            }
            .footer {
              position: fixed;
              bottom: 0;
              width: 100%;
              height: 60px;
              background-color: #343a40;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          <!-- Navbar -->
          <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
            <div class="container-fluid">
              <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
              <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                      aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
              </button>
            </div>
          </nav>

          <!-- Error Message -->
          <div class="container">
            <div class="alert alert-danger text-center" role="alert">
              <i class="fa-solid fa-triangle-exclamation me-2"></i> รหัสผ่านไม่ถูกต้อง. กรุณาลองใหม่อีกครั้ง.
            </div>
            <a href="/bots/${encodeURIComponent(name)}/delete" class="btn btn-custom w-100"><i class="fa-solid fa-key me-2"></i> ลบบอท</a>
            <a href="/" class="btn btn-secondary w-100 mt-2"><i class="fa-solid fa-home me-2"></i> กลับไปหน้าหลัก</a>
          </div>

          <!-- Footer -->
          <div class="footer">
            <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
          </div>

          <!-- Bootstrap JS -->
          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        </body>
        </html>
      `);
    }
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ไม่พบบอท</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            text-align: center;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- 404 Error Message -->
        <div class="container">
          <div class="alert alert-danger" role="alert">
            <i class="fa-solid fa-triangle-exclamation me-2"></i> ไม่พบบอทนี้.
          </div>
          <a href="/" class="btn btn-primary"><i class="fa-solid fa-home me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  }
});

// หน้าแสดงรหัสผ่านของบอท
app.get('/bots/:name/password', (req, res) => {
  const { name } = req.params;
  const bot = dldData.bots.find(b => b.name === name);
  if (bot) {
    res.send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>รหัสผ่านของบอท</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            max-width: 600px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            text-align: center;
          }
          .password-box {
            font-size: 1.5rem;
            font-weight: bold;
            color: #dc3545;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- Password Display -->
        <div class="container">
          <div class="alert alert-success text-center" role="alert">
            <i class="fa-solid fa-check-circle me-2"></i> เพิ่มบอท "${name}" สำเร็จ!
          </div>
          <p class="text-center">รหัสผ่านสำหรับลบบอทนี้คือ:</p>
          <p class="text-center password-box">${bot.password}</p>
          <p class="text-center text-muted">กรุณาบันทึกรหัสผ่านนี้ไว้ เพราะคุณจะต้องใช้เมื่อคุณต้องการลบบอทนี้</p>
          <a href="/" class="btn btn-secondary w-100 mt-3"><i class="fa-solid fa-arrow-left me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ไม่พบบอท</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            text-align: center;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- 404 Error Message -->
        <div class="container">
          <div class="alert alert-danger" role="alert">
            <i class="fa-solid fa-triangle-exclamation me-2"></i> ไม่พบบอทนี้.
          </div>
          <a href="/" class="btn btn-primary"><i class="fa-solid fa-home me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  }
});

// ลบบอท
app.post('/bots/:name/delete', (req, res) => {
  const { name } = req.params;
  const { password } = req.body;
  const botIndex = dldData.bots.findIndex(b => b.name === name);

  if (botIndex !== -1) {
    const bot = dldData.bots[botIndex];
    if (bot.password === password) {
      // หยุด polling ของบอท
      const activeBot = bots.get(name);
      if (activeBot) {
        activeBot.stopPolling();
        bots.delete(name);
      }

      // ลบบอทออกจาก dld.json
      dldData.bots.splice(botIndex, 1);
      saveBots();

      res.send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <title>ลบบอทสำเร็จ</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <!-- Google Fonts -->
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
          <!-- Bootstrap CSS -->
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <!-- Font Awesome -->
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
          <style>
            body {
              font-family: 'Roboto', sans-serif;
              background-color: #f0f2f5;
            }
            .navbar {
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .container {
              margin-top: 50px;
              max-width: 600px;
              background-color: #fff;
              padding: 30px;
              border-radius: 15px;
              box-shadow: 0 8px 16px rgba(0,0,0,0.1);
              text-align: center;
            }
            .btn-custom {
              background-color: #28a745;
              color: #fff;
            }
            .btn-custom:hover {
              background-color: #218838;
              color: #fff;
            }
            .footer {
              position: fixed;
              bottom: 0;
              width: 100%;
              height: 60px;
              background-color: #343a40;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          <!-- Navbar -->
          <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
            <div class="container-fluid">
              <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
              <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                      aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
              </button>
            </div>
          </nav>

          <!-- Success Message -->
          <div class="container">
            <div class="alert alert-success text-center" role="alert">
              <i class="fa-solid fa-check-circle me-2"></i> ลบบอท "${name}" สำเร็จ!
            </div>
            <a href="/" class="btn btn-secondary w-100 mt-3"><i class="fa-solid fa-arrow-left me-2"></i> กลับไปหน้าหลัก</a>
          </div>

          <!-- Footer -->
          <div class="footer">
            <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
          </div>

          <!-- Bootstrap JS -->
          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        </body>
        </html>
      `);
    } else {
      // รหัสผ่านไม่ถูกต้อง
      res.send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <title>ลบบอทไม่สำเร็จ</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <!-- Google Fonts -->
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
          <!-- Bootstrap CSS -->
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <!-- Font Awesome -->
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
          <style>
            body {
              font-family: 'Roboto', sans-serif;
              background-color: #f0f2f5;
            }
            .navbar {
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .container {
              margin-top: 50px;
              max-width: 600px;
              background-color: #fff;
              padding: 30px;
              border-radius: 15px;
              box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            }
            .btn-custom {
              background-color: #dc3545;
              color: #fff;
            }
            .btn-custom:hover {
              background-color: #c82333;
              color: #fff;
            }
            .footer {
              position: fixed;
              bottom: 0;
              width: 100%;
              height: 60px;
              background-color: #343a40;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          <!-- Navbar -->
          <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
            <div class="container-fluid">
              <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
              <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                      aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
              </button>
            </div>
          </nav>

          <!-- Error Message -->
          <div class="container">
            <div class="alert alert-danger text-center" role="alert">
              <i class="fa-solid fa-triangle-exclamation me-2"></i> รหัสผ่านไม่ถูกต้อง. กรุณาลองใหม่อีกครั้ง.
            </div>
            <a href="/bots/${encodeURIComponent(name)}/delete" class="btn btn-custom w-100"><i class="fa-solid fa-key me-2"></i> ลบบอท</a>
            <a href="/" class="btn btn-secondary w-100 mt-2"><i class="fa-solid fa-home me-2"></i> กลับไปหน้าหลัก</a>
          </div>

          <!-- Footer -->
          <div class="footer">
            <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
          </div>

          <!-- Bootstrap JS -->
          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        </body>
        </html>
      `);
    }
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ไม่พบบอท</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
          }
          .navbar {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .container {
            margin-top: 50px;
            background-color: #fff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            text-align: center;
          }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 60px;
            background-color: #343a40;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
          <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fa-solid fa-robot me-2"></i>Telegram Bot Manager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>

        <!-- 404 Error Message -->
        <div class="container">
          <div class="alert alert-danger" role="alert">
            <i class="fa-solid fa-triangle-exclamation me-2"></i> ไม่พบบอทนี้.
          </div>
          <a href="/" class="btn btn-primary"><i class="fa-solid fa-home me-2"></i> กลับไปหน้าหลัก</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span>&copy; ${new Date().getFullYear()} Telegram Bot Manager. All rights reserved.</span>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `);
  }
});

// เริ่มเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`🌐 เว็บเซิร์ฟเวอร์กำลังรันที่ http://localhost:${PORT}`);
});
