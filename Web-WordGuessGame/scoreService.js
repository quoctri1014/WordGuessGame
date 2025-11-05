// scoreService.js
import db from "./db.js";

/**
 * Lưu điểm người chơi
 */
export async function saveScore(userId, score) {
  try {
    const [result] = await db.execute(
      "INSERT INTO scores (userId, score) VALUES (?, ?)",
      [userId, score]
    );
    console.log(`💾 Saved score for userId=${userId}: ${score}`);
    return result;
  } catch (err) {
    console.error("❌ saveScore error:", err);
    throw err;
  }
}

/**
 * Lấy top N điểm cao nhất
 */
export async function getTopScores(limit = 10) {
  try {
    const [rows] = await db.execute(
      `SELECT u.username, s.score
       FROM scores s
       JOIN users u ON s.userId = u.id
       ORDER BY s.score DESC, s.created_at ASC
       LIMIT ?`,
      [limit]
    );
    return rows.map((item, index) => ({ ...item, rank: index + 1 }));
  } catch (err) {
    console.error("❌ getTopScores error:", err);
    return [];
  }
}
