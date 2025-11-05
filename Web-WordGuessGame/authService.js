// authService.js
import bcrypt from "bcrypt";
import db from "./db.js";

/**
 * Đăng ký người dùng mới
 */
export async function registerUser(username, password) {
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hash]
    );
    return { id: result.insertId, username };
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") throw new Error("Username đã tồn tại");
    throw err;
  }
}

/**
 * Đăng nhập người dùng
 */
export async function loginUser(username, password) {
  const [rows] = await db.execute(
    "SELECT * FROM users WHERE username = ?",
    [username]
  );
  if (rows.length === 0) throw new Error("Người dùng không tồn tại");

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Mật khẩu sai");

  return { id: user.id, username: user.username };
}
