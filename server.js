// server.js (ĐÃ FIX LỖI: RangeError - Không gửi các đối tượng Circular Reference (Timer) qua Socket.IO)
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mysql from "mysql2";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Cấu hình Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// ==========================================================
// KẾT NỐI DATABASE (CHỈ DÙNG CHO USERS)
// ==========================================================
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "wordgame",
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database error (Users):", err.code);
    return;
  }
  console.log("✅ Connected to MySQL database 'wordgame' (for Users).");
});

// ==========================================================
// TỪ VỰNG & GAME STATE (ĐỌC TỪ FILE JSON)
// ==========================================================
let wordPacks = {};
let rooms = [];
let singlePlayerGames = new Map();
let onlineUsers = new Map();
let isDatabaseLoaded = false;

function loadWordsFromDatabase() {
  try {
    // Đảm bảo các file này tồn tại và được đặt cùng thư mục server.js
    const generalData = fs.readFileSync(
      path.join(__dirname, "words.json"),
      "utf8"
    );
    const animalsData = fs.readFileSync(
      path.join(__dirname, "words_animals.json"),
      "utf8"
    );
    const jobsData = fs.readFileSync(
      path.join(__dirname, "words_jobs.json"),
      "utf8"
    );

    wordPacks = {
      general: { name: "Bộ từ chung", words: JSON.parse(generalData) },
      animals: { name: "Động vật", words: JSON.parse(animalsData) },
      jobs: { name: "Nghề nghiệp", words: JSON.parse(jobsData) },
    };

    const totalWords =
      wordPacks.general.words.length +
      wordPacks.animals.words.length +
      wordPacks.jobs.words.length;

    if (totalWords === 0) {
      console.error("❌ LỖI: Các file JSON bị rỗng!");
      isDatabaseLoaded = false;
      return;
    }

    console.log(`✅ Loaded ${totalWords} words from 3 JSON files.`);
    isDatabaseLoaded = true;
  } catch (err) {
    console.error("❌ LỖI NGHIÊM TRỌNG: Không thể đọc file .json.", err);
    isDatabaseLoaded = false;
  }
}

loadWordsFromDatabase();

// ==========================================================
// GAME CORE LOGIC
// ==========================================================
const MAX_ROUNDS = 5; // Chỉ áp dụng cho chơi nhóm
const ROUND_TIME = 30; // 30 GIÂY (áp dụng cho cả chơi đơn và nhóm)

function maskWord(word, guessedLetters) {
  return word
    .split("")
    .map((char) => {
      if (char === " ") return " ";
      const regex = new RegExp(`[${guessedLetters.join("")}]`, "i");
      return regex.test(char) ? char : "_";
    })
    .join(" ");
}

function getNewWord(packKey = "general") {
  const pack = wordPacks[packKey] || wordPacks[Object.keys(wordPacks)[0]];
  if (!pack || pack.words.length === 0) {
    return null;
  }
  const randomWord = pack.words[Math.floor(Math.random() * pack.words.length)];
  return {
    word: randomWord.word,
    meaning: randomWord.meaning,
    image: randomWord.image,
  };
}

// --- Logic Game Multiplayer (Đã sửa lỗi Circular Reference) ---
function startRound(room) {
  const newWordData = getNewWord(room.wordPack);
  if (!newWordData) {
    io.to(room.id).emit("gameError", "Lỗi: Không tìm thấy bộ từ vựng.");
    return endGame(room);
  }

  room.hintImage = newWordData.image.startsWith("http")
    ? newWordData.image
    : `/${newWordData.image}`;
  room.guessedLetters = [];
  room.status = "playing";

  if (room.gameMode === "reverse") {
    room.correctAnswer = newWordData.meaning.toLowerCase();
    room.hintWord = newWordData.word;
  } else {
    room.correctAnswer = newWordData.word.toLowerCase();
    room.hintWord = newWordData.meaning;
  }

  // SỬA LỖI: Tạo đối tượng room an toàn trước khi gửi (Loại bỏ Timer)
  const roomForClient = { ...room };
  delete roomForClient.gameInterval;
  delete roomForClient.roundEndTimer;

  io.to(room.id).emit("roundUpdate", {
    round: room.currentRound,
    maxRounds: room.maxRounds,
    maskedWord: maskWord(room.correctAnswer, room.guessedLetters),
    hintWord: room.hintWord,
    hintImage: room.hintImage,
    room: roomForClient, // Gửi đối tượng đã làm sạch
  });

  room.timeLeft = ROUND_TIME;
  io.to(room.id).emit("timerUpdate", { time: room.timeLeft });
  if (room.gameInterval) clearInterval(room.gameInterval);
  room.gameInterval = setInterval(() => {
    room.timeLeft--;
    io.to(room.id).emit("timerUpdate", { time: room.timeLeft });
    if (room.timeLeft <= 0) {
      endRound(room);
    }
  }, 1000);
}

