// public/login_bundle.js (Gộp các hàm utility và logic auth)

// === 1. UTILS FUNCTIONS ===
function fetchApi(endpoint, method, body) {
  const url = endpoint;
  const config = {
    method: method,
    headers: {
      "Content-Type": "application/json",
    },
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

// === 2. LOGIN/REGISTER LOGIC ===
function handleSuccessfulAuth(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
  // CHUYỂN HƯỚNG SANG INDEX.HTML SAU KHI ĐĂNG NHẬP THÀNH CÔNG
  window.location.href = "/index.html";
}

async function handleLogin() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const messageElement = document.getElementById("authMessage");
  messageElement.textContent = "";

  if (!username || !password) {
    messageElement.textContent =
      "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.";
    return;
  }

  try {
    const data = await fetchApi("/api/login", "POST", { username, password });
    if (data.success) {
      handleSuccessfulAuth(data.user);
    } else {
      messageElement.textContent = data.message || "Đăng nhập thất bại!";
    }
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    messageElement.textContent =
      error.message || "Có lỗi xảy ra khi đăng nhập!";
  }
}

async function handleRegister() {
  const username = document.getElementById("registerUsername")?.value.trim();
  const password = document.getElementById("registerPassword")?.value.trim();
  const confirmPassword = document
    .getElementById("registerConfirmPassword")
    ?.value.trim();
  const displayName = document
    .getElementById("registerDisplayName")
    ?.value.trim();
  const messageElement = document.getElementById("regMessage");
  messageElement.textContent = "";

  if (!username || !password || !displayName || !confirmPassword) {
    messageElement.textContent = "Vui lòng nhập đầy đủ thông tin.";
    return;
  }
  if (password.length < 6) {
    messageElement.textContent = "Mật khẩu phải có ít nhất 6 ký tự.";
    return;
  }
  if (password !== confirmPassword) {
    messageElement.textContent = "Mật khẩu xác nhận không khớp!";
    return;
  }

  try {
    const data = await fetchApi("/api/register", "POST", {
      username,
      password,
      displayName,
    });
    if (data.success) {
      alert("Đăng ký thành công! Bạn sẽ được chuyển hướng để đăng nhập.");
      // Chuyển hướng sang trang Đăng nhập và truyền username để điền sẵn
      window.location.href = `/login.html?username=${encodeURIComponent(
        username
      )}`;
    } else {
      messageElement.textContent = data.message || "Đăng ký thất bại!";
    }
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    messageElement.textContent = error.message || "Có lỗi xảy ra khi đăng ký!";
  }
}

function setupAuthListeners() {
  // --- Login Logic (Chỉ chạy nếu có nút loginBtn) ---
  document.getElementById("loginBtn")?.addEventListener("click", handleLogin);
  document
    .getElementById("loginPassword")
    ?.addEventListener("keyup", function (event) {
      if (event.key === "Enter") handleLogin();
    });

  // --- Register Logic (Chỉ chạy nếu có nút registerBtn) ---
  document
    .getElementById("registerBtn")
    ?.addEventListener("click", handleRegister);
  document
    .getElementById("registerConfirmPassword")
    ?.addEventListener("keyup", function (event) {
      if (event.key === "Enter") handleRegister();
    });
}

document.addEventListener("DOMContentLoaded", function () {
  setupAuthListeners();

  // Logic điền sẵn username nếu được chuyển từ trang đăng ký thành công (trên login.html)
  const urlParams = new URLSearchParams(window.location.search);
  const usernameFromRegister = urlParams.get("username");
  const loginUsernameInput = document.getElementById("loginUsername");

  if (usernameFromRegister && loginUsernameInput) {
    loginUsernameInput.value = usernameFromRegister;
    // Focus vào ô mật khẩu để người dùng dễ dàng nhập
    document.getElementById("loginPassword")?.focus();
  }
});
