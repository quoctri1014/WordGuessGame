const socket = io();
let playerName = "";
let score = 0;
let currentGameMode = "normal";
let currentWordPack = "words";
let timerInterval;


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
    if (guess) {
      socket.emit("guessWord", guess);
      guessInput.value = "";
    }
  }
});

// Khi server gửi từ mới
socket.on("newWord", data => {
  // 1. KHÔNG tự chạy timer nữa
  // 2. Đọc 'data.display' (do server gửi) thay vì 'data.wordLength'
  imageEl.src = "images/" + data.image;
  hiddenWordEl.innerText = data.display; // <-- LỖI LÀ Ở ĐÂY
  messageEl.innerText = "";
  timerEl.innerText = 30; // Reset về 30
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
