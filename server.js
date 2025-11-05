import express from "express";
import http from "http";
import { Server } from "socket.io";
import mysql from "mysql2";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { saveScore, getTopScores } from "./scoreService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const wordPacks = {}; // Dùng object để lưu nhiều gói
const packFiles = ["words.json", "words_animals.json", "words_jobs.json"]; // Liệt kê các file pack

packFiles.forEach(file => {
  try {
    const data = fs.readFileSync(path.join(__dirname, file), "utf8");
    const packName = file.replace(".json", ""); // Lấy tên gói (ví dụ: 'words', 'words_animals')
    wordPacks[packName] = JSON.parse(data);
    console.log(`📘 Loaded ${wordPacks[packName].length} words from ${file}`);
  } catch (err) {
    console.error(`⚠️ Cannot read ${file}:`, err);
  }
});

function getRandomWord(packName) {
  // Mặc định dùng gói "words" nếu không tìm thấy
  const pack = wordPacks[packName] || wordPacks["words"]; 

  if (!pack || pack.length === 0) {
    console.error("No words found for pack:", packName);
    // Xử lý lỗi (ví dụ, trả về một từ mặc định)
    return { word: "error", meaning: "lỗi", image: "default.jpg" };
  }
  return pack[Math.floor(Math.random() * pack.length)];
}
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(express.json());

// ======= KẾT NỐI DATABASE =======
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "wordgame"
});

db.connect(err => {
  if (err) console.error("❌ Database error:", err);
  else console.log("✅ Connected to MySQL");
});

// ======= SOCKET IO =======
io.on("connection", socket => {
  console.log("👤 New player connected");

  socket.on("registerPlayer", (data) => {
    // data giờ là object: { name, mode, pack }
    socket.data.playerName = data.name;
    socket.data.score = 0;
    socket.data.gameMode = data.mode || "normal"; // Lưu chế độ
    socket.data.wordPack = data.pack || "words";  // Lưu gói từ
    console.log(`Player ${data.name} registered (Mode: ${data.mode}, Pack: ${data.pack})`);
    
    // Ghi vào database (giữ nguyên)
    db.query(
      "INSERT INTO players (name, score) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?",
      [socket.data.playerName, 0, socket.data.playerName],
      err => {
        if (err) console.error("DB Register error:", err);
      }
    );
    startNewRound(socket);
  });

  // ======= NGƯỜI CHƠI ĐOÁN =======
  socket.on("guessWord", guess => {
    if (!socket.data.currentWord) return;

    // XÁC ĐỊNH ĐÁP ÁN ĐÚNG DỰA THEO CHẾ ĐỘ CHƠI
    let correctAnswer = "";
    if (socket.data.gameMode === "reverse") {
      // Chế độ ngược: Đáp án là TỪ TIẾNG VIỆT
      correctAnswer = socket.data.currentWord.meaning.toLowerCase();
    } else {
      // Chế độ thường: Đáp án là TỪ TIẾNG ANH
      correctAnswer = socket.data.currentWord.word.toLowerCase();
    }

    // SO SÁNH VỚI ĐÁP ÁN ĐÚNG
    if (guess.toLowerCase() === correctAnswer) {
      socket.data.score = (socket.data.score || 0) + 10;

      db.query("UPDATE players SET score = ? WHERE name = ?", [
        socket.data.score,
        socket.data.playerName
      ]);

      io.to(socket.id).emit("correctGuess", {
        word: socket.data.currentWord.word,
        meaning: socket.data.currentWord.meaning,
        score: socket.data.score
      });

      clearInterval(socket.data.timer);
      setTimeout(() => startNewRound(socket), 3000);
    } else {
      io.to(socket.id).emit("wrongGuess");
    }
  });

  // ======= NGƯỜI CHƠI CHƠI LẠI =======
  socket.on("restartGame", (data) => {
    socket.data.gameMode = data.mode || "normal";
    socket.data.wordPack = data.pack || "words";
    startNewRound(socket);
  });

  // ======= NGƯỜI CHƠI THOÁT TAB =======
  socket.on("disconnect", async () => {
    const name = socket.data.playerName;
    const score = socket.data.score || 0;

    if (name) {
      console.log(`👋 ${name} disconnected. Saving score...`);
      await saveScore(name, score);
    }
  });
});
// ======= BẮT ĐẦU VÒNG CHƠI MỚI =======
function startNewRound(socket) {
  const packName = socket.data.wordPack || "words";
  const pack = wordPacks[packName];

  if (!pack || pack.length === 0) {
    socket.emit("message", "⚠️ Không có dữ liệu từ vựng!");
    return;
  }

  // Lấy từ ngẫu nhiên
  const randomWord = pack[Math.floor(Math.random() * pack.length)];
  socket.data.currentWord = randomWord;

  // ======= Thêm phần ảnh minh họa =======
  // Tên file ảnh trùng với từ (vd: cat.jpg, teacher.png)
  // Ảnh nên nằm trong thư mục: public/images/
  const imageFile = `${randomWord.word.toLowerCase()}.jpg`;
  const fs = require("fs");
  const imagePath = `public/images/${imageFile}`;

  // Kiểm tra xem ảnh có tồn tại không, nếu không thì bỏ qua
  const hasImage = fs.existsSync(imagePath);

  // ======= Gửi dữ liệu cho client =======
  io.to(socket.id).emit("newRound", {
    hint:
      socket.data.gameMode === "reverse"
        ? randomWord.word // Chế độ ngược: hiển thị từ tiếng Anh
        : randomWord.meaning, // Chế độ thường: hiển thị nghĩa
    category: packName,
    image: hasImage ? imageFile : null, // chỉ gửi ảnh nếu có
  });

  // ======= Đếm ngược thời gian =======
  let timeLeft = 30;
  socket.emit("timer", timeLeft);

  clearInterval(socket.data.timer);
  socket.data.timer = setInterval(() => {
    timeLeft--;
    socket.emit("timer", timeLeft);

    if (timeLeft <= 0) {
      clearInterval(socket.data.timer);
      io.to(socket.id).emit("roundEnd", {
        word: randomWord.word,
        meaning: randomWord.meaning,
      });

      // Tự bắt đầu vòng mới sau 3s
      setTimeout(() => startNewRound(socket), 3000);
    }
  }, 1000);
}

// ======= KẾT THÚC TRÒ CHƠI =======
async function endGame(socket) {
  const name = socket.data.playerName || "Unknown";
  const score = socket.data.score || 0;

  try {
    // Lưu điểm vào bảng scores
    await saveScore(name, score);

    // Lấy top 10 người chơi
    const topScores = await getTopScores();

    // Gửi kết quả về client
    io.to(socket.id).emit("gameOver", {
      score,
      ranking: topScores
    });

    console.log(`🏁 Game over for ${name}, score: ${score}`);
  } catch (err) {
    console.error("❌ Error ending game:", err);
  }
}
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