function endRound(room, solved = false) {
  if (room.gameInterval) clearInterval(room.gameInterval);
  room.status = "ending";

  // SỬA LỖI: Tạo đối tượng room an toàn trước khi gửi (Loại bỏ Timer)
  const roomForClient = { ...room };
  delete roomForClient.gameInterval;
  delete roomForClient.roundEndTimer;

  io.to(room.id).emit("roundEnd", {
    word: room.correctAnswer,
    room: roomForClient, // Gửi đối tượng đã làm sạch
  });

  room.roundEndTimer = setTimeout(() => {
    if (room.currentRound >= MAX_ROUNDS) {
      endGame(room);
    } else {
      room.currentRound++;
      startRound(room);
    }
  }, 5000);
}

function endGame(room) {
  if (room.roundEndTimer) clearTimeout(room.roundEndTimer);
  let winnerPlayer = null;
  room.players.forEach((p) => {
    if (p.score > 0) {
      db.query(
        "UPDATE users SET total_score = total_score + ? WHERE id = ?",
        [p.score, p.id],
        (err) => {
          if (err) console.error("Lỗi cập nhật tổng điểm:", err);
        }
      );
    }
    if (!winnerPlayer || p.score > winnerPlayer.score) {
      winnerPlayer = p;
    }
  });
  let finalUserScore = 0;
  if (winnerPlayer) {
    const userInRoom = room.players.find((p) => p.id === winnerPlayer.id);
    if (userInRoom) {
      finalUserScore = userInRoom.total_score + userInRoom.score;
    }
  }
  io.to(room.id).emit("gameEnd", {
    message: "TRÒ CHƠI KẾT THÚC!",
    ranking: room.players,
    finalUserScore: finalUserScore,
  });
  rooms = rooms.filter((r) => r.id !== room.id);
}

// ==========================================================
// API ROUTES (AUTH) - (Giữ nguyên)
// ==========================================================
app.post("/api/register", async (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password || !displayName) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin." });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO users (username, password, name, total_score) VALUES (?, ?, ?, 0)",
      [username, hashedPassword, displayName],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res
              .status(409)
              .json({ success: false, message: "Tên đăng nhập đã tồn tại." });
          }
          return res
            .status(500)
            .json({ success: false, message: "Lỗi Server DB." });
        }
        res.json({ success: true, message: "Đăng ký thành công." });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi Server nội bộ." });
  }
});
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin." });
  }
  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: "Lỗi Server DB." });
      }
      const user = results[0];
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Tên đăng nhập không tồn tại." });
      }
      try {
        const match = await bcrypt.compare(password, user.password);
        if (match || password === user.password) {
          res.json({
            success: true,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              score: user.total_score || 0,
            },
          });
        } else {
          res
            .status(401)
            .json({ success: false, message: "Mật khẩu không đúng." });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server nội bộ." });
      }
    }
  );
});

// ==========================================================
// ROUTING (Phục vụ file HTML) - (Giữ nguyên)
// ==========================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/register.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});
app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==========================================================
// SOCKET.IO LOGIC
// ==========================================================

function sendLobbyData(socket) {
  if (!isDatabaseLoaded) {
    console.log("DB (JSON) chưa sẵn sàng, yêu cầu client đợi...");
    setTimeout(() => sendLobbyData(socket), 500);
    return;
  }

  console.log("DB (JSON) sẵn sàng, gửi wordPacks...");
  socket.emit("lobbyData", {
    wordPacks: Object.keys(wordPacks).reduce((acc, key) => {
      acc[key] = { name: wordPacks[key].name };
      return acc;
    }, {}),
  });
}

