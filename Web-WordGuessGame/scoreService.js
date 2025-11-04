// 📄 scoreService.js
import db from "./db.js";

/**
 * Lưu điểm khi người chơi hết giờ hoặc thoát game
 * @param {string} name - tên người chơi
 * @param {number} score - điểm đạt được
 */
export function saveScore(name, score) {
  return new Promise((resolve, reject) => {
    const sql = "INSERT INTO scores (name, score) VALUES (?, ?)";
    db.query(sql, [name, score], (err, result) => {
      if (err) {
        console.error("❌ Error saving score:", err);
        reject(err);
      } else {
        console.log(`💾 Saved score for ${name}: ${score}`);
        resolve(result);
      }
    });
  });
}

/**
 * Lấy top 10 người chơi có điểm cao nhất
 */
export function getTopScores() {
  return new Promise((resolve, reject) => {
    const sql = "SELECT name, score FROM scores ORDER BY score DESC LIMIT 10";
    db.query(sql, (err, results) => {
      if (err) {
        console.error("❌ Error fetching top scores:", err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}
