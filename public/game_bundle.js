// public/game_bundle.js (HOÀN CHỈNH: Sửa lỗi Chơi Đơn (Endless))

// ==========================================================
// I. UTILS & CORE STATE
// ==========================================================
let socket;
let currentUser = JSON.parse(localStorage.getItem("currentUser"));
let currentRoom = null;
let isSinglePlayer = false;
let globalWordPacks = {};
let pendingInviteRoomId = null;

if (!currentUser) {
  window.location.href = "/login.html";
}

// ... (fetchApi, switchScreen, setCurrentRoom, setIsSinglePlayer, updateScoreBoard giữ nguyên) ...
function fetchApi(endpoint, method, body) {
  const url = endpoint;
  const config = {
    method: method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : null,
  };
  return fetch(url, config)
    .then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Server responded with ${response.status}: ${
            errorText || "Unknown error"
          }`
        );
      }
      return response.json();
    })
    .catch((error) => {
      console.error(
        `Lỗi mạng hoặc server không phản hồi cho ${endpoint}:`,
        error
      );
      throw new Error("Lỗi mạng hoặc server không phản hồi.");
    });
}
function switchScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.style.display = "none";
  });
  const activeScreen = document.getElementById(screenId);
  if (activeScreen) {
    activeScreen.style.display = "flex";
  }
}
function setCurrentRoom(room) {
  currentRoom = room;
}
function setIsSinglePlayer(isSingle) {
  isSinglePlayer = isSingle;
}
function updateScoreBoard(players, elementId) {
  const list = document.getElementById(elementId);
  if (!list) return;
  players.sort((a, b) => b.score - a.score);
  list.innerHTML = "";
  players.forEach((player, index) => {
    const item = document.createElement("div");
    item.className = "ranking-item";
    let rankIcon = index + 1;
    if (elementId !== "roomPlayersList") {
      if (index === 0) rankIcon = "🥇";
      else if (index === 1) rankIcon = "🥈";
      else if (index === 2) rankIcon = "🥉";
    }
    const isHost = currentRoom && player.id === currentRoom.hostId;
    const isCurrentUser = currentUser && player.id === currentUser.id;
    let iconToShow =
      elementId === "roomPlayersList" && isHost ? "👑" : rankIcon;
    item.innerHTML = `
      <span class="rank-icon">${iconToShow}</span>
      <span class="player-details">
        <span class="name">${player.name} ${isCurrentUser ? "(Bạn)" : ""}</span>
      </span>
      <span class="score-value-ranking">${player.score} điểm</span>
    `;
    list.appendChild(item);
  });
}

// Hàm helper để điền bộ từ
function populateWordPackSelects(elementId) {
  const select = document.getElementById(elementId);
  if (!select) return;

  const selectedValue = select.value;
  select.innerHTML = "";

  if (Object.keys(globalWordPacks).length === 0) {
    select.innerHTML = "<option value=''>Đang tải bộ từ...</option>";
    return;
  }

  for (const key in globalWordPacks) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = globalWordPacks[key].name;
    select.appendChild(option);
  }

  if (select.querySelector(`option[value="${selectedValue}"]`)) {
    select.value = selectedValue;
  } else if (select.options.length > 0) {
    select.selectedIndex = 0;
  }
}

// ==========================================================
// II. SOCKET.IO INITIALIZATION
// ==========================================================

function initSocketConnection() {
  socket = io();

  socket.on("connect", () => {
    console.log("Connected to server:", socket.id);
    socket.emit("clientReady", currentUser);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from server");
    if (currentRoom) {
      alert("Mất kết nối với phòng chơi. Quay lại Lobby.");
      setCurrentRoom(null);
    }
    setIsSinglePlayer(false);
    switchScreen("lobbyScreen");
  });

  // ==========================================================
  // III. LOBBY & RANKING LOGIC (Listeners)
  // ==========================================================

  socket.on("lobbyData", (data) => {
    console.log("Nhận được lobbyData (bộ từ)");

    globalWordPacks = data.wordPacks;

    populateWordPackSelects("singlePlayerWordPackSelect");

    if (currentRoom) {
      console.log("Đang ở trong phòng, cập nhật lại bộ từ phòng...");
      populateWordPackSelects("roomWordPack");
      const roomPackSelect = document.getElementById("roomWordPack");
      if (
        roomPackSelect.querySelector(`option[value="${currentRoom.wordPack}"]`)
      ) {
        roomPackSelect.value = currentRoom.wordPack;
      }
    }
  });

  socket.on("sendRanking", (ranking) => {
    switchScreen("rankingScreen");
    const top10 = ranking.map((user, index) => ({
      id: index,
      name: user.name,
      score: user.score,
    }));
    updateScoreBoard(top10, "globalRankingList");
  });

  // ==========================================================
  // IV. ROOM LOGIC (Listeners)
  // ==========================================================

  socket.on("roomUpdate", (room) => {
    setCurrentRoom(room);
    setIsSinglePlayer(false);
    switchScreen("roomScreen");

    const isHost = currentUser && currentUser.id === room.hostId;
    const startBtn = document.getElementById("startRoomBtn");
    const settingsDiv = document.getElementById("roomSettingsDiv");
    const settingsMessage = document.getElementById("settingsMessage");
    const roomHostDisplay = document.getElementById("roomHostDisplay");
    const roomNameDisplay = document.getElementById("roomNameDisplay");
    const roomPlayersCount = document.getElementById("roomPlayersCount");

    roomNameDisplay.textContent = `${room.name} (ID: ${room.shortId})`;
    roomPlayersCount.textContent = `${room.players.length}/5`;

    const hostPlayer = room.players.find((p) => p.id === room.hostId);
    const hostName = hostPlayer ? hostPlayer.name : "Không xác định";
    roomHostDisplay.textContent = `Chủ phòng: ${hostName} ${
      isHost ? "(Bạn)" : ""
    }`;
    roomHostDisplay.style.backgroundColor = isHost
      ? "var(--secondary-hover)"
      : "var(--gray)";

    populateWordPackSelects("roomWordPack");

    document.getElementById("roomNameInput").value = room.name;
    document.getElementById("roomMode").value = room.gameMode;

    const roomPackSelect = document.getElementById("roomWordPack");
    if (roomPackSelect.querySelector(`option[value="${room.wordPack}"]`)) {
      roomPackSelect.value = room.wordPack;
    } else if (roomPackSelect.options.length > 0) {
      roomPackSelect.selectedIndex = 0;
    }

    updateScoreBoard(room.players, "roomPlayersList");

    if (isHost) {
      if (room.status === "waiting") {
        startBtn.style.display = "block";
        startBtn.disabled = room.players.length < 2;
        startBtn.textContent =
          room.players.length < 2 ? "Cần tối thiểu 2 người" : "▶️ Bắt Đầu Game";
        settingsMessage.innerHTML = "";
      } else {
        startBtn.style.display = "none";
        settingsMessage.textContent = "Trò chơi đang diễn ra.";
      }
      settingsDiv
        .querySelectorAll(".input")
        .forEach((el) => (el.disabled = false));
    } else {
      startBtn.style.display = "none";
      settingsDiv
        .querySelectorAll(".input")
        .forEach((el) => (el.disabled = true));
      if (room.status === "waiting") {
        settingsMessage.textContent = `Chủ phòng (${hostName}) sẽ bắt đầu trò chơi. Vui lòng chờ.`;
      } else {
        settingsMessage.textContent = "Trò chơi đang diễn ra.";
      }
    }

    const inviteSection = document.getElementById("inviteSection");
    if (isHost) {
      inviteSection.style.display = "block";
    } else {
      inviteSection.style.display = "none";
    }
  });

  socket.on("joinError", (message) => {
    const lobbyErrorEl = document.getElementById("lobbyErrorMessage");
    if (lobbyErrorEl && lobbyErrorEl.offsetParent !== null) {
      lobbyErrorEl.textContent = message;
    } else {
      alert("Lỗi tham gia phòng: " + message);
      switchScreen("lobbyScreen");
    }
  });

  socket.on("gameError", (message) => {
    alert("Lỗi trò chơi: " + message);
    const inviteMsg = document.getElementById("inviteMessage");
    if (inviteMsg) inviteMsg.textContent = message;
  });
  socket.on("receiveInvite", ({ roomId, roomName, inviterName }) => {
    const notification = document.getElementById("inviteNotification");
    const roomNameEl = document.getElementById("inviteRoomName");
    if (currentRoom && currentRoom.id === roomId) {
      return;
    }
    pendingInviteRoomId = roomId;
    roomNameEl.textContent = `${inviterName} mời bạn vào phòng "${roomName}"`;
    notification.style.display = "flex";
  });
  socket.on("inviteMessage", ({ success, message }) => {
    const inviteMsg = document.getElementById("inviteMessage");
    inviteMsg.textContent = message;
    inviteMsg.style.color = success ? "var(--success)" : "var(--danger)";
    setTimeout(() => {
      inviteMsg.textContent = "";
    }, 3000);
  });

  // ==========================================================
  // V. GAME PLAY LOGIC (Listeners)
  // ==========================================================
  socket.on("gameStart", (data) => {
    setCurrentRoom(data.room);
    setIsSinglePlayer(false);
    document.getElementById(
      "gameRoomName"
    ).textContent = `${data.room.name} (ID: ${data.room.shortId})`;
    document.getElementById("maxRounds").textContent = data.room.maxRounds;
    switchScreen("gameScreen");
    socket.emit("getRoundUpdate", { roomId: data.room.id });
  });

  // SỬA LẠI: roundUpdate
  socket.on("roundUpdate", (data) => {
    if (isSinglePlayer) {
      document.getElementById("gameRoomName").textContent = "Chơi Một Người";
      document.getElementById("currentRound").textContent = data.round;
      document.getElementById("maxRounds").textContent = data.maxRounds; // Sẽ là "∞"
    } else {
      document.getElementById(
        "gameRoomName"
      ).textContent = `${data.room.name} (ID: ${data.room.shortId})`;
      document.getElementById("currentRound").textContent = data.round;
      document.getElementById("maxRounds").textContent = currentRoom.maxRounds;
    }
    document.getElementById("wordDisplay").textContent = data.maskedWord;
    document.getElementById("message").textContent = "";
    document.getElementById("guessInput").disabled = false;
    document.getElementById("guessInput").focus();
    const hintImageEl = document.getElementById("hintImage");
    const hintTextEl = document.getElementById("currentHintType");
    hintImageEl.style.display = "none";
    hintTextEl.textContent = "";

    if (data.hintImage && data.hintImage.startsWith("/")) {
      hintImageEl.src = data.hintImage;
      hintImageEl.style.display = "block";
    }
    if (data.hintWord) {
      hintTextEl.textContent = "Gợi ý: " + data.hintWord;
    }
    updateScoreBoard(data.room.players, "gameScoreBoard");
  });

  socket.on("timerUpdate", (data) => {
    const timerEl = document.getElementById("timer");
    timerEl.textContent = data.time;

    if (data.time <= 10) {
      timerEl.style.color = "var(--danger)";
    } else {
      timerEl.style.color = "var(--secondary-hover)";
    }
  });

  socket.on("guessResult", (data) => {
    document.getElementById("message").textContent = data.message;
    if (data.isCorrect) {
      document.getElementById("message").style.color = "var(--success)";
      document.getElementById("wordDisplay").textContent = data.maskedWord;
      if (isSinglePlayer && data.maskedWord.includes("_") === false) {
        document.getElementById("guessInput").disabled = true; // Khóa input khi đoán đúng (chờ vòng mới)
      }
    } else {
      document.getElementById("message").style.color = "var(--danger)";
    }
  });

  // SỬA LẠI: Xử lý roundEnd cho cả Chơi Đơn
  socket.on("roundEnd", (data) => {
    // Hiển thị đáp án khi hết giờ (cho cả chơi đơn và chơi nhóm)
    document.getElementById(
      "message"
    ).textContent = `Hết giờ! Đáp án là: ${data.word}`;
    document.getElementById("message").style.color = "var(--secondary-hover)";
    document.getElementById("wordDisplay").textContent = data.word;
    document.getElementById("guessInput").value = "";
    document.getElementById("guessInput").disabled = true;
    updateScoreBoard(data.room.players, "gameScoreBoard");
  });

  // SỬA LẠI: Xử lý gameEnd cho cả Chơi Đơn
  socket.on("gameEnd", (data) => {
    switchScreen("endScreen");
    document.getElementById("endMessage").textContent = data.message;
    updateScoreBoard(data.ranking, "finalScores"); // Sẽ hiển thị list rỗng nếu chơi đơn

    // Chỉ cập nhật điểm nếu là chơi nhóm
    if (data.finalUserScore) {
      document.getElementById("userTotalScore").textContent =
        data.finalUserScore;
      currentUser.score = data.finalUserScore;
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    }
    setCurrentRoom(null);
    setIsSinglePlayer(false);
  });
} // <-- KẾT THÚC HÀM initSocketConnection

// ==========================================================
// VI. EVENT HANDLERS (Emit to Server)
// ==========================================================

function handleCreateRoom() {
  socket.emit("createRoom");
}
function handleJoinRoom(roomId) {
  if (isSinglePlayer) {
    setIsSinglePlayer(false);
  }
  socket.emit("joinRoom", { roomId });
}
function handleLeaveRoom() {
  if (currentRoom) {
    socket.emit("leaveRoom", { roomId: currentRoom.id });
  }
  setCurrentRoom(null);
  setIsSinglePlayer(false);
  switchScreen("lobbyScreen");
}
function handleSearchRoom() {
  const searchInput = document.getElementById("roomSearchInput").value.trim();
  const errorEl = document.getElementById("lobbyErrorMessage");
  errorEl.textContent = "";

  if (searchInput) {
    socket.emit("joinRoomById", { searchInput });
  } else {
    errorEl.textContent = "Vui lòng nhập ID phòng hoặc tên phòng.";
  }
}
function handleStartGame() {
  if (currentRoom && currentUser.id === currentRoom.hostId) {
    socket.emit("startGame", { roomId: currentRoom.id });
  } else {
    alert("Bạn không phải Chủ phòng.");
  }
}
function setupRoomSettingsListeners() {
  const roomNameInput = document.getElementById("roomNameInput");
  const roomModeSelect = document.getElementById("roomMode");
  const roomWordPackSelect = document.getElementById("roomWordPack");
  if (roomNameInput)
    roomNameInput.addEventListener("blur", handleSettingChange);
  if (roomModeSelect)
    roomModeSelect.addEventListener("change", handleSettingChange);
  if (roomWordPackSelect)
    roomWordPackSelect.addEventListener("change", handleSettingChange);
  function handleSettingChange(event) {
    if (currentRoom && currentUser.id === currentRoom.hostId) {
      const targetId = event.target.id;
      let settingKey;
      let settingValue;
      if (targetId === "roomNameInput") {
        settingKey = "name";
        settingValue = event.target.value.trim();
      } else if (targetId === "roomMode") {
        settingKey = "gameMode";
        settingValue = event.target.value;
      } else if (targetId === "wordPack") {
        settingKey = "wordPack";
        settingValue = event.target.value;
      }
      if (settingKey && currentRoom[settingKey] !== settingValue) {
        socket.emit("updateRoomSettings", {
          roomId: currentRoom.id,
          [settingKey]: settingValue,
        });
      }
    }
  }
}
function setupLobbyListeners() {
  document
    .getElementById("createRoomBtn")
    ?.addEventListener("click", handleCreateRoom);
  document
    .getElementById("leaveRoomBtn")
    ?.addEventListener("click", handleLeaveRoom);
  document
    .getElementById("startRoomBtn")
    ?.addEventListener("click", handleStartGame);
  document
    .getElementById("showRankingBtn")
    ?.addEventListener("click", () => socket.emit("getRanking"));
  document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);

  document.getElementById("singlePlayerBtn")?.addEventListener("click", () => {
    populateWordPackSelects("singlePlayerWordPackSelect");
    switchScreen("singlePlayerSettingsScreen");
  });

  document
    .getElementById("searchRoomBtn")
    ?.addEventListener("click", handleSearchRoom);
  document.getElementById("roomSearchInput")?.addEventListener("keyup", (e) => {
    if (e.key === "Enter") handleSearchRoom();
  });
}
function setupSinglePlayerSettingsListeners() {
  document
    .getElementById("startSinglePlayerGameBtn")
    ?.addEventListener("click", () => {
      const gameMode = document.getElementById("singlePlayerModeSelect").value;
      const wordPack = document.getElementById(
        "singlePlayerWordPackSelect"
      ).value;

      setIsSinglePlayer(true);
      setCurrentRoom(null);
      socket.emit("startSinglePlayer", { gameMode, wordPack });
      switchScreen("gameScreen");
    });
  document
    .getElementById("backToLobbyFromSingleBtn")
    ?.addEventListener("click", () => {
      switchScreen("lobbyScreen");
    });
  document
    .getElementById("backFromRankingBtn")
    ?.addEventListener("click", () => {
      if (isSinglePlayer) {
        setIsSinglePlayer(false);
      }
      switchScreen("lobbyScreen");
    });
}
function setupGameListeners() {
  document
    .getElementById("guessInput")
    ?.addEventListener("keyup", function (event) {
      if (event.key === "Enter" && socket && this.value.trim()) {
        const guess = this.value.trim();
        if (isSinglePlayer) {
          socket.emit("makeSinglePlayerGuess", { guess: guess });
        } else if (currentRoom) {
          socket.emit("makeGuess", { guess: guess, roomId: currentRoom.id });
        }
        this.value = "";
      }
    });
  document
    .getElementById("backToLobbyBtn")
    ?.addEventListener("click", function () {
      switchScreen("lobbyScreen");
      setIsSinglePlayer(false);
      setCurrentRoom(null);
    });
  document
    .getElementById("showGlobalRankingBtn")
    ?.addEventListener("click", function () {
      socket.emit("getRanking");
    });
}
function setupInviteListeners() {
  document.getElementById("invitePlayerBtn")?.addEventListener("click", () => {
    const usernameInput = document.getElementById("inviteUsernameInput");
    const username = usernameInput.value.trim();
    if (username && currentRoom) {
      socket.emit("invitePlayer", {
        username: username,
        roomId: currentRoom.id,
      });
      usernameInput.value = "";
    }
  });
  document.getElementById("acceptInviteBtn")?.addEventListener("click", () => {
    if (pendingInviteRoomId) {
      handleJoinRoom(pendingInviteRoomId);
      pendingInviteRoomId = null;
      document.getElementById("inviteNotification").style.display = "none";
    }
  });
  document.getElementById("rejectInviteBtn")?.addEventListener("click", () => {
    pendingInviteRoomId = null;
    document.getElementById("inviteNotification").style.display = "none";
  });
}
function handleLogout() {
  localStorage.removeItem("currentUser");
  window.location.href = "/login.html";
}

document.addEventListener("DOMContentLoaded", function () {
  if (currentUser) {
    initSocketConnection();
    setupLobbyListeners();
    setupGameListeners();
    setupRoomSettingsListeners();
    setupInviteListeners();
    setupSinglePlayerSettingsListeners();

    document.getElementById("displayName").textContent = currentUser.name;
    document.getElementById("userTotalScore").textContent = currentUser.score;
  }
});
