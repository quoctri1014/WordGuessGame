import express from "express";
import http from "http";
import { Server } from "socket.io";
import db from "./db.js"
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
  // ------------------------------------------------

  // SO SÁNH VỚI ĐÁP ÁN ĐÚNG
  if (guess.toLowerCase() === correctAnswer) {
    // ======== (Phần còn lại giữ nguyên) ========
    socket.data.score = (socket.data.score || 0) + 10;

    db.query("UPDATE players SET score = ? WHERE name = ?", [
      socket.data.score,
      socket.data.playerName // Sửa .name thành .playerName nếu bạn gặp lỗi ở turn trước
    ]);

    io.to(socket.id).emit("correctGuess", {
      word: socket.data.currentWord.word,
      meaning: socket.data.currentWord.meaning,
      score: socket.data.score
    });

    clearInterval(socket.data.timer);

    setTimeout(() => {
      startNewRound(socket);
    }, 3000);
    // ======== (Hết phần giữ nguyên) ========
  } else {
    io.to(socket.id).emit("wrongGuess");
  }
});

  socket.on("restartGame", (data) => {
    // data giờ là object: { mode, pack }
    socket.data.gameMode = data.mode || "normal"; // Cập nhật lại cài đặt
    socket.data.wordPack = data.pack || "words";
    startNewRound(socket);
  });
});
// ======= HÀM BẮT ĐẦU MỖI VÒNG =======
function startNewRound(socket) {
  clearInterval(socket.data?.timer);

  // 1. Lấy từ ngẫu nhiên từ ĐÚNG GÓI TỪ
  const packName = socket.data.wordPack || "words";
  const randomWord = getRandomWord(packName);

  socket.data.currentWord = randomWord;
  socket.data.timeLeft = 30;

  // 2. Xử lý logic CHẾ ĐỘ NGƯỢC
 let targetWord = "";
  if (socket.data.gameMode === "reverse") {
    // Chế độ ngược: Mục tiêu là TỪ TIẾNG VIỆT
    targetWord = randomWord.meaning;
  } else {
    // Chế độ thường: Mục tiêu là TỪ TIẾNG ANH
    targetWord = randomWord.word;
  }

  // TẠO GẠCH NGANG DỰA TRÊN TỪ MỤC TIÊU (Bất kể chế độ nào)
  const displayString = "_ ".repeat(targetWord.length).trim();

  // 3. Gửi 'displayString' xuống client
  io.to(socket.id).emit("newWord", {
    image: randomWord.image,
    display: displayString // Client sẽ nhận 'display' thay vì 'hidden'
  });
  socket.data.timer = setInterval(() => {
    socket.data.timeLeft--;
    io.to(socket.id).emit("timer", socket.data.timeLeft);

    if (socket.data.timeLeft <= 0) {
      clearInterval(socket.data.timer);
      endGame(socket);
    }
  }, 1000);
}

// ======= KẾT THÚC TRÒ CHƠI =======
function endGame(socket) {
  db.query("SELECT name, score FROM players ORDER BY score DESC LIMIT 10", (err, results) => {
    if (err) return console.error(err);
    io.to(socket.id).emit("gameOver", {
      score: socket.data.score || 0,
      ranking: results
    });
  });
}

server.listen(3000, () =>
  console.log("🚀 Server running at http://localhost:3000")
);

