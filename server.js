import express from "express";
import http from "http";
import { Server } from "socket.io";
import mysql from "mysql2";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const wordPacks = {}; // Dùng object để lưu từ vựng theo category

// Load từ vựng từ database
function loadWordsFromDatabase() {
  db.query("SELECT * FROM vocabulary", (err, results) => {
    if (err) {
      console.error("❌ Không thể load từ vựng:", err);
      return;
    }

    // Phân loại từ vựng theo category
    results.forEach(word => {
      const category = word.category || 'general';
      if (!wordPacks[category]) {
        wordPacks[category] = [];
      }
      wordPacks[category].push({
        word: word.word,
        meaning: word.meaning,
        image: word.image
      });
    });

    // Log số lượng từ vựng đã load
    Object.keys(wordPacks).forEach(category => {
      console.log(`📘 Loaded ${wordPacks[category].length} words from ${category} category`);
    });
  });
}

// Load từ vựng khi khởi động server
loadWordsFromDatabase();

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

// ======= DATABASE API ENDPOINTS =======

// Lấy danh sách tất cả người chơi
app.get("/api/players", (req, res) => {
  db.query("SELECT * FROM players ORDER BY score DESC", (err, results) => {
    if (err) {
      console.error("Lỗi khi lấy danh sách người chơi:", err);
      return res.status(500).json({ error: "Không thể lấy danh sách người chơi" });
    }
    res.json(results);
  });
});

// Lấy thông tin một người chơi
app.get("/api/players/:name", (req, res) => {
  const playerName = req.params.name;
  db.query("SELECT * FROM players WHERE name = ?", [playerName], (err, results) => {
    if (err) {
      console.error("Lỗi khi lấy thông tin người chơi:", err);
      return res.status(500).json({ error: "Không thể lấy thông tin người chơi" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy người chơi" });
    }
    res.json(results[0]);
  });
});

// Tạo người chơi mới
app.post("/api/players", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Tên người chơi không được để trống" });
  }
  
  db.query(
    "INSERT INTO players (name, score) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?",
    [name, 0, name],
    (err, result) => {
      if (err) {
        console.error("Lỗi khi tạo người chơi:", err);
        return res.status(500).json({ error: "Không thể tạo người chơi mới" });
      }
      res.json({ message: "Tạo người chơi thành công", playerId: result.insertId });
    }
  );
});

// Cập nhật điểm số người chơi
app.put("/api/players/:name/score", (req, res) => {
  const playerName = req.params.name;
  const { score } = req.body;
  
  if (score === undefined) {
    return res.status(400).json({ error: "Điểm số không được để trống" });
  }

  db.query(
    "UPDATE players SET score = ? WHERE name = ?",
    [score, playerName],
    (err, result) => {
      if (err) {
        console.error("Lỗi khi cập nhật điểm:", err);
        return res.status(500).json({ error: "Không thể cập nhật điểm số" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Không tìm thấy người chơi" });
      }
      res.json({ message: "Cập nhật điểm số thành công" });
    }
  );
});

// Xóa người chơi
app.delete("/api/players/:name", (req, res) => {
  const playerName = req.params.name;
  
  db.query("DELETE FROM players WHERE name = ?", [playerName], (err, result) => {
    if (err) {
      console.error("Lỗi khi xóa người chơi:", err);
      return res.status(500).json({ error: "Không thể xóa người chơi" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy người chơi" });
    }
    res.json({ message: "Xóa người chơi thành công" });
  });
});

// Lấy bảng xếp hạng top 10
app.get("/api/leaderboard", (req, res) => {
  db.query(
    "SELECT name, score FROM players ORDER BY score DESC LIMIT 10",
    (err, results) => {
      if (err) {
        console.error("Lỗi khi lấy bảng xếp hạng:", err);
        return res.status(500).json({ error: "Không thể lấy bảng xếp hạng" });
      }
      res.json(results);
    }
  );
});

// ======= QUẢN LÝ TỪ VỰNG API =======
// Lấy danh sách từ vựng theo chủ đề
app.get("/api/words/:pack", (req, res) => {
  const packName = req.params.pack;
  if (!wordPacks[packName]) {
    return res.status(404).json({ error: "Không tìm thấy gói từ vựng này" });
  }
  res.json(wordPacks[packName]);
});

// Thêm từ mới vào gói
app.post("/api/words/:pack", (req, res) => {
  const packName = req.params.pack;
  const filePath = path.join(__dirname, `${packName}.json`);
  const newWord = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!newWord.word || !newWord.meaning) {
    return res.status(400).json({ error: "Thiếu thông tin từ vựng" });
  }

  try {
    // Đọc file hiện tại
    const words = wordPacks[packName] || [];
    
    // Kiểm tra từ đã tồn tại
    if (words.some(w => w.word.toLowerCase() === newWord.word.toLowerCase())) {
      return res.status(400).json({ error: "Từ này đã tồn tại" });
    }

    // Thêm từ mới
    words.push(newWord);
    
    // Lưu vào file
    fs.writeFileSync(filePath, JSON.stringify(words, null, 2));
    
    // Cập nhật cache
    wordPacks[packName] = words;
    
    res.json({ message: "Thêm từ mới thành công", word: newWord });
  } catch (err) {
    console.error("Lỗi khi thêm từ:", err);
    res.status(500).json({ error: "Không thể thêm từ mới" });
  }
});

// Sửa từ vựng
app.put("/api/words/:pack/:word", (req, res) => {
  const packName = req.params.pack;
  const wordToEdit = req.params.word;
  const updates = req.body;
  const filePath = path.join(__dirname, `${packName}.json`);

  try {
    const words = wordPacks[packName];
    const index = words.findIndex(w => w.word.toLowerCase() === wordToEdit.toLowerCase());
    
    if (index === -1) {
      return res.status(404).json({ error: "Không tìm thấy từ này" });
    }

    // Cập nhật từ
    words[index] = { ...words[index], ...updates };
    
    // Lưu vào file
    fs.writeFileSync(filePath, JSON.stringify(words, null, 2));
    
    // Cập nhật cache
    wordPacks[packName] = words;
    
    res.json({ message: "Cập nhật thành công", word: words[index] });
  } catch (err) {
    console.error("Lỗi khi sửa từ:", err);
    res.status(500).json({ error: "Không thể cập nhật từ" });
  }
});

// Xóa từ vựng
app.delete("/api/words/:pack/:word", (req, res) => {
  const packName = req.params.pack;
  const wordToDelete = req.params.word;
  const filePath = path.join(__dirname, `${packName}.json`);

  try {
    const words = wordPacks[packName];
    const filteredWords = words.filter(w => w.word.toLowerCase() !== wordToDelete.toLowerCase());
    
    if (filteredWords.length === words.length) {
      return res.status(404).json({ error: "Không tìm thấy từ này" });
    }

    // Lưu vào file
    fs.writeFileSync(filePath, JSON.stringify(filteredWords, null, 2));
    
    // Cập nhật cache
    wordPacks[packName] = filteredWords;
    
    res.json({ message: "Xóa từ thành công" });
  } catch (err) {
    console.error("Lỗi khi xóa từ:", err);
    res.status(500).json({ error: "Không thể xóa từ" });
  }
});

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