io.on("connection", (socket) => {
  console.log("Một người chơi đã kết nối:", socket.id);

  socket.on("clientReady", (user) => {
    socket.data.userId = user.id;
    socket.data.username = user.username;
    socket.data.displayName = user.name;
    socket.data.score = user.score || 0;
    onlineUsers.set(user.id, socket.id);

    sendLobbyData(socket);
  });

  socket.on("getLobbyData", () => {
    sendLobbyData(socket);
  });

  // --- Logic phòng ---
  socket.on("createRoom", () => {
    let shortId;
    do {
      shortId = Math.floor(100000 + Math.random() * 900000).toString();
    } while (rooms.some((r) => r.shortId === shortId));

    const newRoom = {
      id: uuidv4(),
      shortId: shortId,
      name: `${socket.data.displayName}'s Room`,
      hostId: socket.data.userId,
      players: [],
      status: "waiting",
      currentRound: 1,
      maxRounds: MAX_ROUNDS,
      gameMode: "normal",
      wordPack: Object.keys(wordPacks)[0] || "general",
      correctAnswer: null,
      hintWord: null,
      hintImage: null,
      gameInterval: null,
      roundEndTimer: null,
    };
    rooms.push(newRoom);
    handleJoinRoom({ roomId: newRoom.id });
  });

  const handleJoinRoom = ({ roomId }) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) {
      return socket.emit("joinError", "Phòng không tồn tại.");
    }
    if (room.status !== "waiting") {
      return socket.emit("joinError", "Phòng đã bắt đầu.");
    }
    if (room.players.length >= 5) {
      return socket.emit("joinError", "Phòng đã đầy.");
    }
    const oldRoom = rooms.find((r) =>
      r.players.some((p) => p.id === socket.data.userId)
    );
    if (oldRoom && oldRoom.id !== roomId) {
      handleLeaveRoom({ roomId: oldRoom.id, isDisconnecting: false });
    }
    socket.join(roomId);
    room.players.push({
      id: socket.data.userId,
      name: socket.data.displayName,
      socketId: socket.id,
      score: 0,
      total_score: socket.data.score || 0,
    });

    // SỬA LỖI: Tạo đối tượng room an toàn trước khi gửi (Loại bỏ Timer)
    const roomForClient = { ...room };
    delete roomForClient.gameInterval;
    delete roomForClient.roundEndTimer;

    io.to(roomId).emit("roomUpdate", roomForClient);
  };
  socket.on("joinRoom", handleJoinRoom);

  socket.on("joinRoomById", ({ searchInput }) => {
    const input = searchInput.toLowerCase().trim();
    const room = rooms.find(
      (r) => r.shortId === input || r.name.toLowerCase() === input
    );

    if (room) {
      handleJoinRoom({ roomId: room.id });
    } else {
      socket.emit("joinError", "Không tìm thấy phòng.");
    }
  });

  socket.on("updateRoomSettings", (data) => {
    const room = rooms.find((r) => r.id === data.roomId);
    if (
      !room ||
      room.hostId !== socket.data.userId ||
      room.status !== "waiting"
    ) {
      return;
    }
    if (data.name !== undefined) {
      room.name =
        data.name.substring(0, 30).trim() ||
        `${socket.data.displayName}'s Room`;
    }
    if (data.gameMode && ["normal", "reverse"].includes(data.gameMode)) {
      room.gameMode = data.gameMode;
    }
    if (data.wordPack && wordPacks[data.wordPack]) {
      room.wordPack = data.wordPack;
    }

    // SỬA LỖI: Tạo đối tượng room an toàn trước khi gửi (Loại bỏ Timer)
    const roomForClient = { ...room };
    delete roomForClient.gameInterval;
    delete roomForClient.roundEndTimer;

    io.to(room.id).emit("roomUpdate", roomForClient);
  });

  socket.on("startGame", ({ roomId }) => {
    const room = rooms.find((r) => r.id === roomId);
    if (
      !room ||
      room.hostId !== socket.data.userId ||
      room.status !== "waiting"
    ) {
      return socket.emit("gameError", "Bạn không phải chủ phòng.");
    }
    if (room.players.length < 2) {
      return socket.emit("gameError", "Cần tối thiểu 2 người chơi.");
    }
    room.currentRound = 1;
    room.status = "starting";

    // SỬA LỖI: Tạo đối tượng room an toàn trước khi gửi (Loại bỏ Timer)
    const roomForClient = { ...room };
    delete roomForClient.gameInterval;
    delete roomForClient.roundEndTimer;

    io.to(room.id).emit("gameStart", { room: roomForClient });
    setTimeout(() => startRound(room), 1000);
  });

  socket.on("makeGuess", ({ guess, roomId }) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room || room.status !== "playing") return;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;
    const cleanGuess = guess.toLowerCase().trim();
    const cleanAnswer = room.correctAnswer.toLowerCase().trim();
    if (cleanGuess === cleanAnswer) {
      const points = 100 + room.timeLeft;
      player.score += points;
      io.to(room.id).emit("guessResult", {
        isCorrect: true,
        message: `${player.name} đã đoán đúng! (+${points} điểm)`,
        maskedWord: room.correctAnswer,
      });
      endRound(room, true);
    } else if (cleanGuess.length === 1 && cleanGuess.match(/[a-z]/i)) {
      if (room.guessedLetters.includes(cleanGuess)) {
        return socket.emit("guessResult", {
          isCorrect: false,
          message: "Chữ cái này đã được đoán rồi.",
        });
      }
      room.guessedLetters.push(cleanGuess);

      // SỬA LỖI: Tạo đối tượng room an toàn trước khi gửi (Loại bỏ Timer)
      const roomForClient = { ...room };
      delete roomForClient.gameInterval;
      delete roomForClient.roundEndTimer;

      if (cleanAnswer.includes(cleanGuess)) {
        player.score += 10;
        const newMaskedWord = maskWord(room.correctAnswer, room.guessedLetters);
        io.to(room.id).emit("guessResult", {
          isCorrect: true,
          message: `${player.name} đoán đúng chữ cái! (+10 điểm)`,
          maskedWord: newMaskedWord,
        });
        if (!newMaskedWord.replace(/ /g, "").includes("_")) {
          endRound(room, true);
        } else {
          io.to(room.id).emit("roomUpdate", roomForClient);
        }
      } else {
        socket.emit("guessResult", {
          isCorrect: false,
          message: "Chữ cái sai. -5 điểm.",
        });
        player.score = Math.max(0, player.score - 5);
        io.to(room.id).emit("roomUpdate", roomForClient);
      }
    } else {
      // SỬA LỖI: Tạo đối tượng room an toàn trước khi gửi (Loại bỏ Timer)
      const roomForClient = { ...room };
      delete roomForClient.gameInterval;
      delete roomForClient.roundEndTimer;

      socket.emit("guessResult", {
        isCorrect: false,
        message: "Đoán sai từ. -10 điểm.",
      });
      player.score = Math.max(0, player.score - 10);
      io.to(room.id).emit("roomUpdate", roomForClient);
    }
  });

  socket.on("getRoundUpdate", ({ roomId }) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room || room.status !== "playing") return;

    // SỬA LỖI: Tạo đối tượng room an toàn trước khi gửi (Loại bỏ Timer)
    const roomForClient = { ...room };
    delete roomForClient.gameInterval;
    delete roomForClient.roundEndTimer;

    socket.emit("roundUpdate", {
      round: room.currentRound,
      maxRounds: room.maxRounds, // Gửi maxRounds
      maskedWord: maskWord(room.correctAnswer, room.guessedLetters),
      hintWord: room.hintWord,
      hintImage: room.hintImage,
      room: roomForClient, // Gửi đối tượng đã làm sạch
    });
    socket.emit("timerUpdate", { time: room.timeLeft });
  });

  const handleLeaveRoom = ({ roomId, isDisconnecting = false }) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    if (!isDisconnecting) {
      socket.leave(roomId);
    }
    room.players = room.players.filter((p) => p.socketId !== socket.id);
    if (room.players.length === 0) {
      if (room.gameInterval) clearInterval(room.gameInterval);
      if (room.roundEndTimer) clearTimeout(room.roundEndTimer);
      rooms = rooms.filter((r) => r.id !== room.id);
    } else {
      if (room.hostId === socket.data.userId) {
        room.hostId = room.players[0].id;
      }

      // SỬA LỖI: Tạo đối tượng room an toàn trước khi gửi (Loại bỏ Timer)
      const roomForClient = { ...room };
      delete roomForClient.gameInterval;
      delete roomForClient.roundEndTimer;

      io.to(roomId).emit("roomUpdate", roomForClient);
    }
  };
  socket.on("leaveRoom", ({ roomId }) =>
    handleLeaveRoom({ roomId, isDisconnecting: false })
  );

  socket.on("getRanking", () => {
    db.query(
      "SELECT name, total_score as score FROM users ORDER BY total_score DESC LIMIT 10",
      (err, results) => {
        if (err) return console.error("Lỗi lấy BXH:", err);
        socket.emit("sendRanking", results);
      }
    );
  });

  // ==========================================================
  // LOGIC CHƠI ĐƠN (Endless/Sudden Death) - (Giữ nguyên logic)
  // ==========================================================

  function endSinglePlayerGame(socketId, game, isCorrect) {
    if (game.gameInterval) clearInterval(game.gameInterval);
    singlePlayerGames.delete(socketId);

    if (!isCorrect) {
      socket.emit("roundEnd", {
        word: game.correctAnswer,
        room: { players: [] },
      });
    }

    const message = isCorrect ? "Bạn đã đoán đúng!" : "Hết giờ! Bạn đã thua.";
    setTimeout(() => {
      socket.emit("gameEnd", {
        message: message,
        ranking: [],
        finalUserScore: null,
      });
    }, 3000);
  }

  function startSinglePlayerRound(socketId, gameMode, wordPack, currentRound) {
    const newWordData = getNewWord(wordPack);
    if (!newWordData) {
      return socket.emit("gameError", "Lỗi: Không thể tải từ vựng.");
    }

    let correctAnswer, hintWord;
    if (gameMode === "reverse") {
      correctAnswer = newWordData.meaning.toLowerCase();
      hintWord = newWordData.word;
    } else {
      correctAnswer = newWordData.word.toLowerCase();
      hintWord = newWordData.meaning;
    }

    const oldGame = singlePlayerGames.get(socketId);
    if (oldGame && oldGame.gameInterval) {
      clearInterval(oldGame.gameInterval);
    }

    const game = {
      correctAnswer: correctAnswer,
      hintWord: hintWord,
      hintImage: newWordData.image.startsWith("http")
        ? newWordData.image
        : `/${newWordData.image}`,
      guessedLetters: [],
      gameMode: gameMode,
      wordPack: wordPack,
      currentRound: currentRound,
      timeLeft: ROUND_TIME,
      gameInterval: null,
    };

    game.gameInterval = setInterval(() => {
      game.timeLeft--;
      socket.emit("timerUpdate", { time: game.timeLeft });

      if (game.timeLeft <= 0) {
        endSinglePlayerGame(socket.id, game, false);
      }
    }, 1000);

    singlePlayerGames.set(socketId, game);

    // LƯU Ý: Ở đây chỉ gửi game.currentRound và KHÔNG gửi object 'game' (tránh circular)
    socket.emit("roundUpdate", {
      round: game.currentRound,
      maxRounds: "∞",
      maskedWord: maskWord(game.correctAnswer, game.guessedLetters),
      hintWord: game.hintWord,
      hintImage: game.hintImage,
      room: { players: [] },
    });
    socket.emit("timerUpdate", { time: game.timeLeft });
  }

  socket.on("startSinglePlayer", ({ gameMode, wordPack }) => {
    if (!wordPack || !wordPacks[wordPack]) {
      wordPack = Object.keys(wordPacks)[0] || "general";
    }
    if (gameMode !== "normal" && gameMode !== "reverse") {
      gameMode = "normal";
    }
    startSinglePlayerRound(socket.id, gameMode, wordPack, 1);
  });

  socket.on("makeSinglePlayerGuess", ({ guess }) => {
    const game = singlePlayerGames.get(socket.id);
    if (!game) return;

    const cleanGuess = guess.toLowerCase().trim();
    const cleanAnswer = game.correctAnswer.toLowerCase().trim();

    if (cleanGuess === cleanAnswer) {
      clearInterval(game.gameInterval);

      socket.emit("guessResult", {
        isCorrect: true,
        message: `Chính xác! Sang vòng tiếp theo...`,
        maskedWord: game.correctAnswer,
      });

      setTimeout(() => {
        startSinglePlayerRound(
          socket.id,
          game.gameMode,
          game.wordPack,
          game.currentRound + 1
        );
      }, 3000);
    } else if (cleanGuess.length === 1 && cleanGuess.match(/[a-z]/i)) {
      if (game.guessedLetters.includes(cleanGuess)) {
        return socket.emit("guessResult", {
          isCorrect: false,
          message: "Chữ cái này đã được đoán rồi.",
        });
      }
      game.guessedLetters.push(cleanGuess);
      if (cleanAnswer.includes(cleanGuess)) {
        const newMaskedWord = maskWord(game.correctAnswer, game.guessedLetters);
        socket.emit("guessResult", {
          isCorrect: true,
          message: `Đoán đúng chữ cái!`,
          maskedWord: newMaskedWord,
        });
        if (!newMaskedWord.replace(/ /g, "").includes("_")) {
          clearInterval(game.gameInterval);
          setTimeout(
            () =>
              startSinglePlayerRound(
                socket.id,
                game.gameMode,
                game.wordPack,
                game.currentRound + 1
              ),
            3000
          );
        }
      } else {
        socket.emit("guessResult", {
          isCorrect: false,
          message: "Chữ cái sai.",
        });
      }
    } else {
      socket.emit("guessResult", { isCorrect: false, message: "Đoán sai từ." });
    }
  });

  // ==========================================================
  // LOGIC MỜI NGƯỜI CHƠI (Giữ nguyên)
  // ==========================================================
  socket.on("invitePlayer", async ({ username, roomId }) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room || room.hostId !== socket.data.userId) {
      return socket.emit("inviteMessage", {
        success: false,
        message: "Bạn không phải chủ phòng.",
      });
    }
    db.query(
      "SELECT id FROM users WHERE username = ?",
      [username],
      (err, results) => {
        if (err || results.length === 0) {
          return socket.emit("inviteMessage", {
            success: false,
            message: "Người dùng không tồn tại.",
          });
        }
        const targetUserId = results[0].id;
        if (targetUserId === socket.data.userId) {
          return socket.emit("inviteMessage", {
            success: false,
            message: "Bạn không thể mời chính mình.",
          });
        }
        if (room.players.some((p) => p.id === targetUserId)) {
          return socket.emit("inviteMessage", {
            success: false,
            message: "Người dùng đã ở trong phòng.",
          });
        }
        const targetSocketId = onlineUsers.get(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit("receiveInvite", {
            roomId: room.id,
            roomName: room.name,
            inviterName: socket.data.displayName,
          });
          socket.emit("inviteMessage", {
            success: true,
            message: `Đã gửi lời mời tới ${username}.`,
          });
        } else {
          socket.emit("inviteMessage", {
            success: false,
            message: "Người dùng đang offline.",
          });
        }
      }
    );
  });

  // NGẮT KẾT NỐI
  socket.on("disconnect", () => {
    console.log("Một người chơi đã ngắt kết nối:", socket.id);

    if (singlePlayerGames.has(socket.id)) {
      const game = singlePlayerGames.get(socket.id);
      if (game.gameInterval) clearInterval(game.gameInterval);
      singlePlayerGames.delete(socket.id);
    }

    if (socket.data.userId) {
      onlineUsers.delete(socket.data.userId);
    }
    const room = rooms.find((r) =>
      r.players.some((p) => p.socketId === socket.id)
    );
    if (room) {
      handleLeaveRoom({ roomId: room.id, isDisconnecting: true });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
