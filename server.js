import express from "express";
import http from "http";
import { Server } from "socket.io";
import mysql from "mysql2";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- (PHẦN NÀY GIỮ NGUYÊN) ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);
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
  if (!pack || pack.length === 0) {
    return { word: "error", meaning: "lỗi", image: "default.jpg" };
  }
  return pack[Math.floor(Math.random() * pack.length)];
}
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(express.json());

// --- (KẾT NỐI DATABASE GIỮ NGUYÊN) ---
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

// ======== (LOGIC MULTIPLAYER MỚI) ========

const ROOM_NAME = "main_room";

// Trạng thái của phòng, dùng chung cho mọi người
let roomState = {
    currentWord: null,
    displayString: "",
    correctAnswer: "",
    gameMode: "normal",
    wordPack: "words",
    timeLeft: 30,
    timer: null
};

// Hàm mới: Gửi danh sách người chơi cho cả phòng
async function broadcastPlayerList() {
    try {
        const sockets = await io.in(ROOM_NAME).fetchSockets();
        const players = sockets.map(s => ({
            name: s.data.playerName,
            score: s.data.score || 0
        }));
        // Gửi danh sách người chơi đã cập nhật cho mọi người
        io.to(ROOM_NAME).emit("updatePlayerList", players);
    } catch (e) {
        console.error("Error broadcasting player list:", e);
    }
}

// Hàm mới: Gửi trạng thái game hiện tại cho 1 người (khi họ mới vào)
function sendCurrentState(socket) {
    if (roomState.currentWord) {
        socket.emit("newWord", {
            image: roomState.currentWord.image,
            display: roomState.displayString
        });
        socket.emit("timer", roomState.timeLeft);
    }
}

// Hàm mới: Kết thúc game (hết giờ) cho cả phòng
function endGame() {
    clearInterval(roomState.timer);
    roomState.timer = null;

    db.query("SELECT name, score FROM players ORDER BY score DESC LIMIT 10", (err, results) => {
        if (err) return console.error(err);

        // Gửi Game Over cho mọi người
        io.to(ROOM_NAME).emit("gameOver", {
            // Gửi score của người đầu bảng hoặc cứ để client tự lấy
            score: results.length > 0 ? results[0].score : 0, 
            ranking: results
        });
    });
}

// Hàm mới: Bắt đầu vòng mới cho cả phòng
function startNewRound() {
    clearInterval(roomState.timer);

    const randomWord = getRandomWord(roomState.wordPack);
    roomState.currentWord = randomWord;
    roomState.timeLeft = 30;

    let targetWord = "";
    if (roomState.gameMode === "reverse") {
        targetWord = randomWord.meaning;
        roomState.correctAnswer = randomWord.meaning.toLowerCase();
    } else {
        targetWord = randomWord.word;
        roomState.correctAnswer = randomWord.word.toLowerCase();
    }

    roomState.displayString = "_ ".repeat(targetWord.length).trim();

    // Gửi từ mới cho mọi người
    io.to(ROOM_NAME).emit("newWord", {
        image: randomWord.image,
        display: roomState.displayString
    });

    // Bật timer chung
    roomState.timer = setInterval(() => {
        roomState.timeLeft--;
        io.to(ROOM_NAME).emit("timer", roomState.timeLeft);

        if (roomState.timeLeft <= 0) {
            endGame(); // Hết giờ
        }
    }, 1000);
}

// ======= SOCKET IO (CẬP NHẬT) =======
io.on("connection", socket => {
    console.log("👤 New player connected");

    socket.on("registerPlayer", (data) => {
        socket.data.playerName = data.name;
        socket.data.score = 0;
        // Lưu cài đặt game vào state chung (nếu đây là người đầu tiên)
        if (io.sockets.adapter.rooms.get(ROOM_NAME)?.size === 0 || !io.sockets.adapter.rooms.get(ROOM_NAME)) {
            roomState.gameMode = data.mode || "normal";
            roomState.wordPack = data.pack || "words";
        }

        socket.join(ROOM_NAME); // Cho người chơi vào phòng
        console.log(`Player ${data.name} registered and joined ${ROOM_NAME}`);

        // Ghi vào database (giữ nguyên)
        db.query(
          "INSERT INTO players (name, score) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?",
          [socket.data.playerName, 0, socket.data.playerName],
          err => {
            if (err) console.error("DB Register error:", err);
          }
        );

        // Cập nhật danh sách người chơi cho mọi người
        broadcastPlayerList();

        // Nếu game chưa chạy, bắt đầu. Nếu đang chạy, gửi state hiện tại
        if (!roomState.timer) {
            startNewRound();
        } else {
            sendCurrentState(socket);
        }
    });

    // ======= NGƯỜI CHƠI ĐOÁN =======
    socket.on("guessWord", guess => {
        if (!roomState.currentWord) return;

        if (guess.toLowerCase() === roomState.correctAnswer) {
            // Đoán đúng!
            clearInterval(roomState.timer);
            roomState.timer = null;

            socket.data.score = (socket.data.score || 0) + 10;

            db.query("UPDATE players SET score = ? WHERE name = ?", [
              socket.data.score,
              socket.data.playerName
            ]);

            // Gửi thông báo đoán đúng cho mọi người
            io.to(ROOM_NAME).emit("correctGuess", {
              word: roomState.currentWord.word,
              meaning: roomState.currentWord.meaning,
              playerName: socket.data.playerName // Thêm tên người đoán đúng
            });

            // Cập nhật lại danh sách điểm
            broadcastPlayerList();

            setTimeout(() => {
              startNewRound();
            }, 3000);
        } else {
            // Gửi sai chỉ cho người đoán
            socket.emit("wrongGuess");
        }
    });

    socket.on("restartGame", (data) => {
        // Cập nhật cài đặt game
        roomState.gameMode = data.mode || "normal";
        roomState.wordPack = data.pack || "words";
        // Reset điểm của mọi người
        io.in(ROOM_NAME).fetchSockets().then(sockets => {
            sockets.forEach(s => s.data.score = 0);
            broadcastPlayerList(); // Cập nhật danh sách điểm (về 0)
            startNewRound(); // Bắt đầu vòng mới cho cả phòng
        });
    });

    socket.on("disconnect", () => {
        console.log("Player disconnected");
        broadcastPlayerList(); // Cập nhật danh sách khi ai đó thoát
    });
});

server.listen(3000, () =>
  console.log("🚀 Server running at http://localhost:3000")
);
