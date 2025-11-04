import mysql from "mysql2";

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  // Đặt mật khẩu chính xác của bạn vào đây:
  password: "12345", // Ví dụ: nếu bạn dùng mật khẩu này trong server.js cũ
  database: "wordgame" 
});

db.connect(err => {
  // Lỗi sẽ luôn được log ra console từ file này
  if (err) console.error("❌ Database connection failed (Lỗi MySQL 1045?):", err); 
  else console.log("✅ Connected to MySQL database!");
});

export default db;