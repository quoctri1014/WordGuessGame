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

// map physical keys to virtual keyboard when playing hangman
document.addEventListener('keydown', (e) => {
  if (gameDiv.style.display === 'none') return;
  if (currentGameMode !== 'hangman') return;
  const k = e.key.toLowerCase();
  if (/^[a-z]$/.test(k)) {
    const btn = keyboardContainer.querySelector(`button[data-letter="${k}"]`);
    if (btn && !btn.disabled) btn.click();
  }
});

// Bắt đầu trò chơi
startBtn.onclick = () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Please enter your name!");

  currentGameMode = gameModeSelect.value;
  currentWordPack = wordPackSelect.value;

  // Reset UI
  hiddenWordEl.innerText = "";
  messageEl.innerText = "";
  imageEl.src = "";
  timerEl.innerText = "";
  guessInput.value = "";
  guessInput.placeholder = currentGameMode === "hangman" ? "Nhập 1 chữ cái..." : "Enter the word...";

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
  // Reset UI
  hiddenWordEl.innerText = "";
  messageEl.innerText = "";
  imageEl.src = "";
  timerEl.innerText = "";
  guessInput.value = "";
  guessInput.placeholder = currentGameMode === "hangman" ? "Nhập 1 chữ cái..." : "Enter the word...";

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
  console.log('Received new word:', data);
  if (!data.image) {
    console.error('No image in new word data');
    return;
  }
  imageEl.src = data.image;
  // Show the display with nice letter spacing for any mode
  hiddenWordEl.innerHTML = data.display.split('').map(char => 
    char === '_' ? '<span class="letter-box">_</span>' : char
  ).join('');
  messageEl.innerText = "";
  timerEl.innerText = 30;
});

// Khi server gửi bắt đầu vòng hangman
socket.on("hangmanStart", data => {
  imageEl.src = data.image;
  // Show initial display with styled boxes
  hiddenWordEl.innerHTML = data.display.split(' ').map(letter => 
    `<span class="letter-box">${letter}</span>`
  ).join('');
  
  // Create initial hangman status display
  let status = `<div class="hangman-info">`;
  status += `<p>❤️ Lives: ${data.maxFails}/6</p>`;
  status += `<p>Guess a letter to begin!</p>`;
  status += `<p>Letters guessed: None yet</p>`;
  status += `</div>`;
  
  messageEl.innerHTML = status;
  timerEl.innerText = "";
  guessInput.placeholder = "Type a letter...";
  guessInput.maxLength = 1; // Only allow one character
  guessInput.value = ""; // Clear any existing input
  // Reset keyboard state for a new hangman round
  const keys = keyboardContainer.querySelectorAll('button.key');
  keys.forEach(k => {
    k.disabled = false;
    k.classList.remove('correct-key', 'wrong-key');
    k.style.opacity = '1';
  });
});

  // Khi server gửi cập nhật trạng thái hangman
socket.on("hangmanUpdate", data => {
  // Update the display with nice letter spacing (each char boxed)
  hiddenWordEl.innerHTML = data.display.split(' ').map(letter => 
    `<span class="letter-box ${letter !== '_' ? 'correct-letter' : ''}">${letter}</span>`
  ).join('');

  // Update keyboard keys state: mark correct and wrong guesses
  data.guessedLetters.forEach(l => {
    const btn = keyboardContainer.querySelector(`button[data-letter="${l}"]`);
    if (btn) {
      btn.classList.add('correct-key');
      btn.disabled = true;
      btn.style.opacity = '0.8';
    }
  });
  data.failedLetters.forEach(l => {
    const btn = keyboardContainer.querySelector(`button[data-letter="${l}"]`);
    if (btn) {
      btn.classList.add('wrong-key');
      btn.disabled = true;
      btn.style.opacity = '0.6';
    }
  });

  // Create a visually appealing status display
  let status = `<div class="hangman-info">`;
  status += `<p>❤️ Lives: ${data.maxFails - data.fails}/6</p>`;
  status += `<p>Guessed letters: <strong>${[...data.guessedLetters, ...data.failedLetters].join(', ')}</strong></p>`;

  if (data.lose) {
    status += `<p class="lose-message">💀 Game Over! The word was: ${data.word}</p>`;
    guessInput.disabled = true;
    setTimeout(() => {
      guessInput.disabled = false;
      messageEl.innerHTML = "<p>Starting new round...</p>";
    }, 3000);
  }
  else if (data.win) {
    status += `<p class="win-message">🎉 Congratulations! You got it: ${data.word}</p>`;
    score += 10;
    scoreDisplay.innerText = `👤 ${playerName} | Score: ${score}`;
    guessInput.disabled = true;
    setTimeout(() => {
      guessInput.disabled = false;
      messageEl.innerHTML = "<p>Starting new round...</p>";
    }, 3000);
  }
  messageEl.innerHTML = status;
});

// Server informs that a letter was already guessed
socket.on('alreadyGuessed', data => {
  const letter = data.letter;
  const btn = keyboardContainer.querySelector(`button[data-letter="${letter}"]`);
  if (btn) {
    btn.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.12)' },
      { transform: 'scale(1)' }
    ], { duration: 240 });
  }
});// THÊM LẠI HÀM LẮNG NGHE TIMER TỪ SERVER
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
