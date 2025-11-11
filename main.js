const socket = io(); 

// --- Khai báo các phần tử DOM ---
const startButton = document.getElementById('startButton');
const guessButton = document.getElementById('guessButton');
const restartButton = document.getElementById('restartButton'); 
const playerNameInput = document.getElementById('playerNameInput');
const wordPackSelect = document.getElementById('wordPackSelect');
const gameModeSelect = document.getElementById('gameModeSelect');
const guessInput = document.getElementById('guessInput');
const messageArea = document.getElementById('messageArea');
const gameArea = document.getElementById('gameArea');
const scoreDisplay = document.getElementById('scoreDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const wordDisplay = document.getElementById('wordDisplay');
const imageDisplay = document.getElementById('imageDisplay');
const gameOverModal = document.getElementById('gameOverModal');
const finalScoreDisplay = document.getElementById('finalScoreDisplay');
const rankingList = document.getElementById('rankingList');

// Thêm DOM mới
const playerListContainer = document.getElementById('playerListContainer');
const playerList = document.getElementById('playerList');
let myName = ""; // Lưu tên của mình

// --- HÀM HỖ TRỢ ---
function showGameArea(show) {
  gameArea.style.display = show ? 'block' : 'none';
  playerListContainer.style.display = show ? 'block' : 'none'; // Hiện cả danh sách người chơi
}

function updateMessage(text, isError = false) {
  messageArea.textContent = text;
  messageArea.style.color = isError ? 'red' : 'green';
}

function clearGameInfo() {
  wordDisplay.textContent = 'Nhấn Start Game để bắt đầu!';
  imageDisplay.innerHTML = '';
  timerDisplay.textContent = '30';
  scoreDisplay.textContent = '0';
  messageArea.textContent = '';
  guessInput.value = '';
  guessInput.disabled = true;
  guessButton.disabled = true;
}

// --- LOGIC NÚT START GAME ---
startButton.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  const pack = wordPackSelect.value;
  const mode = gameModeSelect.value;

  if (!name) {
    updateMessage('Vui lòng nhập tên người chơi!', true);
    return;
  }
  myName = name; // Lưu tên của mình

  socket.emit('registerPlayer', { name, mode, pack });

  showGameArea(true);
  startButton.disabled = true;
  playerNameInput.disabled = true;
  wordPackSelect.disabled = true;
  gameModeSelect.disabled = true;
  guessInput.disabled = false;
  guessButton.disabled = false;
  updateMessage(`Đã tham gia phòng! Chờ vòng mới...`);
});

// --- LOGIC GỬI ĐÁP ÁN ---
guessButton.addEventListener('click', () => {
  const guess = guessInput.value.trim();
  if (guess) {
    socket.emit('guessWord', guess);
    guessInput.value = ''; 
  }
});

guessInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    guessButton.click();
  }
});

// --- XỬ LÝ SỰ KIỆN TỪ SERVER (CẬP NHẬT) ---

// 1. (MỚI) Cập nhật danh sách người chơi
socket.on('updatePlayerList', (players) => {
    playerList.innerHTML = ''; // Xóa danh sách cũ
    players.sort((a, b) => b.score - a.score); // Sắp xếp theo điểm

    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = `${player.name}: ${player.score}`;
        if (player.name === myName) {
            li.style.fontWeight = 'bold'; // Tô đậm tên mình
            scoreDisplay.textContent = player.score; // Cập nhật điểm của mình
        }
        playerList.appendChild(li);
    });
});

// 2. Nhận từ mới (Giữ nguyên, nhưng giờ là từ chung)
socket.on('newWord', (data) => {
  wordDisplay.textContent = data.display;
  imageDisplay.innerHTML = `<img src="/images/${data.image}" alt="Word Hint">`;
  updateMessage('Đoán từ tiếng Anh/Việt (tùy chế độ) dựa trên hình ảnh.');
  guessInput.disabled = false;
  guessButton.disabled = false;
  guessInput.focus();
});

// 3. Cập nhật Timer (Giữ nguyên, nhưng là timer chung)
socket.on('timer', (timeLeft) => {
  timerDisplay.textContent = timeLeft;
  timerDisplay.style.color = timeLeft <= 5 ? 'red' : 'black';
});

// 4. (CẬP NHẬT) Ai đó đoán đúng
socket.on('correctGuess', (data) => {
  // data = { word, meaning, playerName }
  updateMessage(`🎉 ${data.playerName} đã đoán đúng! Từ là: ${data.word} (${data.meaning}). Vòng tiếp theo sau 3s...`, false);
  guessInput.disabled = true;
  guessButton.disabled = true;
});

// 5. (GIỮ NGUYÊN) Mình đoán sai
socket.on('wrongGuess', () => {
  updateMessage('❌ Sai rồi! Thử lại.', true);
});

// 6. (GIỮ NGUYÊN) Hết giờ / Game Over
socket.on('gameOver', (data) => {
  updateMessage('⏱️ Hết giờ!', true);
  guessInput.disabled = true;
  guessButton.disabled = true;

  finalScoreDisplay.textContent = scoreDisplay.textContent; // Hiện điểm của mình
  rankingList.innerHTML = ''; 

  data.ranking.forEach((player, index) => {
    const li = document.createElement('li');
    li.textContent = `${player.name}: ${player.score}`;
    rankingList.appendChild(li);
  });

  gameOverModal.style.display = 'block'; 
});

// --- LOGIC NÚT RESTART GAME (GIỮ NGUYÊN) ---
// (Client vẫn gửi, server sẽ xử lý cho cả phòng)
const closeModalButton = document.getElementById('closeModalButton');
closeModalButton.addEventListener('click', () => {
  gameOverModal.style.display = 'none';
  // Không reset game ở đây nữa, vì game vẫn tiếp tục
});

restartButton.addEventListener('click', () => {
  const pack = wordPackSelect.value;
  const mode = gameModeSelect.value;
  socket.emit('restartGame', { mode, pack }); // Gửi sự kiện restart
  gameOverModal.style.display = 'none';
  updateMessage('Bắt đầu lại trò chơi!');
  guessInput.disabled = false;
  guessButton.disabled = false;
});

// Khởi tạo trạng thái ban đầu
clearGameInfo();
showGameArea(false); 
gameOverModal.style.display = 'none';
