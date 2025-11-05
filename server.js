// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { saveScore, getTopScores } from "./scoreService.js";
import { registerUser, loginUser } from "./authService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(express.json());

// ===== Load Word Packs =====
const wordPacks = {};
const packFiles = ["words.json", "words_animals.json", "words_jobs.json"];
packFiles.forEach(file => {
  try {
    const data = fs.readFileSync(path.join(__dirname, file), "utf8");
    const packName = file.replace(".json", "");
    wordPacks[packName] = JSON.parse(data);
    console.log(`📘 Loaded ${wordPacks[packName].length} words from ${file}`);
  } catch (err) {
    console.error(`⚠️ Cannot read ${file}:`, err);
  }
});

function getRandomWord(packName) {
  const pack = wordPacks[packName] || wordPacks["words"];
  if (!pack || pack.length === 0) return { word: "error", meaning: "lỗi", image: "default.jpg" };
  return pack[Math.floor(Math.random() * pack.length)];
}

// ===== Socket.IO =====
io.on("connection", socket => {
  console.log("👤 New client connected");

  // ===== Đăng ký =====
  socket.on("register", async ({ username, password }) => {
    try {
      const user = await registerUser(username, password);
      socket.emit("registerSuccess", { id: user.id, username: user.username });
    } catch (err) {
      socket.emit("registerError", err.message);
    }
  });

  // ===== Đăng nhập =====
  socket.on("login", async ({ username, password }) => {
    try {
      const user = await loginUser(username, password);
      socket.data.userId = user.id;
      socket.data.username = user.username;
      socket.data.score = 0;
      socket.emit("loginSuccess", { id: user.id, username: user.username });
      startNewRound(socket);
    } catch (err) {
      socket.emit("loginError", err.message);
    }
  });

  // ===== Người chơi đoán =====
  socket.on("guessWord", guess => {
    if (!socket.data.currentWord) return;
    const correct = socket.data.gameMode === "reverse" 
      ? socket.data.currentWord.meaning.toLowerCase()
      : socket.data.currentWord.word.toLowerCase();
    
    if (guess.toLowerCase() === correct) {
      socket.data.score = (socket.data.score || 0) + 10;
      socket.emit("correctGuess", {
        word: socket.data.currentWord.word,
        meaning: socket.data.currentWord.meaning,
        score: socket.data.score
      });
      clearInterval(socket.data.timer);
      setTimeout(() => startNewRound(socket), 1000);
    } else {
      socket.emit("wrongGuess");
    }
  });

  // ===== Chơi lại =====
  socket.on("restartGame", ({ mode, pack }) => {
    socket.data.gameMode = mode || "normal";
    socket.data.wordPack = pack || "words";
    socket.data.score = 0;
    startNewRound(socket);
  });

  // ===== Thoát =====
  socket.on("disconnect", async () => {
    const userId = socket.data.userId;
    const score = socket.data.score || 0;
    if (userId) {
      console.log(`👋 User ${socket.data.username} disconnected. Saving score...`);
      await saveScore(userId, score);
    }
  });
});

// ===== Hàm bắt đầu vòng mới =====
function startNewRound(socket) {
  const packName = socket.data.wordPack || "words";
  const pack = wordPacks[packName];
  if (!pack || pack.length === 0) {
    socket.emit("message", "⚠️ Không có dữ liệu từ vựng!");
    return;
  }

  const word = getRandomWord(packName);
  socket.data.currentWord = word;

  const imageFile = `${word.word.toLowerCase()}.jpg`;
  const imagePath = path.join(__dirname, "public", "images", imageFile);
  const hasImage = fs.existsSync(imagePath);

  socket.emit("newRound", {
    hint: socket.data.gameMode === "reverse" ? word.word : word.meaning,
    category: packName,
    image: hasImage ? imageFile : null
  });

  let timeLeft = 30;
  socket.emit("timer", timeLeft);
  clearInterval(socket.data.timer);

  socket.data.timer = setInterval(() => {
    timeLeft--;
    socket.emit("timer", timeLeft);
    if (timeLeft <= 0) {
      clearInterval(socket.data.timer);
      socket.emit("roundEnd", { word: word.word, meaning: word.meaning });
      setTimeout(() => startNewRound(socket), 1000);
    }
  }, 1000);
}

// ===== Kết thúc game =====
export async function endGame(socket) {
  const userId = socket.data.userId;
  const score = socket.data.score || 0;
  if (!userId) return;
  await saveScore(userId, score);
  const topScores = await getTopScores();
  socket.emit("gameOver", { score, ranking: topScores });
}

const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
