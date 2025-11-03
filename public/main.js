const socket = io();
let playerName = "";
let score = 0;
let currentGameMode = "normal";
let currentWordPack = "general";
let timerInterval;

const loginDiv = document.getElementById("login");
const gameDiv = document.getElementById("game");
const endScreen = document.getElementById("endScreen");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const playerNameInput = document.getElementById("playerName");
const imageEl = document.getElementById("image");
const hiddenWordEl = document.getElementById("hiddenWord");
const timerEl = document.getElementById("timer");
const messageEl = document.getElementById("message");
const guessInput = document.getElementById("guessInput");
const scoreDisplay = document.getElementById("scoreDisplay");
const finalScore = document.getElementById("finalScore");

const gameModeSelect = document.getElementById("gameMode");
const wordPackSelect = document.getElementById("wordPack");

// Bắt đầu trò chơi
startBtn.onclick = () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Please enter your name!");

  currentGameMode = gameModeSelect.value;
  currentWordPack = wordPackSelect.value;

  socket.emit("registerPlayer", {
    name: playerName,
    mode: currentGameMode,
    pack: currentWordPack
  });

  loginDiv.style.display = "none";
  gameDiv.style.display = "block";
  score = 0;
  scoreDisplay.innerText = `👤 ${playerName} | Score: ${score}`;
};

// Chơi lại
restartBtn.onclick = () => {
  endScreen.style.display = "none";
  socket.emit("restartGame", {
    mode: currentGameMode,
    pack: currentWordPack
  });
  gameDiv.style.display = "block";
  score = 0;
  scoreDisplay.innerText = `👤 ${playerName} | Score: ${score}`;
};

// Người chơi nhấn Enter để đoán
guessInput.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    const guess = guessInput.value.trim();
    if (!guess) return;
    if (currentGameMode === "hangman") {
      // Chỉ nhận 1 ký tự, gửi event guessLetter
      if (guess.length === 1 && /^[a-zA-Z]$/.test(guess)) {
        socket.emit("guessLetter", guess.toLowerCase());
        guessInput.value = "";
      } else {
        messageEl.innerText = "Chỉ nhập 1 chữ cái!";
      }
    } else {
      socket.emit("guessWord", guess);
      guessInput.value = "";
    }
  }
});

// Khi server gửi từ mới (chế độ thường/ngược)
socket.on("newWord", data => {
  if (currentGameMode === "hangman") return;
  imageEl.src = data.image;
  hiddenWordEl.innerText = data.display;
  messageEl.innerText = "";
  timerEl.innerText = 30;
});

// Khi server gửi bắt đầu vòng hangman
socket.on("hangmanStart", data => {
  imageEl.src = data.image;
  hiddenWordEl.innerText = data.display;
  messageEl.innerText = "";
  timerEl.innerText = "";
  guessInput.placeholder = "Nhập 1 chữ cái...";
  // Có thể vẽ hình treo cổ ở đây nếu muốn
});

// Khi server gửi cập nhật trạng thái hangman
socket.on("hangmanUpdate", data => {
  hiddenWordEl.innerText = data.display;
  messageEl.innerText = `Sai: ${data.fails}/${data.maxFails} | Đã đoán: ${data.guessedLetters.join(", ")}`;
  // Nếu thua
  if (data.lose) {
    messageEl.innerText = `💀 Thua rồi! Đáp án: ${data.word}`;
    setTimeout(() => {
      messageEl.innerText = "";
    }, 3000);
  }
  // Nếu thắng
  if (data.win) {
    messageEl.innerText = `🎉 Đúng rồi! Đáp án: ${data.word}`;
    score += 10;
    scoreDisplay.innerText = `👤 ${playerName} | Score: ${score}`;
    setTimeout(() => {
      messageEl.innerText = "";
    }, 3000);
  }
});

// THÊM LẠI HÀM LẮNG NGHE TIMER TỪ SERVER
socket.on("timer", t => {
  timerEl.innerText = t;
});
// Khi đoán sai
socket.on("wrongGuess", () => {
  messageEl.innerText = "❌ Sai rồi! Thử lại nhé!";
});

// Khi đoán đúng
socket.on("correctGuess", data => {
  // 1. KHÔNG tự clear timer (Server sẽ clear)
  // 2. KHÔNG gửi 'socket.emit("nextWord")'
  
  // Hiển thị đáp án đúng tùy theo chế độ
  if (currentGameMode === "reverse") {
    hiddenWordEl.innerText = data.meaning; // Hiển thị nghĩa TV
  } else {
    hiddenWordEl.innerText = data.word; // Hiển thị từ TA
  }
  
  messageEl.innerText = `✅ Chính xác! (${data.word} - ${data.meaning})`;
  score += 10; // Cập nhật điểm phía client ngay lập tức
  scoreDisplay.innerText = `👤 ${playerName} | Score: ${score}`;
  
  // KHÔNG cần setTimeout hay emit "nextWord" ở đây. Server tự lo.
});

// Khi hết thời gian => kết thúc game
socket.on("gameOver", data => {
  gameDiv.style.display = "none";
  endScreen.style.display = "block";

  let rankHtml = `<h2>⏰ Hết thời gian!<br>Your score: ${data.score}</h2>`;
  rankHtml += "<h3>🏆 Top 10 Players 🏆</h3><ol>";

  if (data.ranking && data.ranking.length > 0) {
    data.ranking.forEach(player => {
      if (player.name === playerName) {
        rankHtml += `<li><strong>${player.name}: ${player.score} (You)</strong></li>`;
      } else {
        rankHtml += `<li>${player.name}: ${player.score}</li>`;
      }
    });
  } else {
    rankHtml += "<li>No ranking data available.</li>";
  }
  rankHtml += "</ol>";

  finalScore.innerHTML = rankHtml;
});
